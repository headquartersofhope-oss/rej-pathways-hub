/**
 * getEmployerJobs — Scoped read for employer job listings + candidate counts.
 * Only returns jobs that belong to the authenticated employer's linked Employer record.
 * No cross-employer leakage possible since employer record is fetched server-side from user.id.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only employer role can use this endpoint
    if (user.role !== 'employer') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the employer record linked to this user
    const employers = await base44.asServiceRole.entities.Employer.filter({ user_id: user.id });
    const employer = employers[0];

    if (!employer) {
      return Response.json({ error: 'No employer profile linked to this account', code: 'NO_EMPLOYER_PROFILE' }, { status: 404 });
    }

    // Fetch only this employer's job listings
    const listings = await base44.asServiceRole.entities.JobListing.filter({ employer_id: employer.id });

    // Fetch approved matches for this employer's listings only
    const listingIds = listings.map(j => j.id);

    // Fetch match counts per listing (only staff_approved=true)
    let matchCounts = {};
    let hiredCounts = {};

    if (listingIds.length > 0) {
      // Fetch all approved matches for this employer's jobs
      // We do this per-listing to avoid full table scan exposure
      // Base44 filter doesn't support IN queries directly, so we fetch by employer_name as secondary
      const allMatches = await base44.asServiceRole.entities.JobMatch.filter({ 
        employer_name: employer.company_name,
        staff_approved: true 
      });

      for (const m of allMatches) {
        if (listingIds.includes(m.job_listing_id)) {
          matchCounts[m.job_listing_id] = (matchCounts[m.job_listing_id] || 0) + 1;
          if (m.status === 'hired' || m.status?.startsWith('retained')) {
            hiredCounts[m.job_listing_id] = (hiredCounts[m.job_listing_id] || 0) + 1;
          }
        }
      }
    }

    // Return listings sorted by created_date desc, with match counts attached
    const result = listings
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .map(j => ({
        ...j,
        _match_count: matchCounts[j.id] || 0,
        _hired_count: hiredCounts[j.id] || 0,
      }));

    return Response.json({ 
      employer_id: employer.id,
      employer_name: employer.company_name,
      listings: result 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});