/**
 * Job Match Scoring Engine
 * Computes a 0-100 fit score between a resident's profile and a job listing.
 * Uses global_resident_id as the master identity link.
 */

export function computeMatchScore({ resident, profile, barriers = [], certificates = [], job }) {
  let score = 50; // baseline
  const reasons = [];
  const blockers = [];

  const readiness = profile?.job_readiness_score ?? resident?.job_readiness_score ?? 0;
  const interviewScore = profile?.interview_readiness_score ?? null;
  const resumeStatus = profile?.resume_status ?? 'none';
  const missingDocs = resident?.missing_documents?.filter(Boolean) ?? [];
  const activeBarriers = barriers.filter(b => b.status !== 'resolved');

  // --- Readiness score contribution (up to 20 pts) ---
  if (readiness >= 80) { score += 20; reasons.push('High job readiness score'); }
  else if (readiness >= 60) { score += 10; reasons.push('Moderate job readiness score'); }
  else if (readiness < 40) { score -= 10; blockers.push('Low job readiness score'); }

  // --- Resume status (up to 10 pts) ---
  if (resumeStatus === 'complete') { score += 10; reasons.push('Resume complete'); }
  else if (resumeStatus === 'staff_reviewed') { score += 7; reasons.push('Resume reviewed by staff'); }
  else if (resumeStatus === 'draft') { score += 3; }
  else { score -= 5; blockers.push('No resume on file'); }

  // --- Interview readiness (up to 10 pts) ---
  if (interviewScore != null) {
    if (interviewScore >= 75) { score += 10; reasons.push('Strong mock interview performance'); }
    else if (interviewScore >= 55) { score += 5; reasons.push('Completed mock interview'); }
    else { score += 2; blockers.push('Low mock interview score'); }
  } else {
    blockers.push('No mock interview recorded');
  }

  // --- Missing documents penalty ---
  if (missingDocs.length > 0) {
    score -= Math.min(missingDocs.length * 5, 15);
    blockers.push(`Missing documents: ${missingDocs.slice(0, 3).join(', ')}`);
  }

  // --- Active barriers penalty ---
  if (activeBarriers.length > 3) { score -= 15; blockers.push('Multiple active barriers'); }
  else if (activeBarriers.length > 0) { score -= activeBarriers.length * 3; }

  // --- Second chance / veteran friendly flags (up to 10 pts) ---
  if (job.second_chance_friendly && resident?.population === 'justice_impacted') {
    score += 10; reasons.push('Second-chance friendly employer');
  }
  if (job.veteran_friendly && resident?.population === 'homeless_veteran') {
    score += 10; reasons.push('Veteran-friendly employer');
  }

  // --- Shift availability match (up to 8 pts) ---
  const residentShifts = profile?.available_shifts ?? [];
  const jobShifts = job.shifts ?? [];
  if (residentShifts.length && jobShifts.length) {
    const overlap = residentShifts.filter(s => jobShifts.includes(s));
    if (overlap.length) { score += 8; reasons.push(`Shift match: ${overlap.join(', ')}`); }
    else { score -= 8; blockers.push('Shift availability mismatch'); }
  }

  // --- Wage target match (up to 5 pts) ---
  const targetWage = profile?.target_hourly_wage;
  if (targetWage && job.wage_min) {
    if (job.wage_min >= targetWage) { score += 5; reasons.push('Meets wage target'); }
    else if (job.wage_max && job.wage_max >= targetWage) { score += 3; }
    else { blockers.push(`Wage may be below target ($${targetWage}/hr)`); }
  }

  // --- Transportation (up to 5 pts) ---
  const transportRadius = profile?.transportation_radius_miles;
  const maxCommute = job.max_commute_miles;
  if (job.is_remote) { score += 5; reasons.push('Remote-eligible position'); }
  else if (job.transportation_accessible) { score += 3; reasons.push('Transit-accessible location'); }
  else if (transportRadius && maxCommute && transportRadius < maxCommute) {
    score -= 8; blockers.push('May be outside transportation range');
  }

  // --- Certifications match (up to 10 pts) ---
  const certNames = certificates.map(c => (c.certificate_name || '').toLowerCase());
  const requiredCerts = (job.certifications_required || []).map(c => c.toLowerCase());
  if (requiredCerts.length) {
    const matched = requiredCerts.filter(rc => certNames.some(cn => cn.includes(rc) || rc.includes(cn)));
    if (matched.length === requiredCerts.length) { score += 10; reasons.push('All required certifications held'); }
    else if (matched.length > 0) { score += 4; blockers.push(`Missing some certifications: ${requiredCerts.filter(rc => !certNames.some(cn => cn.includes(rc))).join(', ')}`); }
    else { score -= 5; blockers.push(`Missing required certifications: ${requiredCerts.join(', ')}`); }
  }

  // --- Preferred industries / job types (up to 5 pts) ---
  const desiredIndustries = (profile?.desired_industries || []).map(i => i.toLowerCase());
  if (desiredIndustries.length && job.industry) {
    if (desiredIndustries.some(d => job.industry.toLowerCase().includes(d) || d.includes(job.industry.toLowerCase()))) {
      score += 5; reasons.push('Matches desired industry');
    }
  }

  // --- Accommodations needed check ---
  if (profile?.accommodations_needed && !job.accommodations_available) {
    score -= 5; blockers.push('Accommodations may not be available');
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { match_score: score, match_reasons: reasons, blockers };
}

export function matchLabel(score) {
  if (score >= 80) return { label: 'Excellent Match', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (score >= 65) return { label: 'Good Match', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
  if (score >= 45) return { label: 'Possible Match', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { label: 'Poor Fit', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
}

export const JOB_STATUSES = {
  recommended: { label: 'Recommended', color: 'bg-blue-50 text-blue-700' },
  viewed: { label: 'Viewed', color: 'bg-slate-50 text-slate-700' },
  applied: { label: 'Applied', color: 'bg-purple-50 text-purple-700' },
  interview_requested: { label: 'Interview Requested', color: 'bg-amber-50 text-amber-700' },
  interview_scheduled: { label: 'Interview Scheduled', color: 'bg-orange-50 text-orange-700' },
  hired: { label: 'Hired', color: 'bg-emerald-50 text-emerald-700' },
  not_selected: { label: 'Not Selected', color: 'bg-red-50 text-red-700' },
  retained_30: { label: 'Retained 30 Days', color: 'bg-teal-50 text-teal-700' },
  retained_60: { label: 'Retained 60 Days', color: 'bg-teal-50 text-teal-700' },
  retained_90: { label: 'Retained 90 Days', color: 'bg-teal-50 text-teal-700' },
};