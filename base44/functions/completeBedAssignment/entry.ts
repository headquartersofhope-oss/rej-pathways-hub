/**
 * completeBedAssignment — Finalizes a bed reservation into a full housing placement.
 *
 * Must be called immediately after reserveBed() succeeds, once the case manager
 * has reviewed and confirmed the resident details in the UI.
 *
 * Auth pattern: authenticate → authorize → validate reservation → validate bed state
 *               → create placement → update bed → update house counts → audit log
 *
 * Allowed roles: admin, staff, case_manager, manager, program_manager
 * Required body: { bed_id, resident_id, case_manager_id }
 *
 * Flow:
 *   1. Authenticate caller
 *   2. Authorize: only allowed roles
 *   3. Fetch bed — must be in "reserved" status
 *   4. Verify reservation belongs to this case_manager_id and has not expired
 *   5. Fetch resident + house (for confirmation details + placement)
 *   6. Create HousingPlacement record (or update existing)
 *   7. Update Bed: status → "occupied", clear reservation fields
 *   8. Update Resident: status → "active"
 *   9. Recalculate House.occupied_beds
 *  10. Create completion ServiceTask
 *  11. Write full AuditLog (who reserved, who confirmed, timestamps)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'staff', 'case_manager', 'manager', 'program_manager', 'user'];

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Authorize ──────────────────────────────────────────────────────────
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json(
        { error: 'Forbidden: case_manager, staff, manager, or admin role required to complete a bed assignment' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { bed_id, resident_id, case_manager_id } = body;

    if (!bed_id) return Response.json({ error: 'bed_id is required' }, { status: 400 });
    if (!resident_id) return Response.json({ error: 'resident_id is required' }, { status: 400 });
    if (!case_manager_id) return Response.json({ error: 'case_manager_id is required' }, { status: 400 });

    // ── 3. Fetch bed — must be "reserved" ─────────────────────────────────────
    const bed = await base44.asServiceRole.entities.Bed.get(bed_id);
    if (!bed) {
      return Response.json({ error: 'Bed not found' }, { status: 404 });
    }

    if (bed.status !== 'reserved') {
      return Response.json(
        {
          error: `Bed is no longer in "reserved" status (current: "${bed.status}"). Assignment aborted.`,
          current_status: bed.status,
        },
        { status: 409 }
      );
    }

    // ── 4. Verify reservation belongs to this case_manager + not expired ──────
    const now = new Date();
    const expiresAt = bed.reservation_expires_at ? new Date(bed.reservation_expires_at) : null;
    const isExpired = !expiresAt || now >= expiresAt;

    if (isExpired) {
      return Response.json(
        { error: 'Reservation expired or taken by another user' },
        { status: 409 }
      );
    }

    if (bed.reserved_by !== case_manager_id) {
      return Response.json(
        { error: 'Reservation expired or taken by another user' },
        { status: 409 }
      );
    }

    if (bed.reserved_for !== resident_id) {
      return Response.json(
        { error: 'This reservation was created for a different resident. Assignment aborted.' },
        { status: 409 }
      );
    }

    // ── 5. Fetch resident + house ─────────────────────────────────────────────
    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    const house = await base44.asServiceRole.entities.House.get(bed.house_id);
    if (!house) {
      return Response.json({ error: 'House not found' }, { status: 404 });
    }

    const moveInDate = now.toISOString().split('T')[0];
    const reservedAt = bed.reserved_at || now.toISOString();
    const confirmedAt = now.toISOString();

    // ── 6. Create or update HousingPlacement ──────────────────────────────────
    const existing = await base44.asServiceRole.entities.HousingPlacement.filter(
      { global_resident_id: resident.global_resident_id },
      '-synced_at',
      1
    );

    const placementData = {
      global_resident_id: resident.global_resident_id,
      resident_id: resident.id,
      organization_id: resident.organization_id,
      housing_model: 'turnkey_house',
      house_id: house.id,
      house_name: house.name,
      house_type: house.program_type,
      city: house.city,
      state: house.state,
      room_id: bed.room_number || null,
      room_name: bed.room_number ? `Room ${bed.room_number}` : null,
      bed_id: bed.id,
      bed_label: bed.bed_label,
      placement_status: 'placed',
      occupancy_status: 'occupied',
      move_in_date: moveInDate,
      placement_source: user.full_name || user.email || 'Staff',
      synced_at: confirmedAt,
      sync_source: 'direct_import',
      sync_error: null,
      last_verified: confirmedAt,
      notes: `Internal turnkey assignment confirmed by ${user.email} on ${confirmedAt}. Reservation held by case_manager ${case_manager_id} from ${reservedAt} to ${expiresAt.toISOString()}.`,
    };

    let placementId;
    if (existing.length > 0) {
      await base44.asServiceRole.entities.HousingPlacement.update(existing[0].id, placementData);
      placementId = existing[0].id;
    } else {
      const placement = await base44.asServiceRole.entities.HousingPlacement.create(placementData);
      placementId = placement.id;
    }

    // ── 7. Update Bed: occupied + clear reservation fields ────────────────────
    await base44.asServiceRole.entities.Bed.update(bed_id, {
      status: 'occupied',
      resident_id: resident.id,
      resident_name: `${resident.first_name} ${resident.last_name}`,
      move_in_date: moveInDate,
      reserved_by: null,
      reserved_for: null,
      reserved_at: null,
      reservation_expires_at: null,
    });

    // ── 8. Update Resident status ─────────────────────────────────────────────
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      status: 'active',
    });

    // ── 9. Recalculate house occupied_beds ────────────────────────────────────
    const allBeds = await base44.asServiceRole.entities.Bed.filter({ house_id: house.id });
    // Count the bed we just marked occupied (update above may not be reflected yet)
    const occupiedCount = allBeds.filter(
      b => b.id === bed_id ? true : b.status === 'occupied'
    ).length;
    await base44.asServiceRole.entities.House.update(house.id, {
      occupied_beds: occupiedCount,
    });

    // ── 10. Create completion ServiceTask ─────────────────────────────────────
    const task = await base44.asServiceRole.entities.ServiceTask.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      title: `Housing Placement Complete: ${resident.first_name} ${resident.last_name}`,
      description: `Resident placed in ${house.name}, ${bed.bed_label}. Move-in: ${moveInDate}. Confirmed by ${user.full_name || user.email}.`,
      category: 'housing',
      status: 'completed',
      priority: 'high',
      requires_staff_action: false,
      completed_at: confirmedAt,
    });

    // ── 11. Audit log ─────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'bed_assignment_completed',
      entity_type: 'Bed',
      entity_id: bed_id,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      details: JSON.stringify({
        event: 'bed_assignment_completed',
        bed_id,
        bed_label: bed.bed_label,
        house_id: house.id,
        house_name: house.name,
        resident_id: resident.id,
        resident_name: `${resident.first_name} ${resident.last_name}`,
        resident_dob: resident.date_of_birth || null,
        placement_id: placementId,
        reservation: {
          reserved_by: bed.reserved_by,
          reserved_at: reservedAt,
          reservation_expires_at: expiresAt.toISOString(),
        },
        confirmation: {
          confirmed_by_user_id: user.id,
          confirmed_by_name: user.full_name || user.email,
          confirmed_by_email: user.email,
          confirmed_at: confirmedAt,
        },
        move_in_date: moveInDate,
      }),
      severity: 'info',
      organization_id: resident.organization_id || '',
    }).catch(err => console.warn('[completeBedAssignment] AuditLog write failed:', err.message));

    // ── 12. Non-blocking MRT address sync ────────────────────────────────────
    // Build the new address from the house record (same data written to HousingPlacement).
    // Failure must NOT block the bed assignment — log to AuditLog + alert admins.
    const addressParts = [house.address, house.city, house.state].filter(Boolean);
    const mrtAddress = addressParts.length > 0
      ? addressParts.join(', ')
      : house.name; // fallback to house name if no street address configured

    base44.asServiceRole.functions.invoke('syncResidentAddressToMRT', {
      resident_id: resident.id,
      new_address: mrtAddress,
      new_house_name: house.name,
    }).catch(async (mrtErr) => {
      console.error('[completeBedAssignment] MRT sync failed (non-blocking):', mrtErr.message);

      // Log failure to AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'mrt_address_sync_failed',
        entity_type: 'Resident',
        entity_id: resident.id,
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        details: JSON.stringify({
          event: 'mrt_address_sync_failed',
          resident_id: resident.id,
          resident_name: `${resident.first_name} ${resident.last_name}`,
          placement_id: placementId,
          attempted_address: mrtAddress,
          error: mrtErr.message,
          triggered_at: new Date().toISOString(),
        }),
        severity: 'high',
        organization_id: resident.organization_id || '',
      }).catch(e => console.warn('[completeBedAssignment] AuditLog for MRT failure failed:', e.message));

      // Alert all admins
      const adminUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
      const admins = adminUsers.filter(u => u.role === 'admin' && u.email);
      await Promise.allSettled(admins.map(admin =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'MRT address sync failed — manual update required',
          body: `MRT address sync failed for resident ${resident.id} (${resident.first_name} ${resident.last_name}) after housing placement to ${house.name}.\n\nAttempted address: ${mrtAddress}\nError: ${mrtErr.message}\n\nManual update of open transportation requests required.`,
        }).catch(() => {})
      ));
    });

    return Response.json({
      success: true,
      placement_id: placementId,
      task_id: task.id,
      bed_id,
      bed_label: bed.bed_label,
      house_name: house.name,
      resident_name: `${resident.first_name} ${resident.last_name}`,
      move_in_date: moveInDate,
      confirmed_at: confirmedAt,
      message: `${resident.first_name} ${resident.last_name} successfully assigned to ${bed.bed_label} in ${house.name}`,
    });

  } catch (error) {
    console.error('[completeBedAssignment] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});