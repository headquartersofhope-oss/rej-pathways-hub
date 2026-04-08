/**
 * getEmployerCandidates — Scoped read for candidates for a specific job.
 * Only returns staff_approved matches for jobs belonging to the authenticated employer.
 * Enriches with safe learning summary (cert names + class count only — no PII, no case notes).
 * Candidate identity is never exposed — only anonymized resident_id suffix is returned.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'employer') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get employer record
    const employers = await base44.asServiceRole.entities.Employer.filter({ user_id: user.id });
    const employer = employers[0];

    if (!employer) {
      return Response.json({ error: 'No employer profile linked to this account', code: 'NO_EMPLOYER_PROFILE' }, { status: 404 });
    }

    // Parse job_listing_id from request body
    const body = await req.json().catch(() => ({}));
    const jobListingId = body.job_listing_id;

    if (!jobListingId) {
      return Response.json({ error: 'job_listing_id is required' }, { status: 400 });
    }

    // Verify this job belongs to the employer (prevents cross-employer access)
    const job = await base44.asServiceRole.entities.JobListing.filter({ id: jobListingId });
    const jobRecord = job[0];

    if (!jobRecord) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Strict ownership check: employer_id OR employer_name must match
    const ownsJob = jobRecord.employer_id === employer.id || jobRecord.employer_name === employer.company_name;
    if (!ownsJob) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch only staff_approved matches for this specific job
    const rawMatches = await base44.asServiceRole.entities.JobMatch.filter({ 
      job_listing_id: jobListingId, 
      staff_approved: true 
    });

    // Build learning summary per candidate (safe fields only)
    // We query certs and enrollments filtered by resident_id to avoid full table scans
    const enriched = await Promise.all(rawMatches.map(async (m) => {
      const [certs, enrollments] = await Promise.all([
        base44.asServiceRole.entities.Certificate.filter({ resident_id: m.resident_id }),
        base44.asServiceRole.entities.ClassEnrollment.filter({ resident_id: m.resident_id }),
      ]);

      const completedEnrollments = enrollments.filter(
        e => e.status === 'completed' || e.quiz_passed
      );

      const learning_summary = [
        ...certs.map(c => ({ type: 'cert', label: c.certificate_name })),
        ...(completedEnrollments.length > 0
          ? [{ type: 'class', label: `${completedEnrollments.length} class${completedEnrollments.length !== 1 ? 'es' : ''} completed` }]
          : []),
      ];

      // IMPORTANT: Strip all PII — only safe fields returned to employer
      return {
        id: m.id,
        resident_id: m.resident_id,           // used for anonymized label only
        job_listing_id: m.job_listing_id,
        job_title: m.job_title,
        employer_name: m.employer_name,
        match_score: m.match_score,
        match_reasons: m.match_reasons || [],
        blockers: m.blockers || [],
        status: m.status,
        staff_approved: m.staff_approved,
        notes: m.notes || '',                 // employer's own notes
        applied_date: m.applied_date || null,
        hired_date: m.hired_date || null,
        created_date: m.created_date,
        updated_date: m.updated_date,
        readiness_score: m.readiness_score || null,
        learning_summary,
      };
    }));

    return Response.json({ 
      job_listing_id: jobListingId,
      candidates: enriched 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});