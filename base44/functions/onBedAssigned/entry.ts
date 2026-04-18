import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * onBedAssigned
 * =============
 * Triggered by automation when a HousingPlacement record is CREATED.
 *
 * Responsibilities:
 *   1. Validate the placement is a "placed" turnkey_house record with a bed reference
 *   2. Idempotency: check if the target Bed is already occupied by this resident — skip if so
 *   3. Find the target Bed by bed_id (preferred) or by bed_label + house_id fallback
 *   4. Update Bed → status: occupied, resident_id, resident_name, move_in_date
 *   5. Recalculate and update House.occupied_beds from actual Bed records (no manual counter)
 *   6. Write a CaseNote to the resident's record confirming housing assignment
 *   7. Backfill placement.bed_id if it was null (legacy gap fix)
 *
 * Idempotency key: Bed.resident_id === placement.resident_id AND Bed.status === 'occupied'
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // Support both automation payload shape and direct test payload
    const placementId = payload?.event?.entity_id || payload?.placement_id;
    const placementData = payload?.data || null;

    if (!placementId) {
      return Response.json({ error: 'Missing placement_id or event.entity_id' }, { status: 400 });
    }

    // Load the placement (use passed data if available, otherwise fetch)
    const placement = placementData || await base44.asServiceRole.entities.HousingPlacement.get(placementId);

    if (!placement) {
      return Response.json({ error: `HousingPlacement ${placementId} not found` }, { status: 404 });
    }

    // Only process turnkey_house placements with status "placed"
    if (placement.placement_status !== 'placed') {
      return Response.json({
        skipped: true,
        reason: `placement_status is "${placement.placement_status}", not "placed" — no bed action needed`
      });
    }

    if (placement.housing_model !== 'turnkey_house') {
      return Response.json({
        skipped: true,
        reason: `housing_model is "${placement.housing_model}" — only turnkey_house beds are managed internally`
      });
    }

    if (!placement.house_id) {
      return Response.json({ error: 'Placement missing house_id — cannot locate bed' }, { status: 400 });
    }

    const actions = [];

    // ── STEP 1: Find the target Bed ──────────────────────────────────────────
    let targetBed = null;

    // Preferred path: use bed_id FK if it exists
    if (placement.bed_id) {
      targetBed = await base44.asServiceRole.entities.Bed.get(placement.bed_id).catch(() => null);
    }

    // Fallback path: find by bed_label within the same house
    if (!targetBed && placement.bed_label && placement.house_id) {
      const houseBeds = await base44.asServiceRole.entities.Bed.filter({
        house_id: placement.house_id
      });
      targetBed = houseBeds.find(b =>
        b.bed_label === placement.bed_label ||
        b.bed_label === placement.room_id
      ) || null;
    }

    if (!targetBed) {
      return Response.json({
        error: `Could not find Bed record for placement ${placementId}. bed_id=${placement.bed_id}, bed_label=${placement.bed_label}, house_id=${placement.house_id}`
      }, { status: 404 });
    }

    // ── STEP 2: Idempotency check ────────────────────────────────────────────
    if (
      targetBed.status === 'occupied' &&
      targetBed.resident_id === placement.resident_id
    ) {
      return Response.json({
        skipped: true,
        reason: `Bed "${targetBed.bed_label}" is already occupied by this resident — no duplicate action taken`,
        bed_id: targetBed.id
      });
    }

    // ── STEP 3: Update the Bed record ────────────────────────────────────────
    await base44.asServiceRole.entities.Bed.update(targetBed.id, {
      status: 'occupied',
      resident_id: placement.resident_id,
      resident_name: placement.resident_name || '',
      move_in_date: placement.move_in_date || new Date().toISOString().split('T')[0],
      expected_move_out_date: placement.expected_move_out_date || null,
      actual_move_out_date: null,
    });
    actions.push(`Bed "${targetBed.bed_label}" → status: occupied, resident: ${placement.global_resident_id}`);

    // ── STEP 4: Backfill placement.bed_id if null ────────────────────────────
    if (!placement.bed_id && targetBed.id) {
      await base44.asServiceRole.entities.HousingPlacement.update(placementId, {
        bed_id: targetBed.id,
        last_verified: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      });
      actions.push(`Backfilled HousingPlacement.bed_id = ${targetBed.id}`);
    }

    // ── STEP 5: Recalculate House.occupied_beds from actual Bed records ──────
    const allHouseBeds = await base44.asServiceRole.entities.Bed.filter({
      house_id: placement.house_id
    });
    const actualOccupied = allHouseBeds.filter(b =>
      b.id === targetBed.id ? true : b.status === 'occupied'
    ).length;

    await base44.asServiceRole.entities.House.update(placement.house_id, {
      occupied_beds: actualOccupied
    });
    actions.push(`House "${placement.house_name}" occupied_beds recalculated → ${actualOccupied}`);

    // ── STEP 6: Write CaseNote for audit trail ───────────────────────────────
    if (placement.resident_id && placement.global_resident_id) {
      // Idempotency: check for existing housing assignment note on this date
      const existingNotes = await base44.asServiceRole.entities.CaseNote.filter({
        resident_id: placement.resident_id,
        note_type: 'housing',
      });
      const alreadyLogged = existingNotes.some(n =>
        n.description?.includes(targetBed.bed_label) &&
        n.description?.includes('bed assigned')
      );

      if (!alreadyLogged) {
        await base44.asServiceRole.entities.CaseNote.create({
          global_resident_id: placement.global_resident_id,
          resident_id: placement.resident_id,
          organization_id: placement.organization_id || '',
          staff_id: 'system',
          staff_name: 'Pathways Automation',
          note_type: 'housing',
          description: `[Auto] Housing bed assigned: ${targetBed.bed_label} at ${placement.house_name}. Move-in: ${placement.move_in_date || 'TBD'}. Expected exit: ${placement.expected_move_out_date || 'TBD'}.`,
          is_confidential: false,
        });
        actions.push(`CaseNote created for ${placement.global_resident_id}`);
      } else {
        actions.push(`CaseNote skipped — already logged for this bed assignment`);
      }
    }

    return Response.json({
      success: true,
      placement_id: placementId,
      global_resident_id: placement.global_resident_id,
      bed_id: targetBed.id,
      bed_label: targetBed.bed_label,
      house_name: placement.house_name,
      actions,
    });

  } catch (error) {
    console.error('onBedAssigned error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});