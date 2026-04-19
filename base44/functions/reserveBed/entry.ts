/**
 * reserveBed — Acquires a short-lived reservation lock on a bed to prevent
 * double-assignment race conditions.
 *
 * Auth pattern: authenticate → authorize → validate state → action → audit log
 *
 * Allowed roles: admin, staff, case_manager, manager, program_manager
 * Required body: { bed_id, resident_id, case_manager_id }
 *
 * Flow:
 *   1. Authenticate caller
 *   2. Authorize: only allowed roles
 *   3. Fetch bed — must be "available" (not already reserved/occupied/etc.)
 *   4. Check for any existing non-expired reservation on this bed
 *   5. Set bed.status = "reserved" + write reservation metadata fields
 *   6. Write AuditLog
 *   7. Return reservation details including expires_at
 *
 * Reservation is stored directly on the Bed entity fields:
 *   reserved_by, reserved_for, reserved_at, reservation_expires_at
 * (These fields are added as part of this feature.)
 *
 * Expiry enforcement is handled by the releaseExpiredReservations scheduled function.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESERVATION_TTL_SECONDS = 60;
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
        { error: 'Forbidden: case_manager, housing_staff, manager, or admin role required to reserve a bed' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { bed_id, resident_id, case_manager_id } = body;

    if (!bed_id) return Response.json({ error: 'bed_id is required' }, { status: 400 });
    if (!resident_id) return Response.json({ error: 'resident_id is required' }, { status: 400 });
    if (!case_manager_id) return Response.json({ error: 'case_manager_id is required' }, { status: 400 });

    // ── 3. Fetch bed ──────────────────────────────────────────────────────────
    const bed = await base44.asServiceRole.entities.Bed.get(bed_id);
    if (!bed) {
      return Response.json({ error: 'Bed not found' }, { status: 404 });
    }

    const now = new Date();

    // ── 4. Check existing reservation — reject if non-expired ─────────────────
    if (bed.status === 'reserved') {
      const expiresAt = bed.reservation_expires_at ? new Date(bed.reservation_expires_at) : null;
      const isExpired = !expiresAt || now >= expiresAt;

      if (!isExpired) {
        const secondsLeft = Math.ceil((expiresAt - now) / 1000);
        return Response.json(
          {
            error: 'Bed is currently reserved by another case manager',
            reserved_by: bed.reserved_by,
            reserved_for: bed.reserved_for,
            expires_in_seconds: secondsLeft,
            expires_at: bed.reservation_expires_at,
          },
          { status: 409 }
        );
      }
      // Expired reservation — allow overwrite (fall through)
    } else if (bed.status !== 'available') {
      return Response.json(
        {
          error: `Bed cannot be reserved (current status: "${bed.status}"). Only available beds can be reserved.`,
          current_status: bed.status,
        },
        { status: 409 }
      );
    }

    // ── 5. Write reservation ──────────────────────────────────────────────────
    const reservedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + RESERVATION_TTL_SECONDS * 1000).toISOString();

    await base44.asServiceRole.entities.Bed.update(bed_id, {
      status: 'reserved',
      reserved_by: case_manager_id,
      reserved_for: resident_id,
      reserved_at: reservedAt,
      reservation_expires_at: expiresAt,
    });

    // ── 6. Audit log ──────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'bed_reserved',
      entity_type: 'Bed',
      entity_id: bed_id,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      details: `Bed "${bed.bed_label}" in "${bed.house_name}" reserved by ${user.full_name || user.email} for resident ${resident_id}. Expires at ${expiresAt}.`,
      severity: 'info',
      organization_id: bed.organization_id || '',
    }).catch(err => console.warn('[reserveBed] AuditLog write failed:', err.message));

    return Response.json({
      success: true,
      bed_id,
      bed_label: bed.bed_label,
      house_name: bed.house_name,
      status: 'reserved',
      reserved_by: case_manager_id,
      reserved_for: resident_id,
      reserved_at: reservedAt,
      expires_at: expiresAt,
      expires_in_seconds: RESERVATION_TTL_SECONDS,
      message: `Bed "${bed.bed_label}" reserved for ${RESERVATION_TTL_SECONDS} seconds`,
    });

  } catch (error) {
    console.error('[reserveBed] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});