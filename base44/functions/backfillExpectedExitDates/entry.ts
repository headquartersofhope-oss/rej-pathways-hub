import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // RULE 1: Authenticate first
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RULE 2: Admin-only - backfill is system maintenance
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // RULE 3: Only use asServiceRole after auth + authz verified
    // Get all residents with intake_date but no expected_exit_date
    const allResidents = await base44.asServiceRole.entities.Resident.list();
    const needsBackfill = allResidents.filter(r => r.intake_date && !r.expected_exit_date);

    const results = [];
    for (const resident of needsBackfill) {
      const intakeDate = new Date(resident.intake_date);
      const expectedExitDate = new Date(intakeDate.getTime() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      await base44.asServiceRole.entities.Resident.update(resident.id, {
        expected_exit_date: expectedExitDate,
      });

      results.push({
        resident_id: resident.global_resident_id || resident.id,
        intake_date: resident.intake_date,
        expected_exit_date: expectedExitDate,
      });
    }

    return Response.json({
      success: true,
      message: `Backfilled expected_exit_date for ${results.length} residents`,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});