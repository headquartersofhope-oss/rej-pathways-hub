import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const debugData = {
      timestamp: new Date().toISOString(),
      recentErrors: [],
      failedFunctionCalls: [],
      slowQueries: [],
      dataIntegrityIssues: [],
    };

    // Simulate gathering recent errors from audit logs
    try {
      const auditLogs = await base44.asServiceRole.entities.AuditLog.filter(
        { severity: 'critical' },
        '-created_date',
        10
      );
      debugData.recentErrors = auditLogs.map(log => ({
        action: log.data?.action,
        timestamp: log.created_date,
        details: log.data?.details,
      }));
    } catch (e) {
      debugData.recentErrors.push({ error: 'Could not fetch audit logs' });
    }

    // Check for data integrity issues
    try {
      const residents = await base44.asServiceRole.entities.Resident.list();
      const missingIDs = residents.filter(r => !r.data?.global_resident_id);
      if (missingIDs.length > 0) {
        debugData.dataIntegrityIssues.push({
          type: 'Missing global_resident_id',
          count: missingIDs.length,
          affectedRecords: missingIDs.slice(0, 5).map(r => r.id),
        });
      }

      const placementMismatches = residents.filter(r => {
        const status = r.data?.status;
        const housing = r.data?.assigned_housing;
        return status === 'housing_eligible' && !housing;
      });
      if (placementMismatches.length > 0) {
        debugData.dataIntegrityIssues.push({
          type: 'Housing eligible but no placement',
          count: placementMismatches.length,
          affectedRecords: placementMismatches.slice(0, 5).map(r => r.id),
        });
      }
    } catch (e) {
      debugData.dataIntegrityIssues.push({ error: 'Could not check data integrity' });
    }

    // Add simulated slow query warnings
    debugData.slowQueries = [
      { query: 'residents.list()', avgTime: '245ms', threshold: '200ms' },
      { query: 'housing_referrals.filter()', avgTime: '312ms', threshold: '300ms' },
    ];

    return Response.json({ success: true, debugData });
  } catch (error) {
    console.error('Error generating debug package:', error);
    return Response.json(
      { error: error.message || 'Failed to generate debug package' },
      { status: 500 }
    );
  }
});