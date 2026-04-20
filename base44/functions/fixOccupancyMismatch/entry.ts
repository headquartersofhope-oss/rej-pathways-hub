import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    console.log('[OCCUPANCY] Starting occupancy mismatch repair...');

    // Get all houses
    const houses = await base44.asServiceRole.entities.House.list();
    const beds = await base44.asServiceRole.entities.Bed.list();
    const placements = await base44.asServiceRole.entities.HousingPlacement.filter({ placement_status: 'placed' });

    console.log(`[OCCUPANCY] Found ${houses.length} houses, ${beds.length} beds, ${placements.length} placements`);

    const repairs = [];

    // For each house, recalculate occupancy
    for (const house of houses) {
      const houseBeds = beds.filter(b => b.house_id === house.id);
      const occupiedBeds = houseBeds.filter(b => b.status === 'occupied').length;
      const actualOccupied = placements.filter(p => p.house_id === house.id && p.placement_status === 'placed').length;

      console.log(`[OCCUPANCY] House ${house.name}: beds=${houseBeds.length}, occupied_count=${occupiedBeds}, actual_placements=${actualOccupied}`);

      if (occupiedBeds !== actualOccupied) {
        console.log(`[OCCUPANCY] MISMATCH detected: ${occupiedBeds} vs ${actualOccupied}`);
        
        // Fix: recalculate based on actual placements
        await base44.asServiceRole.entities.House.update(house.id, {
          occupied_beds: actualOccupied,
          total_beds: houseBeds.length
        });
        
        repairs.push({
          house_id: house.id,
          house_name: house.name,
          before: occupiedBeds,
          after: actualOccupied,
          fixed: true
        });
      }
    }

    // Validate each placement has a corresponding occupied bed
    let invalidPlacements = 0;
    let deletedPlacements = 0;
    for (const placement of placements) {
      // If placement has no bed_id, it's a ghost placement - delete it
      if (!placement.bed_id) {
        console.warn(`[OCCUPANCY] Invalid placement: no bed_id assigned`);
        invalidPlacements++;
        await base44.asServiceRole.entities.HousingPlacement.delete(placement.id);
        console.log(`[OCCUPANCY] Deleted ghost placement ${placement.id} (no bed_id)`);
        deletedPlacements++;
        continue;
      }
      
      const bed = beds.find(b => b.id === placement.bed_id);
      if (!bed || bed.status !== 'occupied') {
        console.warn(`[OCCUPANCY] Invalid placement: bed ${placement.bed_id} not occupied`);
        invalidPlacements++;
        
        // Try to verify resident exists
        let residentExists = false;
        try {
          if (placement.resident_id) {
            await base44.asServiceRole.entities.Resident.get(placement.resident_id);
            residentExists = true;
          }
        } catch (e) {
          residentExists = false;
        }
        
        // If resident doesn't exist, delete the placement
        if (!residentExists && placement.resident_id) {
          await base44.asServiceRole.entities.HousingPlacement.delete(placement.id);
          console.log(`[OCCUPANCY] Deleted orphaned placement ${placement.id} (resident not found)`);
          deletedPlacements++;
        } else if (bed && bed.status !== 'occupied') {
          // Fix: mark bed as occupied if not already
          await base44.asServiceRole.entities.Bed.update(bed.id, {
            status: 'occupied',
            resident_id: placement.resident_id,
            resident_name: placement.resident_id ? `Resident ${placement.resident_id}` : 'Unknown'
          });
          console.log(`[OCCUPANCY] Fixed bed ${bed.id} status to occupied`);
        }
      }
    }

    // Check for ghost occupied beds (marked occupied but no placement)
    let ghostBeds = 0;
    for (const bed of beds.filter(b => b.status === 'occupied')) {
      const hasPlacement = placements.find(p => p.bed_id === bed.id && p.placement_status === 'placed');
      if (!hasPlacement) {
        console.warn(`[OCCUPANCY] Ghost bed found: ${bed.bed_label} marked occupied but no placement`);
        ghostBeds++;
        
        // Check if resident still in housing or exited
        let residentExists = false;
        try {
          if (bed.resident_id) {
            const resident = await base44.asServiceRole.entities.Resident.get(bed.resident_id);
            if (!resident || resident.status === 'exited') residentExists = false;
            else residentExists = true;
          }
        } catch (e) {
          residentExists = false;
        }
        
        if (!residentExists) {
          await base44.asServiceRole.entities.Bed.update(bed.id, {
            status: 'available',
            resident_id: null,
            resident_name: null,
            move_in_date: null,
            expected_move_out_date: null
          });
          console.log(`[OCCUPANCY] Released ghost bed ${bed.id}`);
        }
      }
    }

    console.log(`[OCCUPANCY] Repair complete: ${repairs.length} houses fixed, ${invalidPlacements} invalid placements, ${ghostBeds} ghost beds, ${deletedPlacements} orphaned placements deleted`);

    return Response.json({
      success: true,
      repairs_applied: repairs.length,
      invalid_placements: invalidPlacements,
      ghost_beds: ghostBeds,
      deleted_placements: deletedPlacements,
      details: repairs,
      message: `Fixed ${repairs.length} occupancy mismatches. Validated ${placements.length} placements. Deleted ${deletedPlacements} orphaned placements.`
    });
  } catch (error) {
    console.error('[OCCUPANCY] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});