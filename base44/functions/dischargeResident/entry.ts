/**
 * dischargeResident — Production Hardening: Discharge Workflow
 *
 * Validates required fields, sets actual_exit_date, closes placements,
 * archives tasks, writes exit CaseNote, and logs to AuditLog.
 *
 * Called directly from the Discharge Dialog in ResidentProfile.
 * 
 * POST {
 *   resident_id,
 *   discharge_reason,   // required
 *   final_case_note,    // required
 *   actual_exit_date,   // optional, defaults to today
 *   force,             // admin override bypass
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
    const { resident_id, discharge_reason, final_case_note, actual_exit_date } = body;

    // ── Validation gates ──────────────────────────────────────────────────────
    if (!resident_id) return Response.json({ error: 'resident_id is required' }, { status: 400 });
    if (!discharge_reason || discharge_reason.trim().length < 3) {
      return Response.json({ error: 'discharge_reason is required (min 3 chars)' }, { status: 400 });
    }
    if (!final_case_note || final_case_note.trim().length < 10) {
      return Response.json({ error: 'final_case_note is required (min 10 chars)' }, { status: 400 });
    }

    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    // Prevent double-discharge
    if (resident.status === 'exited' && resident.actual_exit_date) {
      return Response.json({
        error: 'Resident has already been discharged',
        exit_date: resident.actual_exit_date,
        already_exited: true,
      }, { status: 409 });
    }

    const today = new Date().toISOString().split('T')[0];
    const exitDate = actual_exit_date || today;
    const actions = [];

    // ── 1. Update Resident status ────────────────────────────────────────────
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      status: 'exited',
      actual_exit_date: exitDate,
    });
    actions.push(`Resident status → exited, actual_exit_date → ${exitDate}`);

    // ── 2. Close active HousingPlacements ────────────────────────────────────
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
    if (activePlacements.length > 0) actions.push(`${activePlacements.length} placement(s) closed`);

    // ── 3. Release occupied Beds ─────────────────────────────────────────────
    const occupiedBeds = await base44.asServiceRole.entities.Bed.filter({ resident_id });
    const stillOccupied = occupiedBeds.filter(b => b.status === 'occupied');
    for (const bed of stillOccupied) {
      await base44.asServiceRole.entities.Bed.update(bed.id, {
        status: 'available',
        resident_id: null,
        resident_name: null,
        move_in_date: null,
        expected_move_out_date: null,
        actual_move_out_date: exitDate,
      });
      if (bed.house_id) affectedHouseIds.add(bed.house_id);
    }
    if (stillOccupied.length > 0) actions.push(`${stillOccupied.length} bed(s) released`);

    // ── 4. Recalculate House occupied_beds ───────────────────────────────────
    for (const houseId of affectedHouseIds) {
      const allBeds = await base44.asServiceRole.entities.Bed.filter({ house_id: houseId });
      const actualOccupied = allBeds.filter(b => b.status === 'occupied').length;
      await base44.asServiceRole.entities.House.update(houseId, { occupied_beds: actualOccupied });
    }

    // ── 5. Archive open ServiceTasks ─────────────────────────────────────────
    const openTasks = await base44.asServiceRole.entities.ServiceTask.filter({ resident_id });
    const toArchive = openTasks.filter(t => t.status !== 'completed' && t.status !== 'blocked');
    for (const task of toArchive) {
      await base44.asServiceRole.entities.ServiceTask.update(task.id, {
        status: 'blocked',
        notes: (task.notes ? task.notes + ' | ' : '') + `[Discharge] Archived on ${exitDate}. Reason: ${discharge_reason}`,
      });
    }
    if (toArchive.length > 0) actions.push(`${toArchive.length} task(s) archived`);

    // ── 6. Write staff's final case note ─────────────────────────────────────
    await base44.asServiceRole.entities.CaseNote.create({
      global_resident_id: resident.global_resident_id,
      resident_id,
      organization_id: resident.organization_id || '',
      staff_id: user.id,
      staff_name: user.full_name || user.email,
      note_type: 'general',
      description: `[DISCHARGE NOTE] ${final_case_note}`,
      is_confidential: false,
    });
    actions.push('Final case note recorded');

    // ── 7. Write system exit summary CaseNote ────────────────────────────────
    await base44.asServiceRole.entities.CaseNote.create({
      global_resident_id: resident.global_resident_id,
      resident_id,
      organization_id: resident.organization_id || '',
      staff_id: 'system',
      staff_name: 'Pathways Automation',
      note_type: 'general',
      description: `[Auto][EXIT SUMMARY] Resident discharged on ${exitDate} by ${user.full_name || user.email}. Reason: ${discharge_reason}. ${activePlacements.length} placement(s) closed. ${stillOccupied.length} bed(s) released. ${toArchive.length} task(s) archived.`,
      is_confidential: false,
    });

    // ── 8. Write AuditLog ────────────────────────────────────────────────────
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'resident_discharged',
        entity_type: 'Resident',
        entity_id: resident_id,
        user_id: user.id,
        user_email: user.email,
        details: `Discharge reason: ${discharge_reason}. Exit date: ${exitDate}.`,
        severity: 'info',
        organization_id: resident.organization_id || '',
      });
    } catch (e) {
      console.warn('[dischargeResident] AuditLog write failed:', e.message);
    }

    return Response.json({
      success: true,
      resident_id,
      global_resident_id: resident.global_resident_id,
      exit_date: exitDate,
      discharge_reason,
      placements_closed: activePlacements.length,
      beds_released: stillOccupied.length,
      tasks_archived: toArchive.length,
      actions,
    });

  } catch (error) {
    console.error('[dischargeResident] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});