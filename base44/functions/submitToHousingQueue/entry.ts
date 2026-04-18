import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { resident_id, reason } = await req.json();
    if (!resident_id) return Response.json({ error: 'resident_id required' }, { status: 400 });

    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    // Mark resident as housing_pending
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      status: 'housing_pending'
    });

    // Create task for housing staff
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

    return Response.json({
      success: true,
      resident_id,
      task_id: task.id,
      message: 'Resident submitted to housing queue'
    });
  } catch (error) {
    console.error('Housing queue submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});