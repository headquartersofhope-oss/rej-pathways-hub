import { base44 } from '@/api/base44Client';

/**
 * After a quiz pass, check all certificate pathways to see if the resident
 * has now completed all required classes. Auto-issue any newly earned certs.
 */
export async function checkAndAutoIssueCertificate({ residentId, globalResidentId, organizationId, allEnrollments, allClasses }) {
  const [paths, existingCerts] = await Promise.all([
    base44.entities.CertificatePath.filter({ is_active: true }),
    base44.entities.Certificate.filter({ resident_id: residentId }),
  ]);

  const completedClassIds = new Set(
    allEnrollments.filter(e => e.status === 'completed').map(e => e.class_id)
  );

  const existingCertPathIds = new Set(existingCerts.map(c => c.certificate_path_id));

  for (const path of paths) {
    // Skip if cert already issued
    if (existingCertPathIds.has(path.id)) continue;

    const requiredIds = path.required_class_ids || [];
    if (requiredIds.length === 0) continue;

    // Check if all required classes are completed
    const allDone = requiredIds.every(cid => completedClassIds.has(cid));
    if (!allDone) continue;

    // Get the completed enrollment IDs for this path
    const completedAssignmentIds = allEnrollments
      .filter(e => requiredIds.includes(e.class_id) && e.status === 'completed')
      .map(e => e.id);

    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await base44.entities.Certificate.create({
      resident_id: residentId,
      global_resident_id: globalResidentId,
      certificate_path_id: path.id,
      certificate_name: path.certificate_name,
      category: path.category,
      issued_date: new Date().toISOString().split('T')[0],
      issued_by: 'system',
      issued_by_name: 'System (Auto-issued)',
      organization_id: organizationId,
      completed_classes: completedAssignmentIds,
      certificate_number: certNumber,
    });
  }
}