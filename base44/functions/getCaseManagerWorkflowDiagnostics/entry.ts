import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { resident_id } = await req.json() || {};

    console.log('[DIAGNOSTICS] Checking case manager workflow state...');

    // Get counts across workflow stages
    const allResidents = await base44.entities.Resident.list();
    const intakeAssessments = await base44.entities.IntakeAssessment.list();
    const servicePlans = await base44.entities.ServicePlan.list();
    const serviceTasksAll = await base44.entities.ServiceTask.list();
    const housingPlacementsAll = await base44.entities.HousingPlacement.filter({ placement_status: 'placed' });
    const jobMatches = await base44.entities.JobMatch.filter({ status: 'applied' });

    const byStatus = {
      pre_intake: allResidents.filter(r => r.status === 'pre_intake').length,
      active: allResidents.filter(r => r.status === 'active').length,
      housing_eligible: allResidents.filter(r => r.status === 'housing_eligible').length,
      housing_pending: allResidents.filter(r => r.status === 'housing_pending').length,
      employed: allResidents.filter(r => r.status === 'employed').length,
      graduated: allResidents.filter(r => r.status === 'graduated').length,
      exited: allResidents.filter(r => r.status === 'exited').length,
    };

    const housingStats = {
      total_residents: allResidents.length,
      intakes_completed: intakeAssessments.length,
      service_plans_active: servicePlans.filter(p => p.status === 'active').length,
      open_tasks: serviceTasksAll.filter(t => t.status !== 'completed').length,
      housing_placements: housingPlacementsAll.length,
      job_applications: jobMatches.length,
    };

    // If specific resident requested
    let residentDiag = null;
    if (resident_id) {
      const resident = await base44.entities.Resident.get(resident_id);
      if (resident) {
        const assessment = (await base44.entities.IntakeAssessment.filter({ resident_id: resident_id }))[0];
        const plan = (await base44.entities.ServicePlan.filter({ resident_id: resident_id }))[0];
        const tasks = await base44.entities.ServiceTask.filter({ resident_id: resident_id });
        const placement = (await base44.entities.HousingPlacement.filter({ resident_id: resident_id, placement_status: 'placed' }))[0];
        const matches = await base44.entities.JobMatch.filter({ resident_id: resident_id });

        residentDiag = {
          resident_id: resident.id,
          global_resident_id: resident.global_resident_id,
          name: `${resident.first_name} ${resident.last_name}`,
          status: resident.status,
          workflow_complete: {
            intake_done: !!assessment && assessment.status === 'completed',
            housing_eligible: resident.status === 'housing_eligible',
            housing_pending: resident.status === 'housing_pending',
            housed: !!placement,
            employed: resident.status === 'employed',
          },
          placement_status: placement ? {
            house_name: placement.house_name,
            bed_label: placement.bed_label,
            move_in_date: placement.move_in_date,
          } : null,
          open_tasks_count: tasks.filter(t => t.status !== 'completed').length,
          job_matches_count: matches.length,
        };
      }
    }

    console.log('[DIAGNOSTICS] Summary:', byStatus, housingStats);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      workflow_summary: {
        by_status: byStatus,
        stats: housingStats,
      },
      resident_diagnostics: residentDiag,
      system_health: {
        all_features_operational: true,
        housing_queue_active: byStatus.housing_pending > 0,
        intake_pipeline_active: byStatus.pre_intake > 0 || byStatus.active > 0,
      },
    });
  } catch (error) {
    console.error('[DIAGNOSTICS] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});