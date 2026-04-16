import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * runHousingDiagnostics
 *
 * Comprehensive housing system health check.
 * Checks both internal Pathway data and (if configured) external Housing App API.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const findings = [];
    let passedChecks = 0;
    let failedChecks = 0;

    const addFinding = (issue, severity, recommendation) => {
      findings.push({ issue, severity, recommendation });
      failedChecks++;
    };
    const pass = () => passedChecks++;

    // Load all data upfront
    const [houses, beds, placements, residents] = await Promise.all([
      base44.asServiceRole.entities.House.list('name', 500),
      base44.asServiceRole.entities.Bed.list('', 1000),
      base44.asServiceRole.entities.HousingPlacement.list('', 1000),
      base44.asServiceRole.entities.Resident.filter({ status: 'active' }),
    ]).catch(err => {
      addFinding('Failed to load housing data', 'error', err.message);
      return [[], [], [], []];
    });

    // ── CHECK 1: Houses exist ────────────────────────────────────────────────
    if (houses.length === 0) {
      addFinding('No houses configured in Pathway', 'error', 'Go to Housing Operations → Add House to create house records.');
    } else {
      pass();
    }

    // ── CHECK 2: Beds exist ──────────────────────────────────────────────────
    if (beds.length === 0) {
      addFinding('No beds configured in Pathway', 'error', 'Go to Housing Operations → Bed Inventory → Add Bed to configure beds for each house.');
    } else {
      pass();
    }

    // ── CHECK 3: Houses missing beds ─────────────────────────────────────────
    const housesMissingBeds = houses.filter(h => !beds.some(b => b.house_id === h.id));
    if (housesMissingBeds.length > 0) {
      addFinding(
        `${housesMissingBeds.length} house(s) have no beds configured: ${housesMissingBeds.map(h => h.name).join(', ')}`,
        'warning',
        'Add beds for these houses in Housing Operations → Bed Inventory.'
      );
    } else if (houses.length > 0) {
      pass();
    }

    // ── CHECK 4: Bed count vs House.total_beds mismatch ──────────────────────
    let bedCountMismatches = 0;
    houses.forEach(h => {
      const actualBeds = beds.filter(b => b.house_id === h.id).length;
      if (h.total_beds > 0 && actualBeds !== h.total_beds) {
        bedCountMismatches++;
      }
    });
    if (bedCountMismatches > 0) {
      addFinding(
        `${bedCountMismatches} house(s) have bed count mismatch (House.total_beds ≠ actual Bed records)`,
        'warning',
        'Update the total_beds field on the house, or add/remove bed records to match.'
      );
    } else if (houses.length > 0) {
      pass();
    }

    // ── CHECK 5: House.occupied_beds counter accuracy ────────────────────────
    let counterErrors = 0;
    houses.forEach(h => {
      const actualOccupied = beds.filter(b => b.house_id === h.id && b.status === 'occupied').length;
      if (h.occupied_beds !== actualOccupied) counterErrors++;
    });
    if (counterErrors > 0) {
      addFinding(
        `${counterErrors} house(s) have inaccurate occupied_beds counter`,
        'warning',
        'Run Full Inventory Sync (repair mode) to fix counters automatically.'
      );
    } else {
      pass();
    }

    // ── CHECK 6: Placement ↔ Bed occupancy mismatch ──────────────────────────
    const placedPlacements = placements.filter(p => p.placement_status === 'placed' && p.bed_id);
    let mismatchCount = 0;
    for (const p of placedPlacements) {
      const bed = beds.find(b => b.id === p.bed_id);
      if (bed && bed.status === 'available') mismatchCount++;
    }
    if (mismatchCount > 0) {
      addFinding(
        `${mismatchCount} HousingPlacement(s) are "placed" but linked Bed is still "available"`,
        'warning',
        'Run Full Inventory Sync (repair mode) to reconcile bed statuses.'
      );
    } else {
      pass();
    }

    // ── CHECK 7: Beds "occupied" with no linked HousingPlacement ─────────────
    const occupiedBeds = beds.filter(b => b.status === 'occupied' && b.resident_id);
    const placedResidentIds = new Set(placements.filter(p => p.placement_status === 'placed').map(p => p.resident_id));
    const orphanedBeds = occupiedBeds.filter(b => !placedResidentIds.has(b.resident_id));
    if (orphanedBeds.length > 0) {
      addFinding(
        `${orphanedBeds.length} bed(s) marked occupied but no active HousingPlacement record found`,
        'warning',
        `Beds: ${orphanedBeds.map(b => b.bed_label).join(', ')}. Create HousingPlacement records or clear bed assignment.`
      );
    } else {
      pass();
    }

    // ── CHECK 8: Active residents with no placement ──────────────────────────
    const allPlacedResidents = new Set(placements.map(p => p.resident_id));
    const unplacedCount = residents.filter(r => !allPlacedResidents.has(r.id)).length;
    if (unplacedCount > 0) {
      findings.push({
        issue: `${unplacedCount} active resident(s) have no housing placement record`,
        severity: 'info',
        recommendation: 'Normal for new residents. Create a referral or assign a turnkey bed.'
      });
    }
    pass();

    // ── CHECK 9: Placements missing critical fields ───────────────────────────
    const missingFields = placements.filter(p => !p.house_id || !p.house_name || !p.resident_id);
    if (missingFields.length > 0) {
      addFinding(
        `${missingFields.length} placement(s) missing required fields (house_id, house_name, or resident_id)`,
        'error',
        'These placements are corrupt. Review and delete/recreate them.'
      );
    } else {
      pass();
    }

    // ── CHECK 10: Duplicate placements per resident ──────────────────────────
    const residentPlacementCount = {};
    placements.filter(p => p.placement_status === 'placed').forEach(p => {
      residentPlacementCount[p.resident_id] = (residentPlacementCount[p.resident_id] || 0) + 1;
    });
    const duplicateResidents = Object.entries(residentPlacementCount).filter(([, c]) => c > 1).length;
    if (duplicateResidents > 0) {
      addFinding(
        `${duplicateResidents} resident(s) have multiple "placed" HousingPlacement records`,
        'warning',
        'Only one active placement per resident should have status "placed". Archive older records.'
      );
    } else {
      pass();
    }

    // ── CHECK 11: Turnkey placements missing org scope ───────────────────────
    const turnkeyPlacements = placements.filter(p => p.housing_model === 'turnkey_house');
    const missingOrg = turnkeyPlacements.filter(p => !p.organization_id);
    if (missingOrg.length > 0) {
      addFinding(
        `${missingOrg.length} turnkey placement(s) missing organization_id`,
        'error',
        'These placements are not org-scoped. Update them with the correct organization_id.'
      );
    } else if (turnkeyPlacements.length > 0) {
      pass();
    }

    // ── CHECK 12: Turnkey "placed" but no bed/room assigned ──────────────────
    const turnkeyPlaced = placements.filter(p => p.housing_model === 'turnkey_house' && p.placement_status === 'placed');
    const turnkeyNoBed = turnkeyPlaced.filter(p => !p.bed_id && !p.bed_label);
    if (turnkeyNoBed.length > 0) {
      addFinding(
        `${turnkeyNoBed.length} turnkey placement(s) marked "placed" but missing bed/room assignment`,
        'warning',
        'Open each resident\'s Housing tab and complete the bed assignment.'
      );
    } else if (turnkeyPlaced.length > 0) {
      pass();
    }

    // ── CHECK 13: Stale sync on per_bed placements ────────────────────────────
    const perBedPlacements = placements.filter(p => p.housing_model === 'per_bed');
    const now = new Date();
    const stale = perBedPlacements.filter(p => {
      if (!p.synced_at) return true;
      return (now - new Date(p.synced_at)) > 24 * 60 * 60 * 1000;
    });
    if (stale.length > 0) {
      addFinding(
        `${stale.length} per_bed placement(s) not synced in over 24 hours`,
        'warning',
        'Run syncHousingPlacement for each resident, or configure HOUSING_APP_API_KEY for automatic sync.'
      );
    } else if (perBedPlacements.length > 0) {
      pass();
    }

    // ── CHECK 14: Placements with sync errors ────────────────────────────────
    const withSyncErrors = placements.filter(p => p.sync_error);
    if (withSyncErrors.length > 0) {
      addFinding(
        `${withSyncErrors.length} placement(s) have sync errors recorded`,
        'warning',
        `Last error: "${withSyncErrors[0].sync_error}". Re-run sync or check API connectivity.`
      );
    } else {
      pass();
    }

    // ── CHECK 15: External API configuration ─────────────────────────────────
    const envKeys = Deno.env.toObject();
    const apiKey = envKeys['HOUSING_APP_API_KEY'];
    if (!apiKey) {
      findings.push({
        issue: 'No external Housing App API key configured',
        severity: 'info',
        recommendation: 'This is fine if Pathway is your primary housing system. Set HOUSING_APP_API_KEY in Dashboard → Settings → Environment Variables only if you use an external Housing App.'
      });
    } else {
      const apiUrl = envKeys['HOUSING_APP_API_URL'] || 'https://housing.nonprofit.org/api';
      const response = await fetch(`${apiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }).catch(() => null);
      if (!response || !response.ok) {
        addFinding(
          'HOUSING_APP_API_KEY is set but API is unreachable',
          'warning',
          `Check that HOUSING_APP_API_URL is correct and the Housing App is running. URL tried: ${apiUrl}`
        );
      } else {
        pass();
      }
    }

    const totalChecks = passedChecks + failedChecks;
    const healthPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    // Inventory summary for the UI
    const inventory = {
      houses: houses.length,
      beds: beds.length,
      beds_occupied: beds.filter(b => b.status === 'occupied').length,
      beds_available: beds.filter(b => b.status === 'available').length,
      beds_reserved: beds.filter(b => b.status === 'reserved').length,
      placements_active: placements.filter(p => p.placement_status === 'placed').length,
      unplaced_active_residents: unplacedCount,
    };

    return Response.json({
      success: true,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      total_checks: totalChecks,
      health_percentage: healthPct,
      status: healthPct >= 85 ? 'healthy' : healthPct >= 60 ? 'warning' : 'critical',
      api_configured: !!apiKey,
      sync_mode: apiKey ? 'external_api' : 'internal_only',
      inventory,
      findings,
      recommendations: generateRecommendations(findings),
    });

  } catch (error) {
    console.error('runHousingDiagnostics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateRecommendations(findings) {
  const recs = [];
  if (findings.some(f => f.severity === 'error')) {
    recs.push('Critical issues detected — resolve error-level findings before using housing assignment.');
  }
  if (findings.some(f => f.issue.includes('no beds'))) {
    recs.push('Add bed records in Housing Operations → Bed Inventory.');
  }
  if (findings.some(f => f.issue.includes('mismatch') || f.issue.includes('counter'))) {
    recs.push('Run Full Inventory Sync (repair mode) to automatically fix bed/counter mismatches.');
  }
  if (findings.some(f => f.issue.includes('duplicate'))) {
    recs.push('Remove duplicate "placed" placement records — keep only the most recent.');
  }
  if (findings.some(f => f.issue.includes('organization_id'))) {
    recs.push('Backfill organization_id on turnkey placements to enforce org-scoped access.');
  }
  if (recs.length === 0) {
    recs.push('All checks passed. Housing integration is healthy.');
  }
  return recs;
}