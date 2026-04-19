import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * onResidentExited
 * ================
 * Triggered by automation when a Resident record is UPDATED
 * and the new status is "exited" (filter: data.status = exited).
 *
 * Responsibilities:
 *   1. Validate status is truly "exited" (double-check from DB)
 *   2. Idempotency: skip if actual_exit_date already set AND bed already released
 *   3. Set Resident.actual_exit_date = today if not already set
 *   4. Find all active HousingPlacements for this resident
 *   5. Update HousingPlacement → placement_status: not_placed, occupancy_status: available, actual_move_out_date: today
 *   6. Release the Bed → status: available, clear resident_id/resident_name/move_in_date
 *   7. Recalculate House.occupied_beds from actual Bed records (no manual counter)
 *   8. Mark all open ServiceTasks as "blocked" with a system note (not deleted — preserve history)
 *   9. Write a CaseNote confirming exit and discharge
 *
 * Idempotency key: Resident.actual_exit_date already set + Bed not occupied by this resident
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const residentId = payload?.event?.entity_id || payload?.resident_id;
    const residentData = payload?.data || null;

    if (!residentId) {
      return Response.json({ error: 'Missing resident_id or event.entity_id' }, { status: 400 });
    }

    // Always fetch fresh from DB to avoid stale automation payload
    const resident = await base44.asServiceRole.entities.Resident.get(residentId);

    if (!resident) {
      return Response.json({ error: `Resident ${residentId} not found` }, { status: 404 });
    }

    // Safety gate: only process if status is actually "exited"
    if (resident.status !== 'exited') {
      return Response.json({
        skipped: true,
        reason: `Resident status is "${resident.status}", not "exited" — no exit actions taken`
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const actions = [];

    // ── STEP 1: Idempotency — check if already processed ────────────────────
    // Check if bed is already released for this resident
    const occupiedByThis = await base44.asServiceRole.entities.Bed.filter({
      resident_id: residentId
    });
    const stillOccupied = occupiedByThis.filter(b => b.status === 'occupied');

    if (resident.actual_exit_date && stillOccupied.length === 0) {
      return Response.json({
        skipped: true,
        reason: `Exit already processed: actual_exit_date=${resident.actual_exit_date}, no occupied beds found for this resident`,
        global_resident_id: resident.global_resident_id
      });
    }

    // ── STEP 2: Set actual_exit_date on Resident if not already set ──────────
    if (!resident.actual_exit_date) {
      await base44.asServiceRole.entities.Resident.update(residentId, {
        actual_exit_date: today
      });
      actions.push(`Resident actual_exit_date set to ${today}`);
    }

    // ── STEP 3: Close all active HousingPlacements ───────────────────────────
    const placements = await base44.asServiceRole.entities.HousingPlacement.filter({
      resident_id: residentId
    });
    const activePlacements = placements.filter(p =>
      p.placement_status === 'placed' || p.occupancy_status === 'occupied'
    );

    const affectedHouseIds = new Set();

    for (const placement of activePlacements) {
      await base44.asServiceRole.entities.HousingPlacement.update(placement.id, {
        placement_status: 'not_placed',
        occupancy_status: 'available',
        actual_move_out_date: today,
        last_verified: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      });
      if (placement.house_id) affectedHouseIds.add(placement.house_id);
      actions.push(`HousingPlacement ${placement.id} → placement_status: not_placed, move_out: ${today}`);
    }

    // ── STEP 4: Release all occupied Beds ────────────────────────────────────
    for (const bed of stillOccupied) {
      await base44.asServiceRole.entities.Bed.update(bed.id, {
        status: 'needs_cleaning',
        resident_id: null,
        resident_name: null,
        move_in_date: null,
        expected_move_out_date: null,
        actual_move_out_date: today,
      });
      if (bed.house_id) affectedHouseIds.add(bed.house_id);
      actions.push(`Bed "${bed.bed_label}" (${bed.house_name}) → needs_cleaning (awaiting housekeeping confirmation before available)`);
    }

    // ── STEP 5: Recalculate House.occupied_beds for all affected houses ──────
    for (const houseId of affectedHouseIds) {
      const allBeds = await base44.asServiceRole.entities.Bed.filter({ house_id: houseId });
      const actualOccupied = allBeds.filter(b => b.status === 'occupied').length;
      const house = await base44.asServiceRole.entities.House.get(houseId);
      if (house) {
        await base44.asServiceRole.entities.House.update(houseId, {
          occupied_beds: actualOccupied
        });
        actions.push(`House "${house.name}" occupied_beds recalculated → ${actualOccupied}`);
      }
    }

    // ── STEP 6: Archive open ServiceTasks → mark as "blocked" ────────────────
    const openTasks = await base44.asServiceRole.entities.ServiceTask.filter({
      resident_id: residentId
    });
    const tasksToArchive = openTasks.filter(t =>
      t.status !== 'completed' && t.status !== 'blocked'
    );

    for (const task of tasksToArchive) {
      await base44.asServiceRole.entities.ServiceTask.update(task.id, {
        status: 'blocked',
        notes: (task.notes ? task.notes + ' | ' : '') + `[Auto] Resident exited ${today}. Task archived.`,
      });
    }
    if (tasksToArchive.length > 0) {
      actions.push(`${tasksToArchive.length} open task(s) marked as blocked`);
    }

    // ── STEP 7: Write exit CaseNote ───────────────────────────────────────────
    // Idempotency: check for existing exit note
    const existingNotes = await base44.asServiceRole.entities.CaseNote.filter({
      resident_id: residentId,
      note_type: 'general',
    });
    const exitNoteExists = existingNotes.some(n =>
      n.description?.includes('[Auto] Resident exited')
    );

    if (!exitNoteExists) {
      await base44.asServiceRole.entities.CaseNote.create({
        global_resident_id: resident.global_resident_id,
        resident_id: residentId,
        organization_id: resident.organization_id || '',
        staff_id: 'system',
        staff_name: 'Pathways Automation',
        note_type: 'general',
        description: `[Auto] Resident exited on ${today}. ${activePlacements.length} housing placement(s) closed. ${stillOccupied.length} bed(s) released. ${tasksToArchive.length} open task(s) archived. Exit workflow complete.`,
        is_confidential: false,
      });
      actions.push(`Exit CaseNote created for ${resident.global_resident_id}`);
    } else {
      actions.push(`Exit CaseNote skipped — already exists`);
    }

    return Response.json({
      success: true,
      resident_id: residentId,
      global_resident_id: resident.global_resident_id,
      exit_date: today,
      beds_released_immediately: stillOccupied.length,
      placements_closed: activePlacements.length,
      tasks_archived: tasksToArchive.length,
      house_counts_recalculated: affectedHouseIds.size,
      no_sync_delay: true,
      actions,
    });

  } catch (error) {
    console.error('onResidentExited error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});