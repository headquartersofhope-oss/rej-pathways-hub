import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('[HOUSING] submitToHousingQueue invoked by:', user.email);

    const { resident_id, reason } = await req.json();
    if (!resident_id) return Response.json({ error: 'resident_id required' }, { status: 400 });

    const resident = await base44.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    console.log('[HOUSING] Resident found:', resident.id, 'current status:', resident.status);

    // Mark resident as housing_pending (use user context, not service role)
    const updateResult = await base44.entities.Resident.update(resident_id, {
      status: 'housing_pending'
    });

    console.log('[HOUSING] Resident updated to housing_pending:', updateResult.id);

    // Create task for housing staff (service role OK for task creation)
    const task = await base44.asServiceRole.entities.ServiceTask.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      title: `Housing Placement: ${resident.first_name} ${resident.last_name}`,
      description: `Resident submitted to housing queue. ${reason || 'No additional notes.'}`,
      category: 'housing',
      status: 'pending',
      priority: 'high',
      requires_staff_action: true
    });

    console.log('[HOUSING] Task created:', task.id);

    return Response.json({
      success: true,
      resident_id,
      task_id: task.id,
      message: 'Resident submitted to housing queue'
    });
  } catch (error) {
    console.error('[HOUSING] Housing queue submission error:', error);
    return Response.json({ error: error.message || 'Failed to submit to housing queue' }, { status: 500 });
  }
});