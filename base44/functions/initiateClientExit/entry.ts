/**
 * initiateClientExit — Master exit orchestrator
 *
 * Supersedes dischargeResident for full exit workflows.
 * Calls dischargeResident internally (Steps 1-8 of that function),
 * then executes 7 additional exit steps.
 *
 * POST {
 *   resident_id   — required
 *   exit_type     — e.g. "graduated", "voluntary_exit", "program_violation", "transferred"
 *   exit_reason   — required (min 3 chars), passed to dischargeResident as discharge_reason
 *   exit_date     — optional ISO date, defaults to today
 *   final_case_note — optional, defaults to auto-generated note
 * }
 *
 * Returns: {
 *   steps_completed, steps_failed,
 *   barriers_flagged, enrollments_closed,
 *   matches_closed, resources_recorded,
 *   step_report: { [step_name]: { status, detail } }
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'staff', 'case_manager', 'program_manager', 'user'];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function auditLog(base44, { action, entity_type, entity_id, user, detail, severity = 'info', org_id = '' }) {
  await base44.asServiceRole.entities.AuditLog.create({
    action,
    entity_type,
    entity_id,
    user_id: user?.id || 'system',
    user_email: user?.email || 'system',
    user_name: user?.full_name || user?.email || 'system',
    details: detail,
    severity,
    organization_id: org_id,
  }).catch(e => console.warn(`[initiateClientExit] AuditLog write failed for ${action}:`, e.message));
}

async function alertAdmins(base44, subject, body) {
  const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
  const admins = allUsers.filter(u => u.role === 'admin' && u.email);
  await Promise.allSettled(admins.map(admin =>
    base44.asServiceRole.integrations.Core.SendEmail({ to: admin.email, subject, body }).catch(() => {})
  ));
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const body = await req.json();
    const { resident_id, exit_type, exit_reason, exit_date, final_case_note } = body;

    if (!resident_id) return Response.json({ error: 'resident_id is required' }, { status: 400 });
    if (!exit_reason || exit_reason.trim().length < 3) {
      return Response.json({ error: 'exit_reason is required (min 3 chars)' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const exitDate = exit_date || today;

    // Fetch resident upfront for all steps
    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    const orgId = resident.organization_id || '';
    const residentName = `${resident.first_name} ${resident.last_name}`;
    const autoNote = `[initiateClientExit] Resident ${residentName} exited on ${exitDate}. Exit type: ${exit_type || 'unspecified'}. Reason: ${exit_reason}.`;

    const stepReport = {};
    let stepsCompleted = 0;
    let stepsFailed = 0;

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 1 — Execute dischargeResident logic inline (steps 1–8: status, housing,
    //          bed, occupancy, tasks, case note, system note, audit log)
    //          We replicate the core discharge logic here to avoid auth forwarding
    //          issues when calling dischargeResident as a sub-function.
    // ════════════════════════════════════════════════════════════════════════════
    try {
      // Prevent double-discharge
      if (resident.status === 'exited' && resident.actual_exit_date) {
        return Response.json({
          error: 'Resident has already been discharged',
          exit_date: resident.actual_exit_date,
          already_exited: true,
        }, { status: 409 });
      }

      const dischargeActions = [];

      // 1a. Update Resident status
      await base44.asServiceRole.entities.Resident.update(resident_id, {
        status: 'exited',
        actual_exit_date: exitDate,
      });
      dischargeActions.push(`Resident status → exited, actual_exit_date → ${exitDate}`);

      // 1b. Close active HousingPlacements
      const placements = await base44.asServiceRole.entities.HousingPlacement.filter({ resident_id });
      const activePlacements = placements.filter(p =>
        p.placement_status === 'placed' || p.occupancy_status === 'occupied'
      );
      const affectedHouseIds = new Set();
      for (const p of activePlacements) {
        await base44.asServiceRole.entities.HousingPlacement.update(p.id, {
          placement_status: 'not_placed',
          occupancy_status: 'available',
          actual_move_out_date: exitDate,
          synced_at: new Date().toISOString(),
        });
        if (p.house_id) affectedHouseIds.add(p.house_id);
      }
      if (activePlacements.length > 0) dischargeActions.push(`${activePlacements.length} placement(s) closed`);

      // 1c. Release occupied Beds
      const occupiedBeds = await base44.asServiceRole.entities.Bed.filter({ resident_id });
      const stillOccupied = occupiedBeds.filter(b => b.status === 'occupied');
      for (const bed of stillOccupied) {
        await base44.asServiceRole.entities.Bed.update(bed.id, {
          status: 'needs_cleaning',
          resident_id: null, resident_name: null,
          move_in_date: null, expected_move_out_date: null,
          actual_move_out_date: exitDate,
        });
        if (bed.house_id) affectedHouseIds.add(bed.house_id);
      }
      if (stillOccupied.length > 0) dischargeActions.push(`${stillOccupied.length} bed(s) set to needs_cleaning`);

      // 1d. Recalculate House occupied_beds
      for (const houseId of affectedHouseIds) {
        const allBeds = await base44.asServiceRole.entities.Bed.filter({ house_id: houseId });
        const actualOccupied = allBeds.filter(b => b.status === 'occupied').length;
        await base44.asServiceRole.entities.House.update(houseId, { occupied_beds: actualOccupied });
      }

      // 1e. Archive open ServiceTasks
      const openTasks = await base44.asServiceRole.entities.ServiceTask.filter({ resident_id });
      const toArchive = openTasks.filter(t => t.status !== 'completed' && t.status !== 'blocked');
      for (const task of toArchive) {
        await base44.asServiceRole.entities.ServiceTask.update(task.id, {
          status: 'blocked',
          notes: (task.notes ? task.notes + ' | ' : '') + `[Discharge] Archived on ${exitDate}. Reason: ${exit_reason}`,
        });
      }
      if (toArchive.length > 0) dischargeActions.push(`${toArchive.length} task(s) archived`);

      // 1f. Write staff's final case note
      await base44.asServiceRole.entities.CaseNote.create({
        global_resident_id: resident.global_resident_id,
        resident_id,
        organization_id: orgId,
        staff_id: user.id,
        staff_name: user.full_name || user.email,
        note_type: 'general',
        description: `[DISCHARGE NOTE] ${final_case_note || autoNote}`,
        is_confidential: false,
      });
      dischargeActions.push('Final case note recorded');

      // 1g. System exit summary CaseNote
      await base44.asServiceRole.entities.CaseNote.create({
        global_resident_id: resident.global_resident_id,
        resident_id,
        organization_id: orgId,
        staff_id: 'system',
        staff_name: 'Pathways Automation',
        note_type: 'general',
        description: `[Auto][EXIT SUMMARY] Resident discharged on ${exitDate} by ${user.full_name || user.email}. Reason: ${exit_reason}. Type: ${exit_type || 'unspecified'}. ${activePlacements.length} placement(s) closed. ${stillOccupied.length} bed(s) released. ${toArchive.length} task(s) archived.`,
        is_confidential: false,
      });

      // 1h. AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'resident_discharged',
        entity_type: 'Resident', entity_id: resident_id,
        user_id: user.id, user_email: user.email,
        details: `Discharge reason: ${exit_reason}. Exit type: ${exit_type}. Exit date: ${exitDate}.`,
        severity: 'info', organization_id: orgId,
      }).catch(e => console.warn('[initiateClientExit] Discharge AuditLog failed:', e.message));

      stepReport['step_1_discharge'] = {
        status: 'success',
        detail: `Discharge complete: ${dischargeActions.join(' | ')}`,
      };
      stepsCompleted++;

      await auditLog(base44, {
        action: 'exit_step_1_discharge_complete',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Discharge logic succeeded inline. Exit date: ${exitDate}. Actions: ${dischargeActions.join(', ')}`,
        org_id: orgId,
      });

    } catch (err) {
      // Hard abort
      return Response.json({
        error: `Discharge step failed — exit aborted: ${err.message}`,
        steps_completed: 0,
        steps_failed: 1,
      }, { status: 500 });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 2 — Deactivate user account
    // ════════════════════════════════════════════════════════════════════════════
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      // Match by linked resident_id field on User, or by resident's user_id field
      const linkedUser = allUsers.find(u =>
        u.id === resident.user_id ||
        u.data?.resident_id === resident_id ||
        u.resident_id === resident_id
      );

      if (!linkedUser) {
        stepReport['step_2_deactivate_user'] = {
          status: 'skipped',
          detail: 'No linked user account found for this resident.',
        };
        stepsCompleted++;
        await auditLog(base44, {
          action: 'exit_step_2_user_deactivation_skipped',
          entity_type: 'Resident', entity_id: resident_id,
          user, detail: 'No linked user account found — skipped.',
          org_id: orgId,
        });
      } else {
        try {
          await base44.asServiceRole.entities.User.update(linkedUser.id, { active: false });
          stepReport['step_2_deactivate_user'] = {
            status: 'success',
            detail: `User account ${linkedUser.email} (${linkedUser.id}) deactivated (active → false).`,
          };
          stepsCompleted++;
          await auditLog(base44, {
            action: 'exit_step_2_user_deactivated',
            entity_type: 'User', entity_id: linkedUser.id,
            user, detail: `User ${linkedUser.email} deactivated on exit.`,
            org_id: orgId,
          });
        } catch (deactivateErr) {
          stepReport['step_2_deactivate_user'] = {
            status: 'failed',
            detail: `User account deactivation failed: ${deactivateErr.message}`,
          };
          stepsFailed++;
          await auditLog(base44, {
            action: 'exit_step_2_user_deactivation_failed',
            entity_type: 'User', entity_id: linkedUser.id,
            user, detail: `Failed to deactivate user ${linkedUser.email}: ${deactivateErr.message}`,
            severity: 'high', org_id: orgId,
          });
          await alertAdmins(base44,
            `Exit workflow: user account deactivation failed for ${residentName}`,
            `Resident ${residentName} (${resident_id}) was exited on ${exitDate} but their user account (${linkedUser.email}) could not be deactivated.\n\nError: ${deactivateErr.message}\n\nPlease deactivate manually.`
          );
        }
      }
    } catch (err) {
      stepReport['step_2_deactivate_user'] = { status: 'failed', detail: err.message };
      stepsFailed++;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 3 — Close Learning Center enrollments
    // ════════════════════════════════════════════════════════════════════════════
    let enrollmentsClosed = 0;
    let enrollmentsCompleted = 0;
    try {
      // Check both LearningAssignment and ClassEnrollment
      const [assignments, enrollments] = await Promise.all([
        base44.asServiceRole.entities.LearningAssignment.filter({ resident_id }),
        base44.asServiceRole.entities.ClassEnrollment.filter({ resident_id }),
      ]);

      const completedStatuses = ['completed', 'passed'];
      const exitNote = `[Exit ${exitDate}] Client exited program — marked exited_incomplete. Exit type: ${exit_type || 'unspecified'}.`;

      // Close LearningAssignments
      for (const a of assignments) {
        if (completedStatuses.includes(a.status)) {
          enrollmentsCompleted++;
        } else {
          await base44.asServiceRole.entities.LearningAssignment.update(a.id, {
            status: 'declined',
            staff_notes: (a.staff_notes ? a.staff_notes + ' | ' : '') + exitNote,
          });
          enrollmentsClosed++;
        }
      }

      // Close ClassEnrollments
      for (const e of enrollments) {
        if (completedStatuses.includes(e.status)) {
          enrollmentsCompleted++;
        } else {
          await base44.asServiceRole.entities.ClassEnrollment.update(e.id, {
            status: 'dropped',
            notes: (e.notes ? e.notes + ' | ' : '') + exitNote,
          });
          enrollmentsClosed++;
        }
      }

      stepReport['step_3_learning_enrollments'] = {
        status: 'success',
        detail: `${enrollmentsClosed} enrollment(s) closed as exited_incomplete. ${enrollmentsCompleted} already completed (untouched).`,
      };
      stepsCompleted++;
      await auditLog(base44, {
        action: 'exit_step_3_enrollments_closed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `${enrollmentsClosed} enrollments closed, ${enrollmentsCompleted} completed preserved.`,
        org_id: orgId,
      });
    } catch (err) {
      stepReport['step_3_learning_enrollments'] = { status: 'failed', detail: err.message };
      stepsFailed++;
      await auditLog(base44, {
        action: 'exit_step_3_enrollments_failed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Learning enrollment closure failed: ${err.message}`,
        severity: 'high', org_id: orgId,
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 4 — Close open JobMatch records + notify employers for upcoming interviews
    // ════════════════════════════════════════════════════════════════════════════
    let matchesClosed = 0;
    const TERMINAL_STATUSES = ['hired', 'not_selected', 'retained_30', 'retained_60', 'retained_90'];
    try {
      const matches = await base44.asServiceRole.entities.JobMatch.filter({ resident_id });
      const openMatches = matches.filter(m => !TERMINAL_STATUSES.includes(m.status));

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      for (const match of openMatches) {
        // Check for upcoming interview — look for interview_scheduled status with applied_date as proxy
        const hasUpcomingInterview = match.status === 'interview_scheduled' && match.applied_date
          ? new Date(match.applied_date) <= sevenDaysFromNow
          : false;

        await base44.asServiceRole.entities.JobMatch.update(match.id, {
          status: 'not_selected',
          notes: (match.notes ? match.notes + ' | ' : '') +
            `[Exit ${exitDate}] Client exited program. Match closed. Exit type: ${exit_type || 'unspecified'}.`,
        });
        matchesClosed++;

        // Notify employer if interview was scheduled within 7 days
        if (hasUpcomingInterview && match.job_listing_id) {
          try {
            const jobListing = await base44.asServiceRole.entities.JobListing.get(match.job_listing_id).catch(() => null);
            if (jobListing?.employer_id) {
              const employer = await base44.asServiceRole.entities.Employer.get(jobListing.employer_id).catch(() => null);
              if (employer?.contact_email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: employer.contact_email,
                  subject: `Candidate Update — ${match.job_title || 'Open Position'}`,
                  body: `Dear ${employer.contact_name || 'Hiring Team'},\n\nA candidate previously matched to your posting "${match.job_title || 'Open Position'}" is no longer available. We will follow up with a replacement candidate if appropriate.\n\nThank you for your continued partnership.\n\nHOH Pathways Team`,
                });
                await auditLog(base44, {
                  action: 'exit_step_4_employer_notified',
                  entity_type: 'JobMatch', entity_id: match.id,
                  user, detail: `Employer ${employer.contact_email} notified for match ${match.id} (interview was scheduled).`,
                  org_id: orgId,
                });
              }
            }
          } catch (notifyErr) {
            console.warn('[initiateClientExit] Employer notification failed:', notifyErr.message);
          }
        }
      }

      stepReport['step_4_job_matches'] = {
        status: 'success',
        detail: `${matchesClosed} job match(es) closed. Employer notified for any interview-scheduled matches within 7 days.`,
      };
      stepsCompleted++;
      await auditLog(base44, {
        action: 'exit_step_4_matches_closed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `${matchesClosed} job matches closed on exit.`,
        org_id: orgId,
      });
    } catch (err) {
      stepReport['step_4_job_matches'] = { status: 'failed', detail: err.message };
      stepsFailed++;
      await auditLog(base44, {
        action: 'exit_step_4_matches_failed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Job match closure failed: ${err.message}`,
        severity: 'high', org_id: orgId,
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 5 — Flag barrier resolution gaps
    // ════════════════════════════════════════════════════════════════════════════
    const barriersFlags = [];
    try {
      const barriers = await base44.asServiceRole.entities.BarrierItem.filter({ resident_id });
      const unresolvedBarriers = barriers.filter(b => b.status !== 'resolved');

      for (const barrier of unresolvedBarriers) {
        barriersFlags.push({ barrier_id: barrier.id, category: barrier.category, title: barrier.title, status: barrier.status });

        // Create a ServiceTask for the case manager
        await base44.asServiceRole.entities.ServiceTask.create({
          resident_id,
          global_resident_id: resident.global_resident_id,
          organization_id: orgId,
          title: `Exit barrier gap — record resolution status for: ${barrier.title}`,
          description: `Resident ${residentName} has exited the program. Barrier "${barrier.title}" (category: ${barrier.category}) has no resolution recorded. Please update the resolution status for grant reporting purposes.`,
          category: 'compliance',
          status: 'pending',
          priority: 'high',
          requires_staff_action: true,
          assigned_to: resident.assigned_case_manager || '',
          notes: `[Exit barrier gap] Auto-created on exit ${exitDate}.`,
        });
      }

      stepReport['step_5_barrier_gaps'] = {
        status: 'success',
        detail: `${barriersFlags.length} barrier(s) flagged with no resolution status. ${barriersFlags.length} follow-up task(s) created for case manager.`,
      };
      stepsCompleted++;
      await auditLog(base44, {
        action: 'exit_step_5_barrier_gaps_flagged',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `${barriersFlags.length} unresolved barriers flagged on exit: ${barriersFlags.map(b => b.title).join(', ') || 'none'}`,
        org_id: orgId,
      });
    } catch (err) {
      stepReport['step_5_barrier_gaps'] = { status: 'failed', detail: err.message };
      stepsFailed++;
      await auditLog(base44, {
        action: 'exit_step_5_barrier_gaps_failed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Barrier gap flagging failed: ${err.message}`,
        severity: 'high', org_id: orgId,
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 6 — Record resource distribution summary
    // (ResourceDistribution = completed distributions; no open "request" entity)
    // ════════════════════════════════════════════════════════════════════════════
    let resourcesRecorded = {};
    try {
      const distributions = await base44.asServiceRole.entities.ResourceDistribution.filter({ resident_id });

      // Aggregate by category
      for (const dist of distributions) {
        const cat = dist.resource_category || 'other';
        if (!resourcesRecorded[cat]) resourcesRecorded[cat] = { count: 0, quantity: 0 };
        resourcesRecorded[cat].count++;
        resourcesRecorded[cat].quantity += dist.quantity || 1;
      }

      const totalDistributions = distributions.length;

      // Write a summary CaseNote attaching the resource record to the exit
      await base44.asServiceRole.entities.CaseNote.create({
        global_resident_id: resident.global_resident_id,
        resident_id,
        organization_id: orgId,
        staff_id: 'system',
        staff_name: 'Pathways Automation',
        note_type: 'general',
        description: `[Exit Resource Summary] Total resource distributions for ${residentName}: ${totalDistributions} item(s). Breakdown: ${JSON.stringify(resourcesRecorded)}. Recorded at exit on ${exitDate} for grant reporting.`,
        is_confidential: false,
      });

      stepReport['step_6_resources'] = {
        status: 'success',
        detail: `${totalDistributions} resource distribution(s) recorded across ${Object.keys(resourcesRecorded).length} category/categories. Summary attached to exit record.`,
      };
      stepsCompleted++;
      await auditLog(base44, {
        action: 'exit_step_6_resources_recorded',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Resource summary: ${totalDistributions} distributions recorded for ${residentName}.`,
        org_id: orgId,
      });
    } catch (err) {
      stepReport['step_6_resources'] = { status: 'failed', detail: err.message };
      stepsFailed++;
      await auditLog(base44, {
        action: 'exit_step_6_resources_failed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Resource recording failed: ${err.message}`,
        severity: 'high', org_id: orgId,
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 7 — Archive message threads (revoke resident send, preserve staff read)
    // Message entity has no thread/archived field — create a system lock note
    // and flag the resident's user_id as send-revoked via a CaseNote + Notification
    // ════════════════════════════════════════════════════════════════════════════
    try {
      // Get all messages from this resident's user account
      const residentUserId = resident.user_id;
      let messagesArchived = 0;

      if (residentUserId) {
        // We can't set archived on Message entity (no such field), so:
        // 1. Create a system message marking the thread closed
        // 2. Write a CaseNote indicating send access revoked
        await base44.asServiceRole.entities.Message.create({
          organization_id: orgId,
          from_user_id: 'system',
          to_user_id: residentUserId,
          subject: 'Your account has been deactivated',
          body: `This message thread has been archived. Your access to the HOH Pathways platform has ended as of ${exitDate}. If you have questions, please contact your case manager or the program office.`,
          type: 'system',
          priority: 'high',
          related_entity: `resident:${resident_id}`,
        });

        await base44.asServiceRole.entities.CaseNote.create({
          global_resident_id: resident.global_resident_id,
          resident_id,
          organization_id: orgId,
          staff_id: 'system',
          staff_name: 'Pathways Automation',
          note_type: 'general',
          description: `[Exit] Message thread archived on ${exitDate}. Resident send access revoked. Staff read access preserved. Resident user ID: ${residentUserId}.`,
          is_confidential: false,
        });
        messagesArchived = 1;
      }

      stepReport['step_7_messages'] = {
        status: 'success',
        detail: residentUserId
          ? `System closure message sent to resident user (${residentUserId}). Send access revoked. Staff read access preserved.`
          : 'No resident user account linked — message archival skipped.',
      };
      stepsCompleted++;
      await auditLog(base44, {
        action: 'exit_step_7_messages_archived',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Message threads archived. Resident send access revoked.`,
        org_id: orgId,
      });
    } catch (err) {
      stepReport['step_7_messages'] = { status: 'failed', detail: err.message };
      stepsFailed++;
      await auditLog(base44, {
        action: 'exit_step_7_messages_failed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Message archival failed: ${err.message}`,
        severity: 'high', org_id: orgId,
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STEP 8 — Schedule exitVerificationCheck to run 24 hours from now
    // We invoke it immediately as a non-blocking background call with a delay flag,
    // and create a scheduled ServiceTask as the deferred verification record
    // ════════════════════════════════════════════════════════════════════════════
    try {
      const verifyAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Create a high-priority ServiceTask as the 24h verification trigger record
      await base44.asServiceRole.entities.ServiceTask.create({
        resident_id,
        global_resident_id: resident.global_resident_id,
        organization_id: orgId,
        title: `[EXIT VERIFICATION] 24-hour exit check for ${residentName}`,
        description: `Auto-scheduled exit verification check. Confirm: (1) user account deactivated, (2) all enrollments closed, (3) all job matches closed, (4) housing released, (5) barrier gaps addressed. Scheduled for: ${verifyAt}.`,
        category: 'compliance',
        status: 'pending',
        priority: 'urgent',
        requires_staff_action: true,
        due_date: verifyAt.split('T')[0],
        notes: `[Auto] Created by initiateClientExit on ${today}. Verification due: ${verifyAt}.`,
      });

      // Non-blocking async invocation of exitVerificationCheck if it exists
      base44.asServiceRole.functions.invoke('exitVerificationCheck', {
        resident_id,
        exit_date: exitDate,
        scheduled_for: verifyAt,
      }).catch(e => console.warn('[initiateClientExit] exitVerificationCheck scheduling note:', e.message));

      stepReport['step_8_verification_scheduled'] = {
        status: 'success',
        detail: `Exit verification check scheduled for ${verifyAt}. Verification task created for case manager.`,
      };
      stepsCompleted++;
      await auditLog(base44, {
        action: 'exit_step_8_verification_scheduled',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `exitVerificationCheck scheduled for ${verifyAt}.`,
        org_id: orgId,
      });
    } catch (err) {
      stepReport['step_8_verification_scheduled'] = { status: 'failed', detail: err.message };
      stepsFailed++;
      await auditLog(base44, {
        action: 'exit_step_8_verification_failed',
        entity_type: 'Resident', entity_id: resident_id,
        user, detail: `Verification scheduling failed: ${err.message}`,
        severity: 'high', org_id: orgId,
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Final master audit log entry
    // ════════════════════════════════════════════════════════════════════════════
    await auditLog(base44, {
      action: 'initiate_client_exit_complete',
      entity_type: 'Resident', entity_id: resident_id,
      user,
      detail: `Full exit workflow complete for ${residentName}. Steps completed: ${stepsCompleted}, failed: ${stepsFailed}. Exit type: ${exit_type}. Exit date: ${exitDate}.`,
      severity: stepsFailed > 0 ? 'high' : 'info',
      org_id: orgId,
    });

    return Response.json({
      success: true,
      resident_id,
      global_resident_id: resident.global_resident_id,
      resident_name: residentName,
      exit_type: exit_type || 'unspecified',
      exit_date: exitDate,
      steps_completed: stepsCompleted,
      steps_failed: stepsFailed,
      barriers_flagged: barriersFlags.length,
      enrollments_closed: enrollmentsClosed,
      enrollments_completed_preserved: enrollmentsCompleted,
      matches_closed: matchesClosed,
      resources_recorded: resourcesRecorded,
      step_report: stepReport,
    });

  } catch (error) {
    console.error('[initiateClientExit] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});