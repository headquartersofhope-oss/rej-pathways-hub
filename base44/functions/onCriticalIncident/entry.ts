/**
 * onCriticalIncident — Week 3 Automation 1
 *
 * Fires when an Incident is created with severity = "critical".
 * - Notifies all admin users
 * - Notifies assigned case manager (if resident is present)
 * - Notifies house manager (if house_id is present)
 * - Creates one urgent follow-up ServiceTask on the incident's resident
 * - Writes system CaseNote to resident timeline
 * - Idempotent: will not create duplicate urgent tasks for the same incident
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event } = body;
    const incidentId = event?.entity_id;

    if (!incidentId) {
      return Response.json({ error: 'Missing entity_id in event payload' }, { status: 400 });
    }

    // Fetch authoritative incident record
    let incident;
    try {
      incident = await base44.asServiceRole.entities.Incident.get(incidentId);
    } catch (e) {
      return Response.json({ skipped: true, reason: `Incident not found: ${incidentId}` });
    }

    if (!incident) {
      return Response.json({ skipped: true, reason: 'Incident record not found' });
    }

    // Only process critical incidents
    if (incident.severity !== 'critical') {
      return Response.json({ skipped: true, reason: `Severity is "${incident.severity}", not critical — no action needed` });
    }

    const orgId = incident.organization_id || '';
    const residentId = incident.resident_id || null;
    const houseId = incident.house_id || null;
    const incidentDesc = incident.description || '(no description)';
    const incidentType = incident.incident_type || 'other';
    const incidentDate = incident.incident_date || new Date().toISOString().split('T')[0];
    const houseName = incident.house_name || '';

    // Idempotency: check if an urgent task already exists for this incident
    const urgentTaskTitle = `[CRITICAL] Follow-up: Incident ${incidentId}`;
    let existingUrgentTasks = [];
    if (residentId) {
      existingUrgentTasks = await base44.asServiceRole.entities.ServiceTask.filter({
        resident_id: residentId,
        title: urgentTaskTitle,
        priority: 'urgent',
      });
    }

    const taskAlreadyExists = existingUrgentTasks.length > 0;

    // Fetch all users for notification targeting
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    // Build notification set — deduped by user id
    const notifySet = new Map();

    // Always notify admins
    for (const admin of adminUsers) {
      notifySet.set(admin.id, { user: admin, reason: 'admin' });
    }

    // Notify resident's case manager if present
    let resident = null;
    let globalResidentId = '';
    if (residentId) {
      try {
        resident = await base44.asServiceRole.entities.Resident.get(residentId);
        globalResidentId = resident?.global_resident_id || '';
        if (resident?.assigned_case_manager_id) {
          const cm = allUsers.find(u => u.id === resident.assigned_case_manager_id);
          if (cm && !notifySet.has(cm.id)) {
            notifySet.set(cm.id, { user: cm, reason: 'case_manager' });
          }
        }
      } catch (e) {
        console.warn(`[onCriticalIncident] Could not fetch resident ${residentId}: ${e.message}`);
      }
    }

    // Notify house manager if house_id is present
    if (houseId) {
      try {
        const house = await base44.asServiceRole.entities.House.get(houseId);
        if (house?.house_manager_id) {
          const hm = allUsers.find(u => u.id === house.house_manager_id);
          if (hm && !notifySet.has(hm.id)) {
            notifySet.set(hm.id, { user: hm, reason: 'house_manager' });
          }
        }
      } catch (e) {
        console.warn(`[onCriticalIncident] Could not fetch house ${houseId}: ${e.message}`);
      }
    }

    // Send email alerts to all targets
    const notificationResults = [];
    for (const [, { user, reason }] of notifySet) {
      if (!user.email) continue;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          from_name: 'Pathways Hub Alerts',
          subject: `🚨 CRITICAL INCIDENT — ${incidentType.replace(/_/g, ' ').toUpperCase()}${houseName ? ` at ${houseName}` : ''}`,
          body: `<p><strong>Critical Incident Alert</strong></p>
<p>A critical incident has been reported and requires your immediate attention.</p>
<ul>
<li><strong>Type:</strong> ${incidentType.replace(/_/g, ' ')}</li>
<li><strong>Date:</strong> ${incidentDate}</li>
${houseName ? `<li><strong>Location:</strong> ${houseName}</li>` : ''}
${incident.resident_name ? `<li><strong>Resident:</strong> ${incident.resident_name}</li>` : ''}
<li><strong>Description:</strong> ${incidentDesc.substring(0, 500)}</li>
</ul>
<p>Please log in to Pathways Hub to review and take action. An urgent follow-up task has been created.</p>`,
        });
        notificationResults.push({ user_id: user.id, email: user.email, reason });
      } catch (e) {
        console.warn(`[onCriticalIncident] Email failed for user ${user.id} (${user.email}): ${e.message}`);
      }
    }

    // Create urgent follow-up ServiceTask (once per incident, resident-scoped)
    let createdTask = null;
    if (residentId && !taskAlreadyExists) {
      try {
        createdTask = await base44.asServiceRole.entities.ServiceTask.create({
          resident_id: residentId,
          global_resident_id: globalResidentId,
          organization_id: orgId,
          title: urgentTaskTitle,
          description: `CRITICAL INCIDENT follow-up required. Incident ID: ${incidentId}. Type: ${incidentType}. Date: ${incidentDate}. Details: ${incidentDesc.substring(0, 300)}`,
          category: 'incident',
          status: 'pending',
          priority: 'urgent',
          is_resident_visible: false,
          requires_staff_action: true,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // due tomorrow
        });
      } catch (e) {
        console.warn(`[onCriticalIncident] Could not create urgent task: ${e.message}`);
      }
    }

    // Write system CaseNote to resident timeline
    if (residentId && resident) {
      try {
        await base44.asServiceRole.entities.CaseNote.create({
          resident_id: residentId,
          global_resident_id: globalResidentId,
          organization_id: orgId,
          staff_id: 'system',
          staff_name: 'Pathways Automation',
          note_type: 'incident',
          description: `[Auto][CRITICAL] Critical incident reported on ${incidentDate}. Type: ${incidentType}. ${notificationResults.length} staff member(s) notified. ${createdTask ? 'Urgent follow-up task created.' : 'Urgent follow-up task already existed.'}`,
          is_confidential: true,
        });
      } catch (e) {
        console.warn(`[onCriticalIncident] Could not write CaseNote: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      incident_id: incidentId,
      severity: 'critical',
      notifications_sent: notificationResults.length,
      notification_targets: notificationResults.map(n => ({ user_id: n.user_id, reason: n.reason })),
      urgent_task_created: !!createdTask,
      urgent_task_id: createdTask?.id || null,
      task_already_existed: taskAlreadyExists,
      resident_id: residentId,
      global_resident_id: globalResidentId,
    });

  } catch (error) {
    console.error('[onCriticalIncident] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});