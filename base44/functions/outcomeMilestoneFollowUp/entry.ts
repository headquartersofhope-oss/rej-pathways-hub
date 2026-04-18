/**
 * outcomeMilestoneFollowUp — Week 3 Automation 3
 *
 * Runs daily. Finds exited residents and fires follow-up tasks at:
 *   30 days, 60 days, 90 days after actual_exit_date
 *
 * Per milestone:
 *   - Creates one ServiceTask for the assigned case manager
 *   - Creates one OutcomeRecord placeholder if not already present
 *   - Sends notification to assigned case manager
 *   - Idempotent: milestone only triggers once per resident
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MILESTONES = [
  { days: 30,  label: '30_days',  title: '30-Day Post-Exit Follow-Up',  priority: 'high' },
  { days: 60,  label: '60_days',  title: '60-Day Post-Exit Follow-Up',  priority: 'medium' },
  { days: 90,  label: '90_days',  title: '90-Day Post-Exit Follow-Up',  priority: 'medium' },
];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const exit = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - exit.getTime()) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch all exited residents
    const exitedResidents = await base44.asServiceRole.entities.Resident.filter({ status: 'exited' });

    const allUsers = await base44.asServiceRole.entities.User.list();

    const processed = [];
    const skipped = [];

    for (const resident of exitedResidents) {
      if (!resident.actual_exit_date) {
        skipped.push({ resident_id: resident.id, reason: 'no actual_exit_date' });
        continue;
      }

      const daysOut = daysSince(resident.actual_exit_date);
      if (daysOut === null || daysOut < 0) {
        skipped.push({ resident_id: resident.id, reason: 'exit date in future' });
        continue;
      }

      const residentId = resident.id;
      const globalResidentId = resident.global_resident_id || '';
      const orgId = resident.organization_id || '';
      const residentName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim();

      // Find which milestones are due today (window: exactly at or within 2 days to catch scheduling drift)
      const dueMilestones = MILESTONES.filter(m => daysOut >= m.days && daysOut <= m.days + 2);
      if (dueMilestones.length === 0) {
        skipped.push({ resident_id: residentId, name: residentName, days_out: daysOut, reason: 'no milestone due' });
        continue;
      }

      // Fetch existing outcome records and tasks for this resident (for idempotency)
      const [existingOutcomes, existingMilestoneTasks] = await Promise.all([
        base44.asServiceRole.entities.OutcomeRecord.filter({ resident_id: residentId }),
        base44.asServiceRole.entities.ServiceTask.filter({ resident_id: residentId, category: 'outcome_followup' }),
      ]);

      const existingOutcomeMilestones = new Set(existingOutcomes.map(o => o.milestone));
      const existingTaskTitles = new Set(existingMilestoneTasks.map(t => t.title));

      // Find case manager for notification
      const caseManager = resident.assigned_case_manager_id
        ? allUsers.find(u => u.id === resident.assigned_case_manager_id)
        : null;
      const adminUsers = allUsers.filter(u => u.role === 'admin');

      const residentActions = [];

      for (const milestone of dueMilestones) {
        const taskTitle = `${milestone.title} — ${residentName} (${globalResidentId})`;

        // Idempotency: skip if task already created for this milestone
        if (existingTaskTitles.has(taskTitle)) {
          residentActions.push({ milestone: milestone.label, action: 'skipped', reason: 'task already exists' });
          continue;
        }

        // 1. Create ServiceTask
        let createdTask = null;
        try {
          createdTask = await base44.asServiceRole.entities.ServiceTask.create({
            resident_id: residentId,
            global_resident_id: globalResidentId,
            organization_id: orgId,
            title: taskTitle,
            description: `Conduct ${milestone.days}-day post-exit follow-up for ${residentName} (${globalResidentId}). Exit date: ${resident.actual_exit_date}. Contact resident and record employment, housing, and stability status.`,
            category: 'outcome_followup',
            status: 'pending',
            priority: milestone.priority,
            assigned_to: resident.assigned_case_manager || '',
            is_resident_visible: false,
            requires_staff_action: true,
            due_date: todayStr,
          });
        } catch (e) {
          console.warn(`[outcomeMilestoneFollowUp] Task creation failed for ${residentId} ${milestone.label}: ${e.message}`);
        }

        // 2. Create OutcomeRecord placeholder if not already present
        let createdOutcome = null;
        if (!existingOutcomeMilestones.has(milestone.label)) {
          try {
            createdOutcome = await base44.asServiceRole.entities.OutcomeRecord.create({
              resident_id: residentId,
              global_resident_id: globalResidentId,
              organization_id: orgId,
              milestone: milestone.label,
              follow_up_date: todayStr,
              contact_successful: false,
              contact_method: 'phone_call',
              employment_status: 'unknown',
              housing_stability: 'unknown',
              income_stability: 'unknown',
              notes: `[Auto-generated placeholder] ${milestone.days}-day follow-up initiated on ${todayStr}. Staff to complete.`,
            });
          } catch (e) {
            console.warn(`[outcomeMilestoneFollowUp] OutcomeRecord creation failed for ${residentId} ${milestone.label}: ${e.message}`);
          }
        }

        // 3. Notify case manager and admins
        const notifyTargets = [];
        if (caseManager) notifyTargets.push({ user: caseManager, reason: 'case_manager' });
        for (const admin of adminUsers) {
          if (!caseManager || admin.id !== caseManager.id) {
            notifyTargets.push({ user: admin, reason: 'admin' });
          }
        }

        for (const { user } of notifyTargets) {
          if (!user.email) continue;
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user.email,
              from_name: 'Pathways Hub Outcomes',
              subject: `📋 ${milestone.days}-Day Post-Exit Follow-Up Due: ${residentName}`,
              body: `<p><strong>${milestone.days}-Day Post-Exit Follow-Up Required</strong></p>
<p>A resident outcome follow-up is now due.</p>
<ul>
<li><strong>Resident:</strong> ${residentName} (${globalResidentId})</li>
<li><strong>Exit Date:</strong> ${resident.actual_exit_date}</li>
<li><strong>Days Since Exit:</strong> ${daysOut}</li>
<li><strong>Milestone:</strong> ${milestone.label}</li>
</ul>
<p>Please log in to Pathways Hub to contact the resident and complete the outcome record. A follow-up task has been created in the case management module.</p>`,
            });
          } catch (e) {
            console.warn(`[outcomeMilestoneFollowUp] Email failed for user ${user.id}: ${e.message}`);
          }
        }

        residentActions.push({
          milestone: milestone.label,
          days_out: daysOut,
          task_created: !!createdTask,
          task_id: createdTask?.id || null,
          outcome_record_created: !!createdOutcome,
          outcome_record_id: createdOutcome?.id || null,
          notifications_sent: notifyTargets.length,
        });
      }

      if (residentActions.length > 0) {
        processed.push({
          resident_id: residentId,
          global_resident_id: globalResidentId,
          name: residentName,
          exit_date: resident.actual_exit_date,
          days_out: daysOut,
          actions: residentActions,
        });
      }
    }

    return Response.json({
      success: true,
      run_date: todayStr,
      exited_residents_checked: exitedResidents.length,
      residents_processed: processed.length,
      skipped: skipped.length,
      detail: processed,
    });

  } catch (error) {
    console.error('[outcomeMilestoneFollowUp] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});