import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get system health
    const systemHealth = await getSystemHealthData(base44);

    // Get all residents with status
    const allResidents = await base44.asServiceRole.entities.Resident.list();
    const residentsWithStatus = allResidents.map(r => ({
      id: r.id,
      name: r.data?.first_name && r.data?.last_name ? `${r.data.first_name} ${r.data.last_name}` : 'Unknown',
      status: r.data?.status,
      housing: r.data?.housing || 'None',
      caseManager: r.data?.assigned_case_manager,
    }));

    // Get housing inventory
    const allHouses = await base44.asServiceRole.entities.House.list();
    const housingInventory = allHouses.map(h => {
      const totalBeds = h.data?.total_beds || 0;
      const occupiedBeds = h.data?.occupied_beds || 0;
      return {
        name: h.data?.name || 'Unknown',
        totalBeds,
        occupied: occupiedBeds,
        available: totalBeds - occupiedBeds,
        status: h.data?.status,
      };
    });

    // Get all open transportation requests
    const transportationRequests = await base44.asServiceRole.entities.TransportationRequest.filter({
      status: { $in: ['pending', 'approved', 'scheduled', 'in_progress'] },
    });

    // Get overdue tasks
    const allTasks = await base44.asServiceRole.entities.ServiceTask.list();
    const overdueTasks = allTasks.filter(t => {
      const dueDate = new Date(t.data?.due_date);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return dueDate < sevenDaysAgo && t.data?.status !== 'completed';
    });

    // Get pending housing referrals
    const pendingReferrals = await base44.asServiceRole.entities.HousingReferral.filter({
      status: { $in: ['draft', 'ready_to_submit', 'submitted', 'under_review'] },
    });

    // Get case manager workload
    const caseManagers = await base44.asServiceRole.entities.UserProfile.filter({
      app_role: 'case_manager',
    });

    const caseManagerWorkload = {};
    for (const cm of caseManagers) {
      const assignedCount = allResidents.filter(
        r => r.data?.assigned_case_manager_id === cm.id
      ).length;
      caseManagerWorkload[cm.data?.full_name || 'Unknown'] = assignedCount;
    }

    // Get bed occupancy
    const allBeds = await base44.asServiceRole.entities.Bed.list();
    const bedOccupancy = {
      total: allBeds.length,
      occupied: allBeds.filter(b => b.data?.status === 'occupied').length,
      available: allBeds.filter(b => b.data?.status === 'available').length,
      reserved: allBeds.filter(b => b.data?.status === 'reserved').length,
      maintenance: allBeds.filter(b => b.data?.status === 'maintenance').length,
    };

    const snapshot = {
      timestamp: new Date().toISOString(),
      systemHealth,
      residentsCount: residentsWithStatus.length,
      residents: residentsWithStatus.slice(0, 50), // Limit for size
      housingInventory,
      openTransportationRequests: transportationRequests.length,
      overdueTasksCount: overdueTasks.length,
      overdueTasks: overdueTasks.slice(0, 10),
      pendingReferralsCount: pendingReferrals.length,
      caseManagerWorkload,
      bedOccupancy,
    };

    return Response.json({ success: true, snapshot });
  } catch (error) {
    console.error('Error getting system snapshot:', error);
    return Response.json(
      { error: error.message || 'Failed to generate snapshot' },
      { status: 500 }
    );
  }
});

const getSystemHealthData = async (base44) => {
  try {
    const response = await base44.functions.invoke('getSystemHealth', {});
    return response.data || {};
  } catch {
    return {
      status: 'Unknown',
      message: 'Unable to retrieve system health',
    };
  }
};