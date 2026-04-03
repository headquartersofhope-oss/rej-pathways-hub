import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resident_id } = await req.json();

    if (!resident_id) {
      return Response.json({ error: 'resident_id required' }, { status: 400 });
    }

    console.log(`[Certificate Eligibility] Checking eligibility for resident ${resident_id}`);

    // Fetch resident
    const residents = await base44.entities.Resident.list();
    const resident = residents.find(r => r.id === resident_id);

    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Fetch all certificate paths
    const paths = await base44.entities.CertificatePath.list();
    const activePaths = paths.filter(p => p.is_active);

    // Fetch resident assignments
    const assignments = await base44.entities.LearningAssignment.list();
    const residentAssignments = assignments.filter(a => a.resident_id === resident_id);

    // Fetch completed certificates
    const certificates = await base44.entities.Certificate.list();
    const earnedCerts = new Set(
      certificates
        .filter(c => c.resident_id === resident_id)
        .map(c => c.certificate_path_id)
    );

    // Check eligibility for each certificate
    const eligibility = [];

    for (const path of activePaths) {
      if (earnedCerts.has(path.id)) {
        // Already earned
        continue;
      }

      const requiredClasses = path.required_class_ids || [];
      const requiredAssignments = residentAssignments.filter(a =>
        requiredClasses.includes(a.class_id)
      );

      const completed = requiredAssignments.filter(a =>
        (a.status === 'passed' || a.status === 'completed') &&
        (path.passing_score_required ? a.quiz_passed !== false : true)
      );

      const progress = requiredClasses.length > 0
        ? Math.round((completed.length / requiredClasses.length) * 100)
        : 0;

      const isEligible = completed.length === requiredClasses.length && requiredClasses.length > 0;

      eligibility.push({
        certificate_path_id: path.id,
        certificate_name: path.certificate_name,
        category: path.category,
        description: path.description,
        progress: progress,
        total_required: requiredClasses.length,
        completed_count: completed.length,
        is_eligible: isEligible,
        completed_class_ids: completed.map(a => a.id),
      });
    }

    const eligible = eligibility.filter(e => e.is_eligible);

    console.log(`[Certificate Eligibility] Found ${eligible.length} eligible certificates`);

    return Response.json({
      success: true,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      certificates: eligibility.sort((a, b) => b.progress - a.progress),
      eligible_count: eligible.length,
      eligible_certificates: eligible,
      message: `Resident is eligible for ${eligible.length} certificate${eligible.length !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('[Certificate Eligibility] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});