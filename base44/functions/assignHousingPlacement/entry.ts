import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { resident_id, house_id, bed_id } = await req.json();
    if (!resident_id || !house_id || !bed_id) {
      return Response.json({ error: 'resident_id, house_id, bed_id required' }, { status: 400 });
    }

    const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    const house = await base44.asServiceRole.entities.House.get(house_id);
    if (!house) return Response.json({ error: 'House not found' }, { status: 404 });

    const bed = await base44.asServiceRole.entities.Bed.get(bed_id);
    if (!bed) return Response.json({ error: 'Bed not found' }, { status: 404 });

    // Create housing placement record
    const placement = await base44.asServiceRole.entities.HousingPlacement.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      house_id: house.id,
      house_name: house.name,
      room_id: bed.room_number,
      bed_id: bed.id,
      bed_label: bed.bed_label,
      placement_status: 'placed',
      occupancy_status: 'occupied',
      move_in_date: new Date().toISOString().split('T')[0],
      sync_source: 'direct_import'
    });

    // Update bed to occupied
    await base44.asServiceRole.entities.Bed.update(bed_id, {
      status: 'occupied',
      resident_id: resident.id,
      resident_name: `${resident.first_name} ${resident.last_name}`,
      move_in_date: new Date().toISOString().split('T')[0]
    });

    // Update resident status to housed
    await base44.asServiceRole.entities.Resident.update(resident_id, {
      status: 'active',
      expected_exit_date: null
    });

    // Update house occupancy counts
    const allBeds = await base44.asServiceRole.entities.Bed.filter({ house_id });
    const occupiedBeds = allBeds.filter(b => b.status === 'occupied').length;
    await base44.asServiceRole.entities.House.update(house_id, {
      occupied_beds: occupiedBeds
    });

    // Create task for staff
    const task = await base44.asServiceRole.entities.ServiceTask.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      title: `Housing Placement Complete: ${resident.first_name} ${resident.last_name}`,
      description: `Resident placed in ${house.name}, ${bed.bed_label}. Move-in date: ${new Date().toISOString().split('T')[0]}`,
      category: 'housing',
      status: 'completed',
      priority: 'high',
      requires_staff_action: false,
      completed_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      placement_id: placement.id,
      task_id: task.id,
      message: `${resident.first_name} placed in ${house.name}`
    });
  } catch (error) {
    console.error('Housing placement error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});