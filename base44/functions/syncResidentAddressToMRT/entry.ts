/**
 * syncResidentAddressToMRT — Syncs a resident's new housing address to all open
 * TransportationRequests (MRT = Mobile/Resident Transportation).
 *
 * Fires automatically via entity automation on HousingPlacement create/update,
 * OR can be called directly after completeBedAssignment().
 *
 * Auth pattern: authenticate → authorize → validate inputs → query open rides
 *               → update pickup addresses → notify drivers (urgent/escalate)
 *               → audit log → return summary
 *
 * Allowed roles: admin, staff, case_manager, manager, program_manager
 * Required body: { resident_id, new_address, new_house_name }
 *
 * Flow:
 *   1. Authenticate caller (or service-role for automation)
 *   2. Authorize: only allowed roles
 *   3. Validate required fields
 *   4. Fetch resident (for first name in notifications)
 *   5. Query all open TransportationRequests for this resident
 *      (exclude: completed, cancelled, cancelled_client_exit)
 *   6. For each open ride:
 *      a. Capture old pickup_address
 *      b. Update pickup_address to new_address
 *      c. If pickup within 24h → notify assigned driver
 *      d. If pickup within 2h  → escalate to dispatch
 *   7. Write AuditLog (old/new address, rides updated, drivers notified)
 *   8. Return { rides_updated, driver_notifications_sent, dispatch_escalations }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'staff', 'case_manager', 'manager', 'program_manager'];
const EXCLUDED_STATUSES = ['completed', 'cancelled', 'cancelled_client_exit'];

// Build a full ISO datetime from a date string + time string (HH:MM)
function buildPickupDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const base = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const time = timeStr || '00:00';
  return new Date(`${base}T${time}:00Z`);
}

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
        { error: 'Forbidden: case_manager, staff, manager, or admin role required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { resident_id, new_address, new_house_name } = body;

    // ── 3. Validate inputs ────────────────────────────────────────────────────
    if (!resident_id)  return Response.json({ error: 'resident_id is required' }, { status: 400 });
    if (!new_address)  return Response.json({ error: 'new_address is required' }, { status: 400 });
    if (!new_house_name) return Response.json({ error: 'new_house_name is required' }, { status: 400 });

    // ── 4. Fetch resident ─────────────────────────────────────────────────────
    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }
    const residentFirstName = resident.first_name || 'Resident';
    const residentFullName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim();

    // ── 5. Query all open TransportationRequests for this resident ────────────
    const allRides = await base44.asServiceRole.entities.TransportationRequest.filter(
      { resident_id }
    );

    const openRides = allRides.filter(r => !EXCLUDED_STATUSES.includes(r.status));

    if (openRides.length === 0) {
      console.log(`[syncResidentAddressToMRT] No open rides for resident ${resident_id} — nothing to update`);
      return Response.json({
        success: true,
        rides_updated: 0,
        driver_notifications_sent: 0,
        dispatch_escalations: 0,
        message: 'No open transportation requests found for this resident',
      });
    }

    const now = new Date();
    const twoHoursMs   = 2  * 60 * 60 * 1000;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    let ridesUpdated = 0;
    let driverNotificationsSent = 0;
    let dispatchEscalations = 0;
    const notifiedDriverIds = [];
    const auditRideDetails = [];

    // ── 6. Update each open ride ──────────────────────────────────────────────
    await Promise.allSettled(openRides.map(async (ride) => {
      const oldAddress = ride.pickup_address || '(none)';

      // 6a. Update pickup_address
      await base44.asServiceRole.entities.TransportationRequest.update(ride.id, {
        pickup_address: new_address,
      });
      ridesUpdated++;

      const rideDetail = {
        ride_id: ride.id,
        old_address: oldAddress,
        new_address,
        requested_date: ride.requested_date,
        requested_time: ride.requested_time,
        driver_id: ride.assigned_driver_id || null,
        driver_name: ride.assigned_driver || null,
        notified_driver: false,
        escalated: false,
      };

      // 6b. Check pickup time proximity
      const pickupDT = buildPickupDateTime(ride.requested_date, ride.requested_time);
      const msUntilPickup = pickupDT ? pickupDT - now : null;

      const isWithin24h = msUntilPickup !== null && msUntilPickup > 0 && msUntilPickup <= twentyFourHoursMs;
      const isWithin2h  = msUntilPickup !== null && msUntilPickup > 0 && msUntilPickup <= twoHoursMs;

      // 6c. Notify assigned driver if within 24h
      if (isWithin24h && ride.assigned_driver_id) {
        let driverEmail = null;
        let driverName = ride.assigned_driver || 'Driver';
        try {
          const driver = await base44.asServiceRole.entities.Driver.get(ride.assigned_driver_id);
          if (driver) {
            driverEmail = driver.email || null;
            driverName = driver.full_name || ride.assigned_driver || 'Driver';
          }
        } catch {
          // Driver lookup failed — still attempt notification by name
        }

        if (driverEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: driverEmail,
            subject: `Pickup address updated — ${residentFirstName}`,
            body: `Pickup address updated for ${residentFirstName} — new address: ${new_address}. Please confirm you have the correct location before departure.`,
          }).catch(err => console.warn(`[syncResidentAddressToMRT] Driver email failed for ride ${ride.id}:`, err.message));
        }

        // In-app notification to driver
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: driverEmail || `driver:${ride.assigned_driver_id}`,
          recipient_name: driverName,
          type: 'custom',
          subject: `Pickup address updated — ${residentFirstName}`,
          body: `Pickup address updated for ${residentFirstName} — new address: ${new_address}. Please confirm you have the correct location before departure.`,
          sent_by: user.email || 'system',
          status: 'sent',
          resident_id: ride.assigned_driver_id,
        }).catch(err => console.warn(`[syncResidentAddressToMRT] Driver notification failed:`, err.message));

        driverNotificationsSent++;
        notifiedDriverIds.push(driverName);
        rideDetail.notified_driver = true;
      }

      // 6d. Escalate to dispatch if within 2h
      if (isWithin2h) {
        // Notify all admin/staff users with dispatch-relevant roles
        const dispatchUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
        const dispatchTargets = dispatchUsers.filter(u => ['admin', 'staff', 'manager'].includes(u.role));

        await Promise.allSettled(dispatchTargets.map(async (dispatcher) => {
          if (!dispatcher.email) return;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: dispatcher.email,
            subject: `URGENT — Pickup address changed for ride within 2 hours`,
            body: `URGENT — Pickup address changed for ride within 2 hours.\n\nResident: ${residentFullName}\nOld address: ${oldAddress}\nNew address: ${new_address}\nScheduled pickup: ${ride.requested_date} ${ride.requested_time || ''}\n\nDriver notification sent to: ${ride.assigned_driver || 'Unassigned'}. Please verify driver acknowledged.`,
          }).catch(() => {});

          await base44.asServiceRole.entities.Notification.create({
            recipient_email: dispatcher.email,
            recipient_name: dispatcher.full_name || dispatcher.email,
            type: 'alert',
            subject: `URGENT — Pickup address changed for ride within 2 hours`,
            body: `URGENT — Pickup address changed for ride within 2 hours. Resident: ${residentFullName}. New address: ${new_address}. Driver: ${ride.assigned_driver || 'Unassigned'}. Please verify driver acknowledged.`,
            sent_by: user.email || 'system',
            status: 'sent',
            resident_id: resident_id,
          }).catch(() => {});
        }));

        dispatchEscalations++;
        rideDetail.escalated = true;
      }

      auditRideDetails.push(rideDetail);
    }));

    // ── 7. Audit log ──────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'resident_address_synced_to_transportation',
      entity_type: 'TransportationRequest',
      entity_id: resident_id,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      details: JSON.stringify({
        event: 'resident_address_synced_to_mrt',
        resident_id,
        resident_name: residentFullName,
        new_address,
        new_house_name,
        rides_updated: ridesUpdated,
        driver_notifications_sent: driverNotificationsSent,
        dispatch_escalations: dispatchEscalations,
        drivers_notified: notifiedDriverIds,
        ride_details: auditRideDetails,
        triggered_by: user.email,
        triggered_at: now.toISOString(),
      }),
      severity: dispatchEscalations > 0 ? 'high' : 'info',
      organization_id: resident.organization_id || '',
    }).catch(err => console.warn('[syncResidentAddressToMRT] AuditLog write failed:', err.message));

    // ── 8. Return summary ─────────────────────────────────────────────────────
    return Response.json({
      success: true,
      rides_updated: ridesUpdated,
      driver_notifications_sent: driverNotificationsSent,
      dispatch_escalations: dispatchEscalations,
      drivers_notified: notifiedDriverIds,
      message: `Updated pickup address for ${ridesUpdated} open ride(s) for ${residentFirstName}. ${driverNotificationsSent} driver notification(s) sent. ${dispatchEscalations} dispatch escalation(s).`,
    });

  } catch (error) {
    console.error('[syncResidentAddressToMRT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});