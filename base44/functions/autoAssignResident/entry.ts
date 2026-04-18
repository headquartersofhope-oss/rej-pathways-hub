import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Smart auto-assignment logic with load balancing
 * Assigns unassigned residents to least-loaded case manager in organization
 * Called on: resident activation, intake completion, or manual trigger
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin and manager can trigger auto-assignment
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: Admin or Manager role required' }, { status: 403 });
    }

    const { 
      resident_id, 
      organization_id,
      reason = 'manual_trigger',
      caseload_threshold = 25
    } = await req.json();

    if (!resident_id || !organization_id) {
      return Response.json({ error: 'Missing required fields: resident_id, organization_id' }, { status: 400 });
    }

    // Fetch resident
    const resident = await base44.entities.Resident.get(resident_id);
    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Skip if already assigned (unless force reassign)
    if (resident.assigned_case_manager_id) {
      return Response.json({ 
        success: false,
        message: 'Resident already assigned',
        resident_id,
        current_case_manager: resident.assigned_case_manager
      }, { status: 400 });
    }

    // Get all case managers in organization
    const caseManagers = await base44.asServiceRole.entities.User.filter({
      role: 'case_manager',
      organization_id: organization_id
    });

    if (caseManagers.length === 0) {
      // No case managers available
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: 'auto_assignment_failed_no_managers',
        entity_type: 'Resident',
        entity_id: resident_id,
        details: {
          resident_name: `${resident.first_name} ${resident.last_name}`,
          organization_id,
          reason: 'No case managers available in organization'
        },
        severity: 'warning'
      }).catch(err => console.warn('Audit log failed:', err.message));

      return Response.json({
        success: false,
        message: 'No eligible case managers available',
        resident_id,
        flagged_for_review: true
      }, { status: 400 });
    }

    // Calculate caseload for each case manager
    const caseloadData = await Promise.all(
      caseManagers.map(async (cm) => {
        const assigned = await base44.asServiceRole.entities.Resident.filter({
          assigned_case_manager_id: cm.id,
          organization_id: organization_id
        });
        return {
          user_id: cm.id,
          name: cm.full_name || cm.email,
          caseload: assigned.length
        };
      })
    );

    // Filter out overloaded case managers
    const eligible = caseloadData.filter(cm => cm.caseload < caseload_threshold);

    if (eligible.length === 0) {
      // All case managers at/over threshold
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: 'auto_assignment_failed_all_overloaded',
        entity_type: 'Resident',
        entity_id: resident_id,
        details: {
          resident_name: `${resident.first_name} ${resident.last_name}`,
          organization_id,
          caseload_threshold,
          reason: 'All case managers at or over caseload threshold'
        },
        severity: 'warning'
      }).catch(err => console.warn('Audit log failed:', err.message));

      return Response.json({
        success: false,
        message: 'All case managers are at/over caseload threshold',
        resident_id,
        flagged_for_review: true,
        caseloads: caseloadData
      }, { status: 400 });
    }

    // Sort by caseload (ascending) and select least-loaded
    const sorted = eligible.sort((a, b) => a.caseload - b.caseload);
    const assignedManager = sorted[0];

    // Perform assignment
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      assigned_case_manager_id: assignedManager.user_id,
      assigned_case_manager: assignedManager.name,
      assignment_method: 'auto',
      assignment_timestamp: new Date().toISOString(),
      auto_assignment_reason: reason,
      assigned_by_user_id: user.id
    });

    // Audit log success
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      action: 'resident_auto_assigned',
      entity_type: 'Resident',
      entity_id: resident_id,
      details: {
        resident_name: `${resident.first_name} ${resident.last_name}`,
        assigned_case_manager: assignedManager.name,
        assigned_case_manager_id: assignedManager.user_id,
        assigned_caseload: assignedManager.caseload + 1,
        reason,
        triggered_by: user.full_name || user.email
      },
      severity: 'info'
    }).catch(err => console.warn('Audit log failed:', err.message));

    return Response.json({
      success: true,
      resident_id,
      assigned_case_manager: assignedManager.name,
      assigned_case_manager_id: assignedManager.user_id,
      assigned_caseload: assignedManager.caseload + 1,
      message: `Resident auto-assigned to ${assignedManager.name} (caseload: ${assignedManager.caseload + 1})`
    });
  } catch (error) {
    console.error('Auto-assignment error:', error.message);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});