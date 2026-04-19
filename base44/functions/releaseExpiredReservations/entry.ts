/**
 * releaseExpiredReservations — Scheduled cleanup function.
 * Finds all beds in "reserved" status whose reservation_expires_at has passed
 * and releases them back to "available".
 *
 * Intended to run every minute via a scheduled automation.
 * No user auth required — this is a system-level operation.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all reserved beds
    const reservedBeds = await base44.asServiceRole.entities.Bed.filter({ status: 'reserved' });

    if (!reservedBeds || reservedBeds.length === 0) {
      return Response.json({ success: true, released: 0, message: 'No reserved beds found' });
    }

    const now = new Date();
    const expired = reservedBeds.filter(bed => {
      if (!bed.reservation_expires_at) return true; // No expiry set — release it
      return now >= new Date(bed.reservation_expires_at);
    });

    if (expired.length === 0) {
      return Response.json({
        success: true,
        released: 0,
        checked: reservedBeds.length,
        message: 'No expired reservations found',
      });
    }

    // Release each expired bed
    const results = await Promise.allSettled(
      expired.map(async (bed) => {
        await base44.asServiceRole.entities.Bed.update(bed.id, {
          status: 'available',
          reserved_by: null,
          reserved_for: null,
          reserved_at: null,
          reservation_expires_at: null,
        });

        // Audit log each release
        await base44.asServiceRole.entities.AuditLog.create({
          action: 'bed_reservation_expired',
          entity_type: 'Bed',
          entity_id: bed.id,
          user_id: 'system',
          user_name: 'System (Scheduler)',
          user_email: 'system',
          details: `Reservation on bed "${bed.bed_label}" in "${bed.house_name}" expired (was reserved for resident ${bed.reserved_for} by ${bed.reserved_by}). Bed released back to available.`,
          severity: 'info',
          organization_id: bed.organization_id || '',
        }).catch(() => {});

        return bed.id;
      })
    );

    const released = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[releaseExpiredReservations] Released ${released} expired reservations, ${failed} failures`);

    return Response.json({
      success: true,
      released,
      failed,
      checked: reservedBeds.length,
      released_bed_ids: results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value),
    });

  } catch (error) {
    console.error('[releaseExpiredReservations] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});