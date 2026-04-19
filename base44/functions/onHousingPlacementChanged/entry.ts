/**
 * onHousingPlacementChanged — Entity automation handler.
 *
 * Fires on HousingPlacement create or update.
 * When a resident gets a new or updated placement with a house address,
 * invokes syncResidentAddressToMRT as service role to propagate the new
 * address to all open TransportationRequests for that resident.
 *
 * Auth: service-role (no user token — triggered by entity automation)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    if (!data) {
      return Response.json({ success: true, skipped: true, reason: 'No placement data in payload' });
    }

    const resident_id = data.resident_id;
    const house_name  = data.house_name;

    if (!resident_id || !house_name) {
      return Response.json({ success: true, skipped: true, reason: 'Missing resident_id or house_name' });
    }

    // Resolve the house address from the House entity if we have a house_id
    let new_address = null;
    if (data.house_id) {
      try {
        const house = await base44.asServiceRole.entities.House.get(data.house_id);
        if (house && house.address) {
          const parts = [house.address, house.city, house.state].filter(Boolean);
          new_address = parts.join(', ');
        }
      } catch {
        // House lookup failed — skip sync rather than error
      }
    }

    if (!new_address) {
      console.log(`[onHousingPlacementChanged] No resolvable address for house_id ${data.house_id} — skipping MRT sync`);
      return Response.json({ success: true, skipped: true, reason: 'No resolvable house address' });
    }

    console.log(`[onHousingPlacementChanged] Triggering MRT sync for resident ${resident_id} → ${new_address}`);

    const result = await base44.asServiceRole.functions.invoke('syncResidentAddressToMRT', {
      resident_id,
      new_address,
      new_house_name: house_name,
    });

    return Response.json({
      success: true,
      event_type: event?.type,
      resident_id,
      new_address,
      mrt_sync: result,
    });

  } catch (error) {
    console.error('[onHousingPlacementChanged] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});