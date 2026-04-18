import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'manager') {
      return Response.json({ error: 'Unauthorized: Manager role required' }, { status: 403 });
    }

    const { resident_id, case_manager_id, case_manager_name, action } = await req.json();

    if (!resident_id || !case_manager_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify resident exists
    const resident = await base44.entities.Resident.get(resident_id);
    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    const previousCaseManager = resident.assigned_case_manager_id;

    // Update assignment
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      assigned_case_manager_id: case_manager_id,
      assigned_case_manager: case_manager_name,
    });

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: `manager_${action || 'assign'}_resident`,
        entity_type: 'Resident',
        entity_id: resident_id,
        details: {
          resident_name: `${resident.first_name} ${resident.last_name}`,
          previous_case_manager: previousCaseManager,
          new_case_manager: case_manager_id,
          new_case_manager_name: case_manager_name,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.warn('Audit log failed (non-fatal):', auditError.message);
    }

    return Response.json({
      success: true,
      resident_id,
      case_manager_id,
      message: `Resident assigned to ${case_manager_name}`,
    });
  } catch (error) {
    console.error('Assignment error:', error.message);
    return Response.json({
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});