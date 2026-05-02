/**
 * scheduleTomorrowsTransportation
 *
 * Builds the next morning's driver schedule from approved rides.
 * Run nightly (e.g. 8pm) so drivers wake up to a ready schedule.
 *
 * Round-robin assigns rides to active drivers, updates each Ride with
 * assigned_driver_id + status='scheduled', and emails each driver their list.
 *
 * Call as:
 *   base44.functions.invoke('scheduleTomorrowsTransportation', { date: '2026-05-02' })
 *   (date defaults to tomorrow if not provided)
 *
 * Production: connect this to a scheduled cron task in Base44 Functions to run
 * automatically every night at 8pm.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Default to tomorrow's date in YYYY-MM-DD
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const targetDate = body.date || tomorrow.toISOString().split('T')[0];

    // === Fetch approved rides for target date ===
    let rides = [];
    try {
      rides = await base44.asServiceRole.entities.Ride.filter({
        pickup_date: targetDate,
        status: 'approved',
      });
    } catch (e) {
      // Ride entity may use different name in some installs
      try {
        rides = await base44.asServiceRole.entities.TransportationRequest.filter({
          pickup_date: targetDate,
          status: 'approved',
        });
      } catch (_) {
        return Response.json({
          warning: 'No Ride or TransportationRequest entity found',
          target_date: targetDate,
        });
      }
    }

    if (rides.length === 0) {
      return Response.json({
        success: true,
        target_date: targetDate,
        message: 'No approved rides for this date',
        rides: 0,
      });
    }

    // === Fetch active drivers ===
    let drivers = [];
    try {
      drivers = await base44.asServiceRole.entities.Driver.filter({ status: 'active' });
    } catch (e) {
      return Response.json({
        warning: 'Driver entity not found',
        target_date: targetDate,
      });
    }

    if (drivers.length === 0) {
      return Response.json({
        warning: 'No active drivers available',
        target_date: targetDate,
        unassigned_rides: rides.length,
      });
    }

    // === Sort rides by pickup time ===
    rides.sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''));

    // === Round-robin assign rides to drivers ===
    const driverSchedules = drivers.map(d => ({
      driver_id: d.id,
      driver_name: d.full_name || d.name || 'Driver',
      driver_email: d.email || '',
      driver_phone: d.phone || '',
      assigned_rides: [] as any[],
    }));

    const assignments = [];
    for (let i = 0; i < rides.length; i++) {
      const driver = driverSchedules[i % drivers.length];
      const ride = rides[i];

      driver.assigned_rides.push(ride);

      // Update ride with assigned driver + scheduled status
      try {
        await base44.asServiceRole.entities.Ride.update(ride.id, {
          assigned_driver_id: driver.driver_id,
          assigned_driver_name: driver.driver_name,
          status: 'scheduled',
          scheduled_at: new Date().toISOString(),
        });
      } catch (_) {
        try {
          await base44.asServiceRole.entities.TransportationRequest.update(ride.id, {
            assigned_driver_id: driver.driver_id,
            assigned_driver_name: driver.driver_name,
            status: 'scheduled',
          });
        } catch (e) {
          console.warn(`[scheduleTomorrowsTransportation] Could not update ride ${ride.id}:`, e.message);
        }
      }

      assignments.push({
        ride_id: ride.id,
        driver_id: driver.driver_id,
        driver_name: driver.driver_name,
        pickup_time: ride.pickup_time,
        pickup_address: ride.pickup_address,
        destination: ride.destination_address || ride.dropoff_address,
        rider_name: ride.rider_name || ride.resident_name,
      });
    }

    // === Notify each driver of their schedule via email + create in-app notification ===
    for (const driver of driverSchedules) {
      if (driver.assigned_rides.length === 0) continue;

      const scheduleSummary = driver.assigned_rides
        .map((r, idx) =>
          `${idx + 1}. ${r.pickup_time || '(time TBD)'} — ${r.rider_name || r.resident_name || 'Rider'}\n   Pickup: ${r.pickup_address || '(address TBD)'}\n   Drop-off: ${r.destination_address || r.dropoff_address || '(TBD)'}`
        )
        .join('\n\n');

      const subject = `Your driving schedule for ${targetDate} (${driver.assigned_rides.length} pickup${driver.assigned_rides.length === 1 ? '' : 's'})`;
      const messageBody =
        `Hi ${driver.driver_name},\n\n` +
        `Here's your driving schedule for ${targetDate}:\n\n${scheduleSummary}\n\n` +
        `Open the Transportation Hub in Pathways for full details and turn-by-turn directions.\n\nDrive safe.`;

      // Email
      if (driver.driver_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: driver.driver_email,
            subject,
            body: messageBody,
          });
        } catch (e) {
          console.warn(`[scheduleTomorrowsTransportation] Email to ${driver.driver_email} failed:`, e.message);
        }
      }

      // In-app notification
      try {
        await base44.asServiceRole.entities.Notification.create({
          recipient_user_id: driver.driver_id,
          recipient_email: driver.driver_email,
          recipient_phone: driver.driver_phone,
          recipient_name: driver.driver_name,
          channel: 'in_app',
          type: 'upcoming_appointment',
          subject,
          body: messageBody,
          link_url: '/transportation',
          sent_by: 'system',
          status: 'queued',
        });
      } catch (e) {
        console.warn(`[scheduleTomorrowsTransportation] Notification create failed:`, e.message);
      }
    }

    return Response.json({
      success: true,
      target_date: targetDate,
      total_rides: rides.length,
      total_drivers: drivers.length,
      assignments,
      driver_summary: driverSchedules
        .filter(d => d.assigned_rides.length > 0)
        .map(d => ({
          driver: d.driver_name,
          email: d.driver_email,
          rides_count: d.assigned_rides.length,
        })),
    });

  } catch (error) {
    console.error('[scheduleTomorrowsTransportation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
