import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * runHousingDiagnostics: Check housing integration health
 * 
 * Detects:
 * - Residents without placement records
 * - Mismatched records between systems
 * - Sync failures
 * - Data integrity issues
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

    // CHECK 1: Residents without any placement record
    try {
      const residents = await base44.entities.Resident.filter({ status: 'active' });
      const placements = await base44.entities.HousingPlacement.list('', 10000);
      const placedResidentIds = new Set(placements.map(p => p.resident_id));

      const unplacedCount = residents.filter(r => !placedResidentIds.has(r.id)).length;
      if (unplacedCount > 0) {
        findings.push({
          issue: `${unplacedCount} active residents without any housing placement record`,
          severity: 'info',
          recommendation: 'This is normal for new residents. Create referrals to generate placement records.'
        });
      }
      passedChecks++;
    } catch (err) {
      findings.push({
        issue: 'Failed to check resident-placement linking',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 2: Placements with sync errors
    try {
      const placements = await base44.entities.HousingPlacement.list('', 1000);
      const withSyncErrors = placements.filter(p => p.sync_error);

      if (withSyncErrors.length > 0) {
        findings.push({
          issue: `${withSyncErrors.length} placements have sync errors`,
          severity: 'warning',
          recommendation: `Last error: ${withSyncErrors[0].sync_error}. Check Housing App API connectivity.`
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({
        issue: 'Failed to check sync errors',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 3: Placements with stale sync data (>24 hours)
    try {
      const placements = await base44.entities.HousingPlacement.list('-synced_at', 1000);
      const now = new Date();
      const staleSyncThreshold = 24 * 60 * 60 * 1000; // 24 hours

      const staleCount = placements.filter(p => {
        const syncTime = new Date(p.synced_at);
        return now - syncTime > staleSyncThreshold;
      }).length;

      if (staleCount > 0) {
        findings.push({
          issue: `${staleCount} placements not synced in over 24 hours`,
          severity: 'warning',
          recommendation: 'Consider running scheduled sync more frequently (currently daily).'
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({
        issue: 'Failed to check sync freshness',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 4: Placements missing critical fields
    try {
      const placements = await base44.entities.HousingPlacement.list('', 1000);
      const missingFields = placements.filter(p => 
        !p.house_id || !p.house_name || !p.resident_id
      );

      if (missingFields.length > 0) {
        findings.push({
          issue: `${missingFields.length} placements missing critical fields`,
          severity: 'error',
          recommendation: `Placements need house_id, house_name, and resident_id. Run sync to repopulate.`
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({
        issue: 'Failed to check field completeness',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 5: Invalid placement statuses
    try {
      const placements = await base44.entities.HousingPlacement.list('', 1000);
      const validStatuses = ['not_placed', 'referred', 'approved', 'move_in_ready', 'placed', 'waitlisted', 'denied'];
      const invalidCount = placements.filter(p => !validStatuses.includes(p.placement_status)).length;

      if (invalidCount > 0) {
        findings.push({
          issue: `${invalidCount} placements have invalid status values`,
          severity: 'error',
          recommendation: 'Run sync to correct status mappings from Housing App.'
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({
        issue: 'Failed to validate placement statuses',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 6: Duplicate placements (same resident, same house)
    try {
      const placements = await base44.entities.HousingPlacement.list('', 10000);
      const groupedByResident = {};

      placements.forEach(p => {
        if (!groupedByResident[p.resident_id]) groupedByResident[p.resident_id] = [];
        groupedByResident[p.resident_id].push(p);
      });

      let duplicateCount = 0;
      Object.values(groupedByResident).forEach(resident => {
        if (resident.length > 1) {
          duplicateCount += resident.length - 1; // All extras are duplicates
        }
      });

      if (duplicateCount > 0) {
        findings.push({
          issue: `${duplicateCount} duplicate placement records detected`,
          severity: 'warning',
          recommendation: 'Delete older placements if resident has moved to new housing. Keep latest only.'
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({
        issue: 'Failed to check for duplicates',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 7: Referrals without linked placement
    try {
      const referrals = await base44.entities.HousingReferral.filter({ status: 'submitted' });
      const placements = await base44.entities.HousingPlacement.list('', 10000);
      const placementReferralIds = new Set(placements.filter(p => p.referral_id).map(p => p.referral_id));

      const unlinkedCount = referrals.filter(r => !placementReferralIds.has(r.id)).length;

      if (unlinkedCount > 0) {
        findings.push({
          issue: `${unlinkedCount} submitted referrals don't have placement records`,
          severity: 'info',
          recommendation: 'This is normal. Placements are created when Housing App approves referrals.'
        });
      }
      passedChecks++;
    } catch (err) {
      findings.push({
        issue: 'Failed to check referral-placement links',
        severity: 'error',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // CHECK 8b: Turnkey placements without org scope
    try {
      const placements = await base44.asServiceRole.entities.HousingPlacement.filter({ housing_model: 'turnkey_house' });
      const missingOrg = placements.filter(p => !p.organization_id);
      if (missingOrg.length > 0) {
        findings.push({
          issue: `${missingOrg.length} turnkey placements missing organization_id (scope leak risk)`,
          severity: 'error',
          recommendation: 'Update these HousingPlacement records with the correct organization_id to enforce org-scoped access.'
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({ issue: 'Failed to check turnkey org scoping', severity: 'error', recommendation: err.message });
      failedChecks++;
    }

    // CHECK 8c: Turnkey placements missing room/bed after being marked "placed"
    try {
      const placements = await base44.asServiceRole.entities.HousingPlacement.filter({ housing_model: 'turnkey_house', placement_status: 'placed' });
      const missingBed = placements.filter(p => !p.bed_id && !p.bed_label);
      if (missingBed.length > 0) {
        findings.push({
          issue: `${missingBed.length} turnkey placements are "placed" but missing room/bed assignment`,
          severity: 'warning',
          recommendation: 'Re-open the resident housing tab and complete the bed assignment for these residents.'
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({ issue: 'Failed to check turnkey bed assignments', severity: 'error', recommendation: err.message });
      failedChecks++;
    }

    // CHECK 8d: Turnkey sync mismatch — placement says placed but Bed entity shows available
    try {
      const turnkeyPlacements = await base44.asServiceRole.entities.HousingPlacement.filter({
        housing_model: 'turnkey_house', placement_status: 'placed'
      });
      const mismatchCount = [];
      for (const p of turnkeyPlacements) {
        if (p.bed_id) {
          const beds = await base44.asServiceRole.entities.Bed.filter({ id: p.bed_id }).catch(() => []);
          const bed = beds[0];
          if (bed && bed.status === 'available') {
            mismatchCount.push(p);
          }
        }
      }
      if (mismatchCount.length > 0) {
        findings.push({
          issue: `${mismatchCount.length} turnkey placements show "placed" but linked Bed is still "available"`,
          severity: 'warning',
          recommendation: 'Run a manual sync or re-assign the bed to reconcile occupancy status.'
        });
        failedChecks++;
      } else {
        passedChecks++;
      }
    } catch (err) {
      findings.push({ issue: 'Failed to check turnkey bed/placement sync', severity: 'warning', recommendation: err.message });
      failedChecks++;
    }

    // CHECK 8: Housing App API connectivity
    try {
      const apiKey = Deno.env.get('HOUSING_APP_API_KEY');
      if (!apiKey) {
        findings.push({
          issue: 'Housing App API key not configured',
          severity: 'warning',
          recommendation: 'Set HOUSING_APP_API_KEY in environment to enable automatic sync.'
        });
        failedChecks++;
      } else {
        // Try a test request
        const url = Deno.env.get('HOUSING_APP_API_URL') || 'https://housing.nonprofit.org/api';
        const response = await fetch(`${url}/health`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        }).catch(() => null);

        if (!response || !response.ok) {
          findings.push({
            issue: 'Cannot reach Housing App API',
            severity: 'warning',
            recommendation: 'Check Housing App is running and HOUSING_APP_API_URL is correct.'
          });
          failedChecks++;
        } else {
          passedChecks++;
        }
      }
    } catch (err) {
      findings.push({
        issue: 'Failed to test Housing App API',
        severity: 'warning',
        recommendation: `Error: ${err.message}`
      });
      failedChecks++;
    }

    // Calculate overall health
    const totalChecks = passedChecks + failedChecks;
    const healthPercentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    return Response.json({
      success: true,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      total_checks: totalChecks,
      health_percentage: healthPercentage,
      status: healthPercentage >= 80 ? 'healthy' : healthPercentage >= 50 ? 'warning' : 'critical',
      findings,
      recommendations: generateRecommendations(findings)
    });

  } catch (error) {
    console.error('runHousingDiagnostics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Generate prioritized recommendations based on findings
 */
function generateRecommendations(findings) {
  const recommendations = [];

  const hasErrors = findings.some(f => f.severity === 'error');
  const hasWarnings = findings.some(f => f.severity === 'warning');

  if (hasErrors) {
    recommendations.push('Critical: Review and fix error-level findings immediately.');
  }

  if (hasWarnings) {
    recommendations.push('Run a manual sync to refresh placement data from Housing App.');
  }

  if (findings.some(f => f.issue.includes('API'))) {
    recommendations.push('Verify Housing App connectivity and API configuration.');
  }

  if (findings.some(f => f.issue.includes('sync'))) {
    recommendations.push('Consider increasing sync frequency if data is stale.');
  }

  if (recommendations.length === 0) {
    recommendations.push('All checks passed. Housing integration is healthy.');
  }

  return recommendations;
}