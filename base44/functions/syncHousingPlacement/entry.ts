import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * syncHousingPlacement: Pull latest placement data from Housing App
 * 
 * Triggers on:
 * - Manual re-sync button click
 * - Hourly scheduled job (Phase 2)
 * - Webhook from Housing App (Phase 2)
 * 
 * Pulls only placement/occupancy data—NO financial/lease data
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resident_id, global_resident_id, external_placement_id } = await req.json();

    if (!global_resident_id && !resident_id && !external_placement_id) {
      return Response.json(
        { error: 'Must provide resident_id, global_resident_id, or external_placement_id' },
        { status: 400 }
      );
    }

    // STEP 1: Find existing placement in Pathway
    let existingPlacement = null;
    if (external_placement_id) {
      const results = await base44.entities.HousingPlacement.filter({
        external_placement_id
      });
      if (results.length > 0) existingPlacement = results[0];
    } else if (global_resident_id) {
      const results = await base44.entities.HousingPlacement.filter({
        global_resident_id
      }, '-synced_at', 1);
      if (results.length > 0) existingPlacement = results[0];
    }

    // STEP 2: Fetch from Housing App API
    const envKeys = Deno.env.toObject();
    const housingAppUrl = envKeys['HOUSING_APP_API_URL'] || 'https://housing.nonprofit.org/api';
    const housingAppKey = envKeys['HOUSING_APP_API_KEY'];

    if (!housingAppKey) {
      console.warn('HOUSING_APP_API_KEY not set; sync skipped');
      return Response.json({
        success: false,
        message: 'Housing App API not configured',
        placement: existingPlacement
      });
    }

    let housingAppPlacement = null;
    try {
      const endpoint = external_placement_id
        ? `${housingAppUrl}/placements/${external_placement_id}`
        : `${housingAppUrl}/residents/${global_resident_id}/current-placement`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${housingAppKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No placement in Housing App
          return Response.json({
            success: true,
            message: 'No active placement in Housing App',
            placement: existingPlacement
          });
        }
        throw new Error(`Housing App returned ${response.status}`);
      }

      housingAppPlacement = await response.json();
    } catch (error) {
      console.error('Housing App API call failed:', error.message);
      
      // Update existing placement with error
      if (existingPlacement) {
        await base44.entities.HousingPlacement.update(existingPlacement.id, {
          sync_error: `Failed to fetch from Housing App: ${error.message}`,
          last_verified: new Date().toISOString()
        });
      }
      
      return Response.json({
        success: false,
        error: error.message,
        placement: existingPlacement
      }, { status: 500 });
    }

    // STEP 3: Validate Housing App data
    if (!housingAppPlacement.house_id || !housingAppPlacement.global_resident_id) {
      return Response.json(
        { error: 'Invalid Housing App placement data' },
        { status: 400 }
      );
    }

    // STEP 4: Transform Housing App data to Pathway schema
    const placementData = {
      global_resident_id: housingAppPlacement.global_resident_id,
      resident_id: existingPlacement?.resident_id || resident_id,
      organization_id: existingPlacement?.organization_id,
      external_placement_id: housingAppPlacement.id,
      housing_model: housingAppPlacement.housing_model || 'per_bed',
      house_id: housingAppPlacement.house_id,
      house_name: housingAppPlacement.house_name,
      house_type: housingAppPlacement.house_type,
      city: housingAppPlacement.city,
      state: housingAppPlacement.state,
      room_id: housingAppPlacement.room_id || null,
      room_name: housingAppPlacement.room_name || null,
      bed_id: housingAppPlacement.bed_id || null,
      bed_label: housingAppPlacement.bed_label || null,
      placement_status: mapHousingAppStatus(housingAppPlacement.status),
      occupancy_status: housingAppPlacement.occupancy_status || 'occupied',
      move_in_date: housingAppPlacement.move_in_date,
      expected_move_out_date: housingAppPlacement.expected_move_out_date,
      actual_move_out_date: housingAppPlacement.actual_move_out_date,
      referral_status: mapReferralStatus(housingAppPlacement.referral_status),
      open_for_referrals: housingAppPlacement.open_for_referrals !== false,
      can_accept_referral: housingAppPlacement.can_accept_referral !== false,
      placement_source: housingAppPlacement.placement_source,
      synced_at: new Date().toISOString(),
      sync_source: 'webhook',
      sync_error: null,
      last_verified: new Date().toISOString()
    };

    // STEP 5: Create or update placement record
    let resultPlacement;
    if (existingPlacement) {
      // Update existing
      resultPlacement = await base44.entities.HousingPlacement.update(
        existingPlacement.id,
        placementData
      );
    } else {
      // Create new
      resultPlacement = await base44.entities.HousingPlacement.create(placementData);
    }

    // STEP 6: Update Resident entity with housing status snapshot
    if (resident_id) {
      try {
        const resident = await base44.entities.Resident.get(resident_id);
        await base44.entities.Resident.update(resident_id, {
          housing_status: placementData.placement_status,
          current_housing: placementData.house_name
        });
      } catch (err) {
        console.warn('Could not update Resident housing_status:', err.message);
      }
    }

    return Response.json({
      success: true,
      message: 'Placement synced successfully',
      placement: resultPlacement,
      source: 'Housing App API'
    });

  } catch (error) {
    console.error('syncHousingPlacement error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Map Housing App placement status to Pathway status
 */
function mapHousingAppStatus(housingAppStatus) {
  const statusMap = {
    'not_placed': 'not_placed',
    'referred': 'referred',
    'approved_for_placement': 'approved',
    'move_in_ready': 'move_in_ready',
    'currently_placed': 'placed',
    'waitlist': 'waitlisted',
    'application_denied': 'denied',
    'placement_ended': 'not_placed'
  };
  return statusMap[housingAppStatus] || 'not_placed';
}

/**
 * Map Housing App referral status to Pathway
 */
function mapReferralStatus(housingAppRefStatus) {
  const statusMap = {
    'not_referred': 'not_referred',
    'submitted': 'referred',
    'under_review': 'under_review',
    'approved': 'approved',
    'denied': 'denied',
    'waitlist': 'waitlisted'
  };
  return statusMap[housingAppRefStatus] || 'not_referred';
}