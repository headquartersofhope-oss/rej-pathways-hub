/**
 * cleanExpiredReservations — Scheduled cleanup for stale bed reservation locks.
 *
 * Finds all beds in "reserved" status whose reservation_expires_at is in the past.
 * For each expired reservation:
 *   1. Sets bed status back to "available" and clears all reservation fields
 *   2. Writes an AuditLog entry
 *   3. Creates a Notification record targeted at the case manager who held the lock
 *      (frontend subscribes to Notification entity in real-time to show the toast)
 *
 * Auth: Service-role only — no user token required. This is a scheduled system task.
 * Runs every 5 minutes via scheduled automation (platform minimum interval).
 *
 * Auth pattern: service-role → validate state → action → audit log → notify
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // All operations run as service role — no user token needed for scheduled tasks
    const now = new Date();

    // ── 1. Fetch all beds currently in "reserved" status ──────────────────────
    const reservedBeds = await base44.asServiceRole.entities.Bed.filter({ status: 'reserved' });

    if (!reservedBeds || reservedBeds.length === 0) {
      console.log('[cleanExpiredReservations] No reserved beds found — nothing to clean');
      return Response.json({ success: true, released: 0, checked: 0, message: 'No reserved beds' });
    }

    // ── 2. Filter to only expired reservations ────────────────────────────────
    const expired = reservedBeds.filter(bed => {
      if (!bed.reservation_expires_at) return true; // No expiry set — treat as expired
      return now >= new Date(bed.reservation_expires_at);
    });

    if (expired.length === 0) {
      console.log(`[cleanExpiredReservations] Checked ${reservedBeds.length} reservations — none expired`);
      return Response.json({
        success: true,
        released: 0,
        checked: reservedBeds.length,
        message: 'No expired reservations',
      });
    }

    console.log(`[cleanExpiredReservations] Found ${expired.length} expired reservation(s) to release`);

    // ── 3. Release each expired bed ───────────────────────────────────────────
    const results = await Promise.allSettled(
      expired.map(async (bed) => {
        const caseManagerId = bed.reserved_by;
        const residentId = bed.reserved_for;
        const expiredAt = bed.reservation_expires_at || now.toISOString();

        // 3a. Release bed back to available, clear all reservation fields
        await base44.asServiceRole.entities.Bed.update(bed.id, {
          status: 'available',
          reserved_by: null,
          reserved_for: null,
          reserved_at: null,
          reservation_expires_at: null,
        });

        // 3b. Audit log
        await base44.asServiceRole.entities.AuditLog.create({
          action: 'bed_reservation_expired',
          entity_type: 'Bed',
          entity_id: bed.id,
          user_id: 'system',
          user_name: 'System (Scheduler)',
          user_email: 'system',
          details: `Reservation on bed "${bed.bed_label}" in "${bed.house_name}" expired at ${expiredAt}. Was reserved by case_manager ${caseManagerId} for resident ${residentId}. Bed released to available.`,
          severity: 'info',
          organization_id: bed.organization_id || '',
        }).catch(err => console.warn(`[cleanExpiredReservations] AuditLog failed for bed ${bed.id}:`, err.message));

        // 3c. Create in-app Notification for the case manager who held the lock.
        //     The frontend subscribes to Notification entity in real-time and surfaces
        //     this as a toast: "Your bed reservation expired — please select the bed again."
        if (caseManagerId) {
          // Look up the case manager's email so the notification is addressable
          let caseManagerEmail = 'unknown';
          let caseManagerName = 'Case Manager';
          try {
            const cmUser = await base44.asServiceRole.entities.User.get(caseManagerId);
            if (cmUser) {
              caseManagerEmail = cmUser.email || 'unknown';
              caseManagerName = cmUser.full_name || cmUser.email || 'Case Manager';
            }
          } catch {
            // User lookup failed — still create the notification with the ID
            caseManagerEmail = `user:${caseManagerId}`;
          }

          await base44.asServiceRole.entities.Notification.create({
            recipient_email: caseManagerEmail,
            recipient_name: caseManagerName,
            type: 'custom',
            subject: 'Bed reservation expired',
            body: `Your reservation for bed "${bed.bed_label}" in ${bed.house_name} has expired. Please return to the Housing Assignment screen and select the bed again to complete the placement.`,
            sent_by: 'system',
            status: 'sent',
            // Store the case manager's user ID in resident_id field as a targeting key
            // (Notification entity doesn't have a user_id field — using resident_id as proxy
            //  so the frontend can filter: Notification.filter({ resident_id: currentUser.id }))
            resident_id: caseManagerId,
          }).catch(err => console.warn(`[cleanExpiredReservations] Notification failed for ${caseManagerId}:`, err.message));
        }

        return { bed_id: bed.id, bed_label: bed.bed_label, case_manager_id: caseManagerId };
      })
    );

    const released = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    console.log(`[cleanExpiredReservations] Released ${released.length}, failed ${failed.length}`);

    return Response.json({
      success: true,
      released: released.length,
      failed: failed.length,
      checked: reservedBeds.length,
      released_beds: released.map(r => r.value),
    });

  } catch (error) {
    console.error('[cleanExpiredReservations] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});