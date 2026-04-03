import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resident_id, certificate_path_id } = await req.json();

    if (!resident_id || !certificate_path_id) {
      return Response.json({ error: 'resident_id and certificate_path_id required' }, { status: 400 });
    }

    console.log(`[Certificate Issue] Issuing certificate ${certificate_path_id} to resident ${resident_id}`);

    // Fetch resident
    const residents = await base44.entities.Resident.list();
    const resident = residents.find(r => r.id === resident_id);

    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Fetch certificate path
    const paths = await base44.entities.CertificatePath.list();
    const path = paths.find(p => p.id === certificate_path_id);

    if (!path) {
      return Response.json({ error: 'Certificate path not found' }, { status: 404 });
    }

    // Verify eligibility
    const assignments = await base44.entities.LearningAssignment.list();
    const residentAssignments = assignments.filter(a => a.resident_id === resident_id);

    const requiredClasses = path.required_class_ids || [];
    const requiredAssignments = residentAssignments.filter(a =>
      requiredClasses.includes(a.class_id)
    );

    const completed = requiredAssignments.filter(a =>
      (a.status === 'passed' || a.status === 'completed') &&
      (path.passing_score_required ? a.quiz_passed !== false : true)
    );

    if (completed.length !== requiredClasses.length) {
      return Response.json({
        error: 'Resident not eligible: ' + completed.length + '/' + requiredClasses.length + ' classes completed',
      }, { status: 400 });
    }

    // Check if already issued
    const certificates = await base44.entities.Certificate.list();
    const existing = certificates.find(c =>
      c.resident_id === resident_id && c.certificate_path_id === certificate_path_id
    );

    if (existing) {
      return Response.json({
        success: false,
        message: 'Certificate already issued',
        certificate_id: existing.id,
      });
    }

    // Generate certificate number
    const certNumber = `CERT-${resident.global_resident_id}-${Date.now().toString(36).toUpperCase()}`;

    // Issue certificate
    const certificate = await base44.entities.Certificate.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      certificate_path_id: path.id,
      certificate_name: path.certificate_name,
      category: path.category,
      issued_date: new Date().toISOString().split('T')[0],
      issued_by: user.email,
      issued_by_name: user.full_name,
      organization_id: resident.organization_id,
      completed_classes: completed.map(a => a.id),
      certificate_number: certNumber,
    });

    console.log(`[Certificate Issue] Certificate ${certificate.id} issued successfully`);

    return Response.json({
      success: true,
      certificate_id: certificate.id,
      certificate_number: certNumber,
      certificate_name: path.certificate_name,
      issued_date: certificate.issued_date,
      issued_by: user.full_name,
      message: `Certificate issued successfully`,
    });
  } catch (error) {
    console.error('[Certificate Issue] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});