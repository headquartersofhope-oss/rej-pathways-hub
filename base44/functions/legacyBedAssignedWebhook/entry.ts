import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * legacyBedAssignedWebhook
 * Publicly callable endpoint — secured by LEGACY_WEBHOOK_SECRET shared key.
 * Called by Legacy Properties when a bed is assigned to a referred resident.
 * 
 * Payload: { external_referral_id, house_name, room_name, bed_label, move_in_date, provider_notes, legacy_secret }
 */
Deno.serve(async (req) => {
  const log = [];
  const error_log = [];

  try {
    // ── 1. Parse payload ──────────────────────────────────────────────────────
    let payload;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const {
      external_referral_id,
      house_name,
      room_name,
      bed_label,
      move_in_date,
      provider_notes,
      legacy_secret
    } = payload;

    // ── 2. Validate shared secret ─────────────────────────────────────────────
    const EXPECTED_SECRET = Deno.env.get('LEGACY_WEBHOOK_SECRET');
    if (!EXPECTED_SECRET || legacy_secret !== EXPECTED_SECRET) {
      console.warn('[LEGACY_WEBHOOK] Unauthorized attempt — invalid secret');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 3. Validate required fields ───────────────────────────────────────────
    if (!external_referral_id) {
      return Response.json({ error: 'external_referral_id is required' }, { status: 400 });
    }
    if (!house_name || !bed_label) {
      return Response.json({ error: 'house_name and bed_label are required' }, { status: 400 });
    }

    console.log('[LEGACY_WEBHOOK] Received bed assignment for external_referral_id:', external_referral_id);
    log.push(`Received webhook for external_referral_id: ${external_referral_id}`);

    // ── 4. Init service-role client (no user session on public webhook) ───────
    const base44 = createClientFromRequest(req);

    // ── 5. Look up HousingReferral by external_referral_id ───────────────────
    const allReferrals = await base44.asServiceRole.entities.HousingReferral.filter({
      external_referral_id
    });

    if (!allReferrals || allReferrals.length === 0) {
      console.warn('[LEGACY_WEBHOOK] HousingReferral not found for:', external_referral_id);
      return Response.json({
        error: 'HousingReferral not found',
        external_referral_id
      }, { status: 404 });
    }

    const referral = allReferrals[0];
    const { resident_id, global_resident_id, organization_id } = referral;
    log.push(`Found HousingReferral: ${referral.id} for resident: ${resident_id}`);

    // ── 6. Fetch resident ─────────────────────────────────────────────────────
    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) {
      return Response.json({ error: 'Resident not found', resident_id }, { status: 404 });
    }
    log.push(`Found Resident: ${resident.first_name} ${resident.last_name}`);

    const today = new Date().toISOString().split('T')[0];
    const nowISO = new Date().toISOString();

    // ── 7. Update HousingReferral ─────────────────────────────────────────────
    const providerNotesSnapshot = JSON.stringify({
      assigned_house_name: house_name,
      assigned_room_name: room_name || null,
      assigned_bed_label: bed_label,
      move_in_date: move_in_date || today,
      bed_assigned_at: nowISO,
      provider_notes: provider_notes || null
    });

    await base44.asServiceRole.entities.HousingReferral.update(referral.id, {
      status: 'approved',
      housing_decision_status: 'placed',
      decision_date: today,
      provider_notes: providerNotesSnapshot
    });
    log.push(`HousingReferral ${referral.id} updated → status: approved, housing_decision_status: placed`);

    // ── 8. Create HousingPlacement ────────────────────────────────────────────
    // Try to find matching internal House record by name; fall back to external ID
    let resolvedHouseId = `LEGACY-${house_name.replace(/\s+/g, '-').toUpperCase()}`;
    try {
      const matchingHouses = await base44.asServiceRole.entities.House.filter({ name: house_name });
      if (matchingHouses && matchingHouses.length > 0) {
        resolvedHouseId = matchingHouses[0].id;
        log.push(`Matched internal House record: ${resolvedHouseId}`);
      } else {
        log.push(`No internal House match for "${house_name}" — using external ID: ${resolvedHouseId}`);
      }
    } catch (e) {
      log.push(`House lookup failed, using external ID: ${resolvedHouseId}`);
    }

    const placement = await base44.asServiceRole.entities.HousingPlacement.create({
      resident_id,
      global_resident_id,
      organization_id,
      referral_id: referral.id,
      house_id: resolvedHouseId,
      house_name,
      room_name: room_name || null,
      bed_label,
      move_in_date: move_in_date || today,
      placement_status: 'placed',
      occupancy_status: 'occupied',
      housing_model: 'per_bed',
      sync_source: 'webhook',
      synced_at: nowISO
    });
    log.push(`HousingPlacement created: ${placement.id}`);

    // ── 9. Update Resident status ─────────────────────────────────────────────
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      status: 'housing_pending'
    });
    log.push(`Resident ${resident_id} status updated → housing_pending`);

    // ── 10. Create CaseNote ───────────────────────────────────────────────────
    const caseNoteContent = `Bed assigned by Legacy Properties — ${house_name}${room_name ? ' ' + room_name : ''} ${bed_label} as of ${move_in_date || today}. Placement confirmed via webhook.`;

    const caseNote = await base44.asServiceRole.entities.CaseNote.create({
      resident_id,
      global_resident_id,
      organization_id,
      note_type: 'housing',
      description: caseNoteContent,
      staff_name: 'Legacy Properties (Automated)',
      is_confidential: false
    });
    log.push(`CaseNote created: ${caseNote.id}`);

    // ── 11. Audit Log ─────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'legacy_bed_assigned_webhook',
      entity_type: 'HousingReferral',
      entity_id: referral.id,
      user_name: 'Legacy Properties Webhook',
      details: `Bed assigned via Legacy Properties webhook. external_referral_id: ${external_referral_id}. House: ${house_name}, Bed: ${bed_label}. Resident: ${resident.first_name} ${resident.last_name} (${resident_id}). Placement ID: ${placement.id}`,
      severity: 'info'
    }).catch(e => console.warn('[LEGACY_WEBHOOK] Audit log failed:', e.message));
    log.push('AuditLog entry written');

    console.log('[LEGACY_WEBHOOK] Completed successfully for:', external_referral_id);

    return Response.json({
      success: true,
      external_referral_id,
      referral_id: referral.id,
      placement_id: placement.id,
      case_note_id: caseNote.id,
      resident_id,
      summary: {
        resident_name: `${resident.first_name} ${resident.last_name}`,
        house_name,
        room_name: room_name || null,
        bed_label,
        move_in_date: move_in_date || today,
        referral_status: 'approved',
        resident_status: 'housing_pending'
      },
      log
    });

  } catch (error) {
    console.error('[LEGACY_WEBHOOK] Fatal error:', error.message, error.stack);
    error_log.push(error.message);
    return Response.json({
      success: false,
      error: error.message,
      log,
      error_log
    }, { status: 500 });
  }
});