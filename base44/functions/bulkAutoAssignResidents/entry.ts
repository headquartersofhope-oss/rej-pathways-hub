import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Bulk auto-assign all unassigned residents in organization
 * Manager tool to trigger auto-assignment for multiple residents at once
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: Admin or Manager role required' }, { status: 403 });
    }

    const { organization_id, caseload_threshold = 25 } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'Missing organization_id' }, { status: 400 });
    }

    // Get all unassigned residents in organization
    const unassignedResidents = await base44.asServiceRole.entities.Resident.filter({
      organization_id: organization_id,
      assigned_case_manager_id: null
    });

    if (unassignedResidents.length === 0) {
      return Response.json({
        success: true,
        message: 'No unassigned residents found',
        assigned: 0,
        failed: 0,
        details: []
      });
    }

    const results = [];
    let assigned = 0;
    let failed = 0;

    for (const resident of unassignedResidents) {
      try {
        // Get all case managers via UserProfile (platform User only has admin/user roles)
        const cmProfiles = await base44.asServiceRole.entities.UserProfile.filter({
          app_role: 'case_manager',
          organization_id: organization_id,
          status: 'active'
        });
        const caseManagers = cmProfiles.length > 0
          ? cmProfiles
          : await base44.asServiceRole.entities.UserProfile.filter({ app_role: 'case_manager', status: 'active' });

        if (caseManagers.length === 0) {
          failed++;
          results.push({
            resident_id: resident.id,
            resident_name: `${resident.first_name} ${resident.last_name}`,
            success: false,
            reason: 'No case managers available'
          });
          continue;
        }

        // Calculate caseloads
        const caseloadData = await Promise.all(
          caseManagers.map(async (cm) => {
            const cmName = cm.full_name || cm.email;
            const assignedResidents = await base44.asServiceRole.entities.Resident.filter({
              assigned_case_manager: cmName,
              organization_id: organization_id
            });
            return {
              user_id: cm.id,
              name: cmName,
              email: cm.email,
              caseload: assignedResidents.length
            };
          })
        );

        // Filter eligible
        const eligible = caseloadData.filter(cm => cm.caseload < caseload_threshold);

        if (eligible.length === 0) {
          failed++;
          results.push({
            resident_id: resident.id,
            resident_name: `${resident.first_name} ${resident.last_name}`,
            success: false,
            reason: 'All managers at/over threshold'
          });
          continue;
        }

        // Assign to least-loaded
        const sorted = eligible.sort((a, b) => a.caseload - b.caseload);
        const assignedManager = sorted[0];

        await base44.asServiceRole.entities.Resident.update(resident.id, {
          assigned_case_manager_id: assignedManager.user_id,
          assigned_case_manager: assignedManager.name,
          assignment_method: 'auto',
          assignment_timestamp: new Date().toISOString(),
          auto_assignment_reason: 'bulk_auto_assign',
          assigned_by_user_id: user.id
        });

        assigned++;
        results.push({
          resident_id: resident.id,
          resident_name: `${resident.first_name} ${resident.last_name}`,
          assigned_to: assignedManager.name,
          success: true
        });
      } catch (err) {
        failed++;
        results.push({
          resident_id: resident.id,
          resident_name: `${resident.first_name} ${resident.last_name}`,
          success: false,
          reason: err.message
        });
      }
    }

    // Audit log bulk operation
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      action: 'bulk_auto_assign_residents',
      entity_type: 'Resident',
      entity_id: organization_id,
      details: `Bulk auto-assign: ${assigned} assigned, ${failed} failed out of ${unassignedResidents.length} unassigned in org ${organization_id}`,
      severity: 'info'
    }).catch(err => console.warn('Audit log failed:', err.message));

    return Response.json({
      success: true,
      assigned,
      failed,
      total: unassignedResidents.length,
      details: results
    });
  } catch (error) {
    console.error('Bulk auto-assign error:', error.message);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});