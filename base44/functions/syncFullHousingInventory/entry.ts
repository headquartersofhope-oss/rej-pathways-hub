import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * syncFullHousingInventory
 *
 * Since Pathway IS the housing system (no external Housing App configured),
 * this function performs an internal inventory reconciliation:
 *
 *  1. Reads all Houses
 *  2. Reads all Beds
 *  3. Reads all HousingPlacements
 *  4. Repairs mismatches:
 *     - Beds marked occupied but no linked HousingPlacement → logs warning
 *     - HousingPlacement marked "placed" but linked Bed is available → fixes Bed status
 *     - House occupied_beds counter out of sync → repairs counter
 *  5. Returns full inventory summary
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const repairMode = (await req.json().catch(() => ({}))).repair !== false;

    // ── 1. Load all data ──────────────────────────────────────────────────────
    const [houses, beds, placements, residents] = await Promise.all([
      base44.asServiceRole.entities.House.list('name', 500),
      base44.asServiceRole.entities.Bed.list('house_id', 1000),
      base44.asServiceRole.entities.HousingPlacement.list('-synced_at', 1000),
      base44.asServiceRole.entities.Resident.filter({ status: 'active' }),
    ]);

    // ── 2. Build lookup maps ──────────────────────────────────────────────────
    const bedsByHouse = {};
    beds.forEach(b => {
      if (!bedsByHouse[b.house_id]) bedsByHouse[b.house_id] = [];
      bedsByHouse[b.house_id].push(b);
    });

    const placementByResident = {};
    placements.forEach(p => {
      if (p.resident_id && p.placement_status === 'placed') {
        placementByResident[p.resident_id] = p;
      }
    });

    // ── 3. Reconciliation & repairs ───────────────────────────────────────────
    const repairs = [];
    const warnings = [];

    // 3a. Fix HousingPlacement "placed" but linked Bed is still "available"
    const placedPlacements = placements.filter(p => p.placement_status === 'placed' && p.bed_id);
    for (const placement of placedPlacements) {
      const bed = beds.find(b => b.id === placement.bed_id);
      if (bed && bed.status === 'available') {
        if (repairMode) {
          await base44.asServiceRole.entities.Bed.update(bed.id, {
            status: 'occupied',
            resident_id: placement.resident_id,
            resident_name: placement.resident_name || '',
            move_in_date: placement.move_in_date || null,
          });
          repairs.push(`Fixed: Bed "${bed.bed_label}" (${placement.house_name}) set to occupied — matched to placement for resident ${placement.global_resident_id}`);
        } else {
          warnings.push(`Mismatch: Bed "${bed.bed_label}" is "available" but placement ${placement.id} is "placed"`);
        }
      }
    }

    // 3b. Fix Bed "occupied" but no active HousingPlacement exists for that resident
    const occupiedBeds = beds.filter(b => b.status === 'occupied' && b.resident_id);
    for (const bed of occupiedBeds) {
      const hasPlacement = placements.some(
        p => p.resident_id === bed.resident_id && p.placement_status === 'placed'
      );
      if (!hasPlacement) {
        warnings.push(`Warning: Bed "${bed.bed_label}" (${bed.house_name}) is occupied by resident_id=${bed.resident_id} but no active HousingPlacement found`);
      }
    }

    // 3c. Repair House.occupied_beds counter
    for (const house of houses) {
      const houseBeds = bedsByHouse[house.id] || [];
      const actualOccupied = houseBeds.filter(b => b.status === 'occupied').length;
      if (house.occupied_beds !== actualOccupied) {
        if (repairMode) {
          await base44.asServiceRole.entities.House.update(house.id, {
            occupied_beds: actualOccupied
          });
          repairs.push(`Fixed: House "${house.name}" occupied_beds updated ${house.occupied_beds} → ${actualOccupied}`);
        } else {
          warnings.push(`Counter mismatch: House "${house.name}" reports ${house.occupied_beds} occupied but Beds show ${actualOccupied}`);
        }
      }
    }

    // 3d. Active residents with NO housing placement of any kind
    const allResidentIds = new Set(placements.map(p => p.resident_id));
    const unplacedResidents = residents.filter(r => !allResidentIds.has(r.id));

    // 3e. Active residents with a "placed" status but no Bed record with their ID
    const bedResidentIds = new Set(beds.filter(b => b.status === 'occupied').map(b => b.resident_id));
    const placedWithNoBed = placements.filter(
      p => p.placement_status === 'placed' && p.housing_model === 'turnkey_house' && !bedResidentIds.has(p.resident_id)
    );

    // ── 4. Build inventory summary ────────────────────────────────────────────
    const summary = {
      houses: houses.map(h => {
        const hBeds = bedsByHouse[h.id] || [];
        return {
          id: h.id,
          name: h.name,
          city: h.city,
          state: h.state,
          status: h.status,
          total_beds: h.total_beds,
          beds_in_system: hBeds.length,
          occupied: hBeds.filter(b => b.status === 'occupied').length,
          available: hBeds.filter(b => b.status === 'available').length,
          reserved: hBeds.filter(b => b.status === 'reserved').length,
          maintenance: hBeds.filter(b => b.status === 'maintenance').length,
        };
      }),
      totals: {
        houses: houses.length,
        beds_total: beds.length,
        beds_occupied: beds.filter(b => b.status === 'occupied').length,
        beds_available: beds.filter(b => b.status === 'available').length,
        beds_reserved: beds.filter(b => b.status === 'reserved').length,
        beds_maintenance: beds.filter(b => b.status === 'maintenance').length,
        placements_active: placements.filter(p => p.placement_status === 'placed').length,
        placements_total: placements.length,
        active_residents: residents.length,
        residents_unplaced: unplacedResidents.length,
      }
    };

    // ── 5. Determine sync mode ────────────────────────────────────────────────
    const envKeys = Deno.env.toObject();
    const externalApiKey = envKeys['HOUSING_APP_API_KEY'];
    const syncMode = externalApiKey ? 'external_api' : 'internal_only';
    const apiConfigured = !!externalApiKey;

    return Response.json({
      success: true,
      sync_mode: syncMode,
      api_configured: apiConfigured,
      repair_mode: repairMode,
      repairs_made: repairs,
      warnings,
      summary,
      unplaced_residents: unplacedResidents.map(r => ({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`,
        global_resident_id: r.global_resident_id,
        status: r.status
      })),
      placed_no_bed: placedWithNoBed.map(p => ({
        placement_id: p.id,
        global_resident_id: p.global_resident_id,
        house_name: p.house_name,
        bed_label: p.bed_label
      })),
      synced_at: new Date().toISOString(),
      message: repairMode
        ? `Sync complete. ${repairs.length} repairs made, ${warnings.length} warnings.`
        : `Dry run complete. ${warnings.length} issues found. Set repair=true to fix.`
    });

  } catch (error) {
    console.error('syncFullHousingInventory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});