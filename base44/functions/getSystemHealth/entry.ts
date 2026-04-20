import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const now = new Date();
  const iso = now.toISOString();

  // ─── Parallel data fetch ───────────────────────────────────────────────────
  const [
    residents,
    beds,
    houses,
    placements,
    transportRequests,
    auditLogs,
    serviceTasks,
    servicePlans,
  ] = await Promise.all([
    base44.asServiceRole.entities.Resident.list(),
    base44.asServiceRole.entities.Bed.list(),
    base44.asServiceRole.entities.House.list(),
    base44.asServiceRole.entities.HousingPlacement.list(),
    base44.asServiceRole.entities.TransportationRequest.list(),
    base44.asServiceRole.entities.AuditLog.list('-created_date', 200),
    base44.asServiceRole.entities.ServiceTask.list(),
    base44.asServiceRole.entities.ServicePlan.list(),
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. PATHWAYS STATUS
  // ══════════════════════════════════════════════════════════════════════════
  const activeResidents = residents.filter(r => ['active', 'housing_eligible', 'housing_pending', 'employed'].includes(r.status));
  const noCaseManager = activeResidents.filter(r => !r.assigned_case_manager_id);

  const ms48h = 48 * 60 * 60 * 1000;
  const ms30d = 30 * 24 * 60 * 60 * 1000;

  // Residents with status that implies exiting for more than 48 hours
  const stuckExiting = residents.filter(r => {
    if (r.status !== 'exited' && r.status !== 'graduated') return false;
    if (!r.actual_exit_date && !r.updated_date) return false;
    const exitedAt = new Date(r.actual_exit_date || r.updated_date);
    return (now - exitedAt) > ms48h && !r.actual_exit_date;
  });

  const openOldTasks = serviceTasks.filter(t => {
    if (t.status === 'completed' || t.status === 'blocked') return false;
    const created = new Date(t.created_date || 0);
    return (now - created) > ms30d;
  });

  const inactivePlans = servicePlans.filter(p => {
    if (p.status !== 'active') return false;
    const updated = new Date(p.updated_date || p.created_date || 0);
    return (now - updated) > ms30d;
  });

  const pathways = {
    total_active_residents: activeResidents.length,
    residents_no_case_manager: noCaseManager.length,
    residents_no_case_manager_ids: noCaseManager.map(r => ({ id: r.id, name: `${r.first_name} ${r.last_name}` })),
    stuck_exiting_over_48h: stuckExiting.length,
    open_tasks_older_30d: openOldTasks.length,
    service_plans_inactive_30d: inactivePlans.length,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 2. HOUSING STATUS
  // ══════════════════════════════════════════════════════════════════════════
  const bedsByStatus = {
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    needs_cleaning: beds.filter(b => b.status === 'needs_cleaning').length,
    reserved: beds.filter(b => b.status === 'reserved').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
    offline: beds.filter(b => b.status === 'offline').length,
  };

  // Reservations older than 60 seconds (should have been swept)
  const expiredUnsweept = beds.filter(b => {
    if (b.status !== 'reserved') return false;
    if (!b.reservation_expires_at) return true; // no expiry = stale
    return new Date(b.reservation_expires_at) < now;
  });

  // Inline occupancy mismatch check (mirrors fixOccupancyMismatch logic, read-only for health check)
  const activePlacements2 = placements.filter(p => p.placement_status === 'placed');
  let occupancyMismatchCount = 0;
  const occupancyMismatchDetails = [];
  for (const house of houses) {
    const houseBeds = beds.filter(b => b.house_id === house.id);
    const occupiedBedCount = houseBeds.filter(b => b.status === 'occupied').length;
    const actualPlacementCount = activePlacements2.filter(p => p.house_id === house.id).length;
    if (occupiedBedCount !== actualPlacementCount) {
      occupancyMismatchCount++;
      occupancyMismatchDetails.push({
        house_id: house.id,
        house_name: house.name,
        occupied_beds_count: occupiedBedCount,
        active_placements_count: actualPlacementCount,
      });
    }
  }
  const occupancyMismatchResult = {
    mismatch_count: occupancyMismatchCount,
    details: occupancyMismatchDetails,
  };

  // Last bed inventory update (most recent updated_date across all beds)
  const lastBedUpdate = beds.reduce((latest, b) => {
    const t = new Date(b.updated_date || b.created_date || 0);
    return t > latest ? t : latest;
  }, new Date(0));

  const housing = {
    bed_counts: bedsByStatus,
    total_beds: beds.length,
    expired_reservations_not_swept: expiredUnsweept.length,
    expired_reservation_ids: expiredUnsweept.map(b => ({ bed_id: b.id, bed_label: b.bed_label, expired_at: b.reservation_expires_at })),
    occupancy_mismatch_fix: occupancyMismatchResult,
    last_bed_inventory_update: lastBedUpdate.toISOString(),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MRT STATUS
  // ══════════════════════════════════════════════════════════════════════════
  const openRideStatuses = ['pending', 'approved', 'scheduled', 'in_progress'];
  const openRides = transportRequests.filter(r => openRideStatuses.includes(r.status));

  const ridesNoDriver = openRides.filter(r => !r.assigned_driver_id && !r.assigned_driver);

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const ridesNext24h = openRides.filter(r => {
    if (!r.requested_date) return false;
    const rideDate = new Date(r.requested_date);
    return rideDate >= now && rideDate <= tomorrow;
  });

  // Rides where pickup_address was updated in last 24h (flag for driver confirmation)
  const pickupUpdatedRecently = openRides.filter(r => {
    const updated = new Date(r.updated_date || 0);
    return (now - updated) < ms48h / 2; // 24h
  }).filter(r => r.pickup_address); // must have an address

  // Rides for exited/exiting residents that were NOT cancelled
  const exitedResidentIds = new Set(
    residents.filter(r => r.status === 'exited' || r.status === 'inactive').map(r => r.id)
  );
  const ridesForExitedResidents = openRides.filter(r => exitedResidentIds.has(r.resident_id));

  const mrt = {
    open_rides_total: openRides.length,
    open_rides_no_driver: ridesNoDriver.length,
    open_rides_no_driver_ids: ridesNoDriver.map(r => ({ id: r.id, resident_id: r.resident_id, date: r.requested_date })),
    rides_next_24h: ridesNext24h.length,
    rides_pickup_address_updated_last_24h: pickupUpdatedRecently.length,
    rides_pickup_address_updated_ids: pickupUpdatedRecently.map(r => ({ id: r.id, resident_id: r.resident_id, pickup_address: r.pickup_address, updated: r.updated_date })),
    open_rides_for_exited_residents: ridesForExitedResidents.length,
    open_rides_for_exited_resident_ids: ridesForExitedResidents.map(r => ({ ride_id: r.id, resident_id: r.resident_id, status: r.status })),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 4. SYNC HEALTH
  // ══════════════════════════════════════════════════════════════════════════

  // HousingPlacement "placed" with no corresponding occupied bed
  const activePlacements = placements.filter(p => p.placement_status === 'placed');
  const placementBedMismatches = activePlacements.filter(p => {
    if (!p.bed_id) return true; // no bed_id at all is a mismatch
    const bed = beds.find(b => b.id === p.bed_id);
    return !bed || bed.status !== 'occupied';
  });

  // TransportationRequests where resident is exited but ride is still open
  const syncRidesForExited = transportRequests.filter(r => {
    if (!openRideStatuses.includes(r.status)) return false;
    const resident = residents.find(res => res.id === r.resident_id);
    return resident && (resident.status === 'exited' || resident.status === 'inactive');
  });

  // Last syncResidentAddressToMRT run (from AuditLog)
  const mrtSyncLogs = auditLogs.filter(l => l.action === 'mrt_address_sync_completed' || l.action === 'mrt_address_sync_failed');
  const lastMrtSync = mrtSyncLogs.length > 0 ? mrtSyncLogs[0] : null;

  const sync = {
    housing_placement_bed_mismatches: placementBedMismatches.length,
    placement_bed_mismatch_ids: placementBedMismatches.map(p => ({ placement_id: p.id, resident_id: p.resident_id, bed_id: p.bed_id })),
    open_rides_for_exited_residents: syncRidesForExited.length,
    open_rides_exited_ids: syncRidesForExited.map(r => ({ ride_id: r.id, resident_id: r.resident_id })),
    last_mrt_sync: lastMrtSync ? {
      action: lastMrtSync.action,
      timestamp: lastMrtSync.created_date,
      success: lastMrtSync.action !== 'mrt_address_sync_failed',
      details: (() => { try { return JSON.parse(lastMrtSync.details || '{}'); } catch { return {}; } })(),
    } : null,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 5. GHOST DETECTION
  // ══════════════════════════════════════════════════════════════════════════

  // Find duplicate-review ServiceTasks that are still pending after 48h
  const ghostTasks = serviceTasks.filter(t => {
    if (t.category !== 'admin_review') return false;
    if (!t.title || !t.title.includes('DUPLICATE')) return false;
    if (t.status === 'completed' || t.status === 'blocked') return false;
    const created = new Date(t.created_date || 0);
    return (now - created) > ms48h;
  });

  const ghosts = {
    unreviewed_duplicate_flags_over_48h: ghostTasks.length,
    unreviewed_ghost_task_ids: ghostTasks.map(t => ({
      task_id: t.id,
      resident_id: t.resident_id,
      title: t.title,
      created: t.created_date,
    })),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 6. OVERALL STATUS DETERMINATION
  // ══════════════════════════════════════════════════════════════════════════

  let overall_status = 'healthy';

  // CRITICAL conditions
  const criticalConditions = [
    placementBedMismatches.length > 0,
    syncRidesForExited.length > 0,
    ridesForExitedResidents.length > 0,
  ];
  if (criticalConditions.some(Boolean)) overall_status = 'critical';

  // WARNING conditions (only if not already critical)
  if (overall_status !== 'critical') {
    const warningConditions = [
      ghostTasks.length > 0,
      expiredUnsweept.length > 0,
      noCaseManager.length > 0,
      ridesNoDriver.length > 0,
    ];
    if (warningConditions.some(Boolean)) overall_status = 'warning';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. AUDIT LOG
  // ══════════════════════════════════════════════════════════════════════════
  await base44.asServiceRole.entities.AuditLog.create({
    action: 'system_health_check',
    entity_type: 'System',
    entity_id: 'health',
    user_id: user.id,
    user_name: user.full_name || user.email,
    user_email: user.email,
    details: JSON.stringify({
      overall_status,
      checked_at: iso,
      critical_flags: {
        placement_bed_mismatches: placementBedMismatches.length,
        open_rides_for_exited: syncRidesForExited.length,
      },
      warning_flags: {
        expired_reservations: expiredUnsweept.length,
        unreviewed_ghosts: ghostTasks.length,
        residents_no_case_manager: noCaseManager.length,
      },
    }),
    severity: overall_status === 'critical' ? 'high' : overall_status === 'warning' ? 'medium' : 'info',
    organization_id: user.data?.organization_id || '',
  }).catch(e => console.warn('[getSystemHealth] AuditLog failed:', e.message));

  // ══════════════════════════════════════════════════════════════════════════
  // RESPONSE
  // ══════════════════════════════════════════════════════════════════════════
  return Response.json({
    overall_status,
    checked_at: iso,
    pathways,
    housing,
    mrt,
    sync,
    ghosts,
  });
});