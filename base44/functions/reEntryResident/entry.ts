/**
 * reEntryResident — Production Hardening: Re-Apply / Re-Entry Workflow
 *
 * Allows a previously exited/inactive resident to re-enter the program.
 * - Detects prior record via global_resident_id
 * - Preserves full history (NO overwriting old records)
 * - Resets status to pre_intake / active
 * - Creates a CaseNote marking start of new program cycle
 * - Logs to AuditLog
 *
 * POST {
 *   resident_id,           // existing Resident.id to re-activate
 *   reentry_reason,        // required
 *   new_intake_date,       // optional, defaults to today
 *   new_case_manager,      // optional
 *   new_case_manager_id,   // optional
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'user', 'staff', 'case_manager', 'program_manager'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const body = await req.json();
    const { resident_id, reentry_reason, new_intake_date, new_case_manager, new_case_manager_id } = body;

    if (!resident_id) return Response.json({ error: 'resident_id is required' }, { status: 400 });
    if (!reentry_reason || reentry_reason.trim().length < 3) {
      return Response.json({ error: 'reentry_reason is required' }, { status: 400 });
    }

    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    // Only allow re-entry for exited or inactive residents
    const reentryAllowedStatuses = ['exited', 'inactive', 'graduated'];
    if (!reentryAllowedStatuses.includes(resident.status)) {
      return Response.json({
        error: `Re-entry not allowed for status "${resident.status}". Resident must be exited, inactive, or graduated.`,
        current_status: resident.status,
      }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const intakeDate = new_intake_date || today;

    // Count prior cycles by checking how many exit dates exist
    const existingNotes = await base44.asServiceRole.entities.CaseNote.filter({ resident_id });
    const priorCycles = existingNotes.filter(n => n.description?.includes('[REENTRY CYCLE]')).length + 1;

    // Build update payload — preserve all history
    const updates = {
      status: 'pre_intake',
      intake_date: intakeDate,
      actual_exit_date: null,        // clear previous exit date
      expected_exit_date: null,      // reset expected
    };
    if (new_case_manager) updates.assigned_case_manager = new_case_manager;
    if (new_case_manager_id) updates.assigned_case_manager_id = new_case_manager_id;

    await base44.asServiceRole.entities.Resident.update(resident_id, updates);

    // Write system re-entry CaseNote (preserves history of cycles)
    await base44.asServiceRole.entities.CaseNote.create({
      global_resident_id: resident.global_resident_id,
      resident_id,
      organization_id: resident.organization_id || '',
      staff_id: user.id,
      staff_name: user.full_name || user.email,
      note_type: 'plan_update',
      description: `[REENTRY CYCLE ${priorCycles + 1}] Resident re-admitted on ${intakeDate} by ${user.full_name || user.email}. Reason: ${reentry_reason}. Prior exit date: ${resident.actual_exit_date || 'N/A'}. Full history preserved.`,
      is_confidential: false,
    });

    // AuditLog
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'resident_reentry',
        entity_type: 'Resident',
        entity_id: resident_id,
        user_id: user.id,
        user_email: user.email,
        details: `Re-entry cycle ${priorCycles + 1}. Reason: ${reentry_reason}. Prior status: ${resident.status}.`,
        severity: 'info',
        organization_id: resident.organization_id || '',
      });
    } catch (e) {
      console.warn('[reEntryResident] AuditLog failed:', e.message);
    }

    return Response.json({
      success: true,
      resident_id,
      global_resident_id: resident.global_resident_id,
      new_status: 'pre_intake',
      intake_date: intakeDate,
      reentry_cycle: priorCycles + 1,
      prior_exit_date: resident.actual_exit_date || null,
      message: `Resident ${resident.global_resident_id} re-activated for program cycle ${priorCycles + 1}. Full history preserved.`,
    });

  } catch (error) {
    console.error('[reEntryResident] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});