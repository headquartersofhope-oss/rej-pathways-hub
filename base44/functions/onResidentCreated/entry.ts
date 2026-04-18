/**
 * onResidentCreated — Week 2 Automation 1
 *
 * Fires when a Resident record is created.
 * - Ensures global_resident_id exists
 * - Creates onboarding task bundle
 * - Adds system CaseNote to resident timeline
 * - Idempotent: skips if onboarding tasks already exist
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONBOARDING_TASKS = [
  { title: 'Complete Intake Assessment',     category: 'intake',      priority: 'high',   description: 'Complete the full intake and barrier assessment form.' },
  { title: 'Verify Identity Documents',      category: 'documents',   priority: 'high',   description: 'Verify state ID, birth certificate, and SSN card.' },
  { title: 'Schedule Initial Case Review',   category: 'case_mgmt',   priority: 'medium', description: 'Schedule first case management meeting with assigned case manager.' },
  { title: 'Assess Housing Need',            category: 'housing',     priority: 'high',   description: 'Evaluate current housing situation and identify placement pathway.' },
  { title: 'Assess Employment Readiness',    category: 'employment',  priority: 'medium', description: 'Review work history, barriers, and job readiness indicators.' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    const residentId = event?.entity_id;

    if (!residentId) {
      return Response.json({ error: 'Missing entity_id in event payload' }, { status: 400 });
    }

    // Always fetch fresh from DB — payload is not authoritative
    let resident;
    try {
      resident = await base44.asServiceRole.entities.Resident.get(residentId);
    } catch (e) {
      return Response.json({ skipped: true, reason: `Resident not found: ${residentId}` });
    }

    if (!resident) {
      return Response.json({ skipped: true, reason: 'Resident record not found' });
    }

    const globalResidentId = resident.global_resident_id;
    const orgId = resident.organization_id || '';

    if (!globalResidentId) {
      console.warn(`[onResidentCreated] Resident ${residentId} missing global_resident_id — flagging for admin review`);
      await base44.asServiceRole.entities.CaseNote.create({
        resident_id: residentId,
        global_resident_id: '',
        organization_id: orgId,
        staff_id: 'system',
        staff_name: 'Pathways Automation',
        note_type: 'general',
        description: '[Auto][WARNING] New resident created but global_resident_id is missing. Admin action required.',
        is_confidential: false,
      });
      return Response.json({ skipped: true, reason: 'global_resident_id missing — admin note created' });
    }

    // Idempotency: check if onboarding tasks already exist for this resident
    const existingTasks = await base44.asServiceRole.entities.ServiceTask.filter({
      resident_id: residentId,
      category: 'intake',
    });

    const alreadyOnboarded = existingTasks.some(t => t.title === 'Complete Intake Assessment');
    if (alreadyOnboarded) {
      return Response.json({ skipped: true, reason: 'Onboarding tasks already exist — idempotent skip', global_resident_id: globalResidentId });
    }

    // Determine assignee — prefer assigned_case_manager_id, fallback to null
    const assignedTo = resident.assigned_case_manager || '';

    // Create onboarding task bundle
    const createdTasks = await Promise.all(
      ONBOARDING_TASKS.map(task =>
        base44.asServiceRole.entities.ServiceTask.create({
          resident_id: residentId,
          global_resident_id: globalResidentId,
          organization_id: orgId,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          status: 'pending',
          assigned_to: assignedTo,
          is_resident_visible: true,
          requires_staff_action: true,
        })
      )
    );

    // Write system CaseNote to timeline
    await base44.asServiceRole.entities.CaseNote.create({
      resident_id: residentId,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      staff_id: 'system',
      staff_name: 'Pathways Automation',
      note_type: 'general',
      description: `[Auto] New resident onboarding initiated for ${globalResidentId}. ${createdTasks.length} onboarding task(s) created. Assigned to: ${assignedTo || 'unassigned'}.`,
      is_confidential: false,
    });

    return Response.json({
      success: true,
      resident_id: residentId,
      global_resident_id: globalResidentId,
      tasks_created: createdTasks.length,
      assigned_to: assignedTo || 'unassigned',
    });

  } catch (error) {
    console.error('[onResidentCreated] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});