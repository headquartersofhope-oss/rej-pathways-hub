/**
 * generateResume
 *
 * Auto-generates a draft ResumeRecord for a resident from their existing
 * Pathways data:
 *   - Resident (name, contact)
 *   - EmployabilityProfile (skills, preferences, summary)
 *   - JobPlacement (work history)
 *   - Certificate (credentials)
 *
 * Idempotent: updates existing draft if one exists; otherwise creates new.
 * Returns the print URL the staff member can hand to the resident or employer.
 *
 * Call as:
 *   base44.functions.invoke('generateResume', { resident_id: 'res_abc' })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const residentId = body.resident_id;

    if (!residentId) {
      return Response.json({ error: 'Missing resident_id' }, { status: 400 });
    }

    // === Fetch resident ===
    let resident;
    try {
      resident = await base44.asServiceRole.entities.Resident.get(residentId);
    } catch (e) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    // === Fetch related data ===
    const profiles = await base44.asServiceRole.entities.EmployabilityProfile.filter({ resident_id: residentId });
    const profile = profiles[0] || {};

    let placements = [];
    try {
      placements = await base44.asServiceRole.entities.JobPlacement.filter({ resident_id: residentId });
    } catch (_) {
      // entity may not exist in all installs; continue without
    }

    let certs = [];
    try {
      certs = await base44.asServiceRole.entities.Certificate.filter({ resident_id: residentId });
    } catch (_) {}

    // === Build resume content ===
    const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(' ');

    const objective = profile.is_job_ready
      ? `Reliable, hardworking professional ready for ${(profile.preferred_job_types || []).join(', ') || 'opportunities'} positions. Bringing ${(profile.skills || []).length} demonstrable skills and a strong commitment to growth.`
      : `Motivated individual building professional skills and ready to contribute to a team. Available immediately for ${(profile.available_shifts || ['flexible']).join(', ')} shifts.`;

    const workHistory = placements.map(p => ({
      employer: p.employer_name || 'Employer',
      title: p.job_title || p.position || 'Position',
      start_date: p.start_date || '',
      end_date: p.end_date || (p.status === 'active' ? 'Present' : ''),
      description: p.responsibilities || p.notes || '',
    }));

    const certifications = certs.map(c => c.name || c.title || c.certification_name).filter(Boolean);
    // Also pull certifications captured on the EmployabilityProfile
    if (profile.certifications) {
      for (const c of profile.certifications) {
        if (!certifications.includes(c)) certifications.push(c);
      }
    }

    const resumeData: any = {
      resident_id: residentId,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      version_label: `Auto-generated ${new Date().toISOString().split('T')[0]}`,
      status: 'draft',
      full_name: fullName,
      phone: resident.phone || '',
      email: resident.email || '',
      address: resident.address || '',
      objective,
      skills: profile.skills || [],
      work_history: workHistory,
      education: [],
      certifications,
      references: [],
      staff_notes: 'Auto-generated. Review for accuracy and add education + references before sharing with employer.',
      created_by: 'system',
    };

    // === Find existing draft or create new ===
    const existing = await base44.asServiceRole.entities.ResumeRecord.filter({
      resident_id: residentId,
      status: 'draft',
    });

    let resume;
    if (existing.length > 0) {
      resume = await base44.asServiceRole.entities.ResumeRecord.update(existing[0].id, resumeData);
    } else {
      resume = await base44.asServiceRole.entities.ResumeRecord.create(resumeData);
    }

    // Update EmployabilityProfile.resume_status
    if (profile.id) {
      try {
        await base44.asServiceRole.entities.EmployabilityProfile.update(profile.id, {
          resume_status: 'draft',
        });
      } catch (e) {
        console.warn('[generateResume] Failed to update EmployabilityProfile:', e.message);
      }
    }

    return Response.json({
      success: true,
      resume_id: resume.id,
      resident_id: residentId,
      version_label: resumeData.version_label,
      print_url: `/resume/${residentId}`,
      stats: {
        skills: (profile.skills || []).length,
        work_history_entries: workHistory.length,
        certifications: certifications.length,
      },
    });

  } catch (error) {
    console.error('[generateResume] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
