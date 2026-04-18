/**
 * onServiceTaskCreated — Week 2 Automation 3
 *
 * Fires when a ServiceTask is created.
 * - If organization_id is blank, pulls from parent Resident and writes it back
 * - Logs repair if performed
 * - If no resident found, creates an admin-flagged CaseNote for manual review
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    const taskId = event?.entity_id;

    if (!taskId) {
      return Response.json({ error: 'Missing entity_id in event payload' }, { status: 400 });
    }

    // Fetch fresh task from DB
    const task = await base44.asServiceRole.entities.ServiceTask.get(taskId);

    if (!task) {
      return Response.json({ skipped: true, reason: 'ServiceTask not found' });
    }

    // If organization_id already set, nothing to do
    if (task.organization_id) {
      return Response.json({ skipped: true, reason: 'organization_id already set', task_id: taskId });
    }

    const residentId = task.resident_id;
    if (!residentId) {
      console.warn(`[onServiceTaskCreated] Task ${taskId} has no resident_id — cannot repair org`);
      return Response.json({ skipped: true, reason: 'No resident_id on task — cannot repair organization_id', task_id: taskId });
    }

    // Fetch parent resident to get org
    let resident;
    try {
      resident = await base44.asServiceRole.entities.Resident.get(residentId);
    } catch (e) {
      // Resident not found — flag for admin review
      console.warn(`[onServiceTaskCreated] Resident ${residentId} not found for task ${taskId}`);
      await base44.asServiceRole.entities.CaseNote.create({
        resident_id: residentId,
        global_resident_id: task.global_resident_id || '',
        organization_id: '',
        staff_id: 'system',
        staff_name: 'Pathways Automation',
        note_type: 'general',
        description: `[Auto][WARNING] ServiceTask "${task.title}" (${taskId}) has blank organization_id and its parent resident (${residentId}) could not be found. Admin review required.`,
        is_confidential: false,
      });
      return Response.json({ skipped: true, reason: 'Parent resident not found — admin note created', task_id: taskId });
    }

    if (!resident || !resident.organization_id) {
      return Response.json({ skipped: true, reason: 'Resident found but has no organization_id — nothing to repair', task_id: taskId });
    }

    // Repair: write organization_id from resident
    await base44.asServiceRole.entities.ServiceTask.update(taskId, {
      organization_id: resident.organization_id,
    });

    console.log(`[onServiceTaskCreated] Repaired organization_id on task ${taskId} → ${resident.organization_id}`);

    return Response.json({
      success: true,
      task_id: taskId,
      repaired: true,
      organization_id_written: resident.organization_id,
      resident_id: residentId,
    });

  } catch (error) {
    console.error('[onServiceTaskCreated] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});