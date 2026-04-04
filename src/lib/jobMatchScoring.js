/**
 * Job Match Scoring Engine
 * Computes a 0-100 fit score between a resident's profile and a job listing.
 * Uses global_resident_id as the master identity link.
 */

/**
 * @param {object} opts
 * @param {object} opts.resident - Resident entity record
 * @param {object|null} opts.profile - EmployabilityProfile record
 * @param {Array} opts.barriers - BarrierItem records
 * @param {Array} opts.certificates - Certificate entity records (learning certs)
 * @param {Array} opts.completedEnrollments - ClassEnrollment records with status 'completed' or quiz_passed=true
 * @param {object} opts.job - JobListing record
 */
export function computeMatchScore({ resident, profile, barriers = [], certificates = [], completedEnrollments = [], job }) {
  let score = 50; // baseline
  const reasons = [];
  const blockers = [];

  const readiness = profile?.job_readiness_score ?? resident?.job_readiness_score ?? 0;
  const interviewScore = profile?.interview_readiness_score ?? null;
  const resumeStatus = profile?.resume_status ?? 'none';
  const missingDocs = (resident?.missing_documents ?? []).filter(Boolean);
  const activeBarriers = barriers.filter(b => b.status !== 'resolved');
  const activeBarrierCategories = new Set(activeBarriers.map(b => b.category));

  // --- Readiness score contribution (up to 20 pts) ---
  if (readiness >= 80) { score += 20; reasons.push('High job readiness score'); }
  else if (readiness >= 60) { score += 10; reasons.push('Moderate job readiness score'); }
  else if (readiness < 40) { score -= 10; blockers.push('Low job readiness score — complete more readiness steps'); }

  // --- Resume status (up to 10 pts) ---
  if (resumeStatus === 'complete') { score += 10; reasons.push('Resume complete and ready to submit'); }
  else if (resumeStatus === 'staff_reviewed') { score += 7; reasons.push('Resume reviewed by staff'); }
  else if (resumeStatus === 'draft') { score += 3; blockers.push('Resume is still a draft — needs completion'); }
  else { score -= 5; blockers.push('No resume on file'); }

  // --- Interview readiness (up to 10 pts) ---
  if (interviewScore != null) {
    if (interviewScore >= 75) { score += 10; reasons.push(`Strong mock interview score (${interviewScore}/100)`); }
    else if (interviewScore >= 55) { score += 5; reasons.push(`Mock interview completed (${interviewScore}/100)`); }
    else { score += 2; blockers.push(`Low mock interview score (${interviewScore}/100) — more practice needed`); }
  } else {
    blockers.push('No mock interview on record');
  }

  // --- Missing documents penalty ---
  if (missingDocs.length > 0) {
    score -= Math.min(missingDocs.length * 5, 15);
    blockers.push(`Missing documents required for employment: ${missingDocs.slice(0, 3).join(', ')}${missingDocs.length > 3 ? ` +${missingDocs.length - 3} more` : ''}`);
  }

  // --- Active barriers — category-specific penalties ---
  if (activeBarrierCategories.has('transportation')) {
    score -= 8;
    blockers.push('Active transportation barrier — commuting to work may be difficult');
  }
  if (activeBarrierCategories.has('identification_documents')) {
    score -= 8;
    blockers.push('Missing identification documents needed for hiring');
  }
  if (activeBarrierCategories.has('legal')) {
    score -= 5;
    blockers.push('Active legal/justice barrier — may affect employer background check');
  }
  if (activeBarrierCategories.has('housing_stability')) {
    score -= 3;
    blockers.push('Housing instability may impact reliability');
  }
  // General penalty for remaining active barriers not already penalized above
  const penalizedCategories = new Set(['transportation', 'identification_documents', 'legal', 'housing_stability']);
  const otherActiveBarriers = activeBarriers.filter(b => !penalizedCategories.has(b.category));
  if (otherActiveBarriers.length > 2) { score -= 10; blockers.push('Multiple other active barriers remain open'); }
  else if (otherActiveBarriers.length > 0) { score -= otherActiveBarriers.length * 3; }

  // --- Second chance / veteran friendly flags (up to 10 pts) ---
  if (job.second_chance_friendly && resident?.population === 'justice_impacted') {
    score += 10; reasons.push('Second-chance friendly employer — open to justice-impacted candidates');
  }
  if (job.veteran_friendly && resident?.population === 'homeless_veteran') {
    score += 10; reasons.push('Veteran-friendly employer');
  }

  // --- Shift availability match (up to 8 pts) ---
  const residentShifts = profile?.available_shifts ?? [];
  const jobShifts = job.shifts ?? [];
  if (residentShifts.length && jobShifts.length) {
    const overlap = residentShifts.filter(s => jobShifts.includes(s));
    if (overlap.length) {
      score += 8;
      reasons.push(`Schedule aligns — ${overlap.map(s => s.replace('_', ' ')).join(', ')} shifts available`);
    } else {
      score -= 8;
      blockers.push(`Schedule mismatch — job requires ${jobShifts.join('/')} but resident is available for ${residentShifts.join('/')}`);
    }
  } else if (residentShifts.includes('flexible') || jobShifts.includes('flexible')) {
    score += 4;
    reasons.push('Flexible schedule — can accommodate most shifts');
  }

  // --- Wage target match (up to 5 pts) ---
  const targetWage = profile?.target_hourly_wage;
  if (targetWage && job.wage_min) {
    if (job.wage_min >= targetWage) {
      score += 5;
      reasons.push(`Meets wage target — starts at $${job.wage_min}/hr (target: $${targetWage}/hr)`);
    } else if (job.wage_max && job.wage_max >= targetWage) {
      score += 3;
      reasons.push(`Wage range includes target — up to $${job.wage_max}/hr`);
    } else {
      blockers.push(`Wage below target — job pays $${job.wage_min}${job.wage_max ? `–$${job.wage_max}` : ''}/hr, target is $${targetWage}/hr`);
    }
  }

  // --- Transportation (up to 5 pts) ---
  const transportRadius = profile?.transportation_radius_miles;
  const maxCommute = job.max_commute_miles;
  if (job.is_remote) {
    score += 5;
    reasons.push('Remote-eligible — no commute required');
  } else if (job.transportation_accessible) {
    score += 3;
    reasons.push('Transit-accessible location');
  } else if (transportRadius && maxCommute && transportRadius < maxCommute) {
    score -= 8;
    blockers.push(`Likely outside transportation range — job is ${maxCommute} mi radius, resident can commute ${transportRadius} mi`);
  } else if (activeBarrierCategories.has('transportation') && !job.transportation_accessible && !job.is_remote) {
    blockers.push('Transportation barrier active and job location may not be transit-accessible');
  }

  // --- Skills match (up to 8 pts) ---
  const residentSkills = (profile?.skills ?? []).map(s => s.toLowerCase());
  const requiredSkills = (job.skills_required ?? []).map(s => s.toLowerCase());
  if (residentSkills.length && requiredSkills.length) {
    const matched = requiredSkills.filter(rs =>
      residentSkills.some(s => s.includes(rs) || rs.includes(s))
    );
    if (matched.length === requiredSkills.length) {
      score += 8;
      reasons.push(`All required skills matched: ${matched.join(', ')}`);
    } else if (matched.length > 0) {
      score += Math.round((matched.length / requiredSkills.length) * 8);
      const missing = requiredSkills.filter(rs => !residentSkills.some(s => s.includes(rs) || rs.includes(s)));
      reasons.push(`${matched.length} of ${requiredSkills.length} required skills matched`);
      if (missing.length) blockers.push(`Missing skills for this role: ${missing.join(', ')}`);
    } else {
      score -= 5;
      blockers.push(`No matching skills for required: ${requiredSkills.slice(0, 3).join(', ')}`);
    }
  } else if (residentSkills.length > 0) {
    score += 3;
    reasons.push(`${residentSkills.length} skills on profile`);
  }

  // --- Certifications match (up to 10 pts) ---
  // Merge: Certificate entity records + profile.certifications (free-text) + completed learning class names
  const certNamesFromRecords = certificates.map(c => (c.certificate_name || '').toLowerCase());
  const certNamesFromProfile = (profile?.certifications ?? []).map(c => c.toLowerCase());
  // Treat completed class enrollments as evidence of skill/knowledge — titles used for cert fuzzy-match
  const completedClassTitles = completedEnrollments.map(e => (e.class_title || '').toLowerCase()).filter(Boolean);
  const certNames = [...new Set([...certNamesFromRecords, ...certNamesFromProfile, ...completedClassTitles])];
  const requiredCerts = (job.certifications_required || []).map(c => c.toLowerCase());
  if (requiredCerts.length) {
    const matched = requiredCerts.filter(rc => certNames.some(cn => cn.includes(rc) || rc.includes(cn)));
    const missing = requiredCerts.filter(rc => !certNames.some(cn => cn.includes(rc) || rc.includes(cn)));
    if (matched.length === requiredCerts.length) {
      score += 10;
      reasons.push(`All required certifications held: ${matched.map(c => c).join(', ')}`);
    } else if (matched.length > 0) {
      score += 4;
      reasons.push(`${matched.length} of ${requiredCerts.length} required certifications held`);
      blockers.push(`Missing certifications required for this role: ${missing.join(', ')} — complete relevant learning classes to qualify`);
    } else {
      score -= 5;
      blockers.push(`Missing required certifications: ${requiredCerts.join(', ')} — complete relevant classes in the Learning Center`);
    }
  }

  // --- Completed learning classes bonus (up to 5 pts) ---
  if (completedEnrollments.length >= 5) {
    score += 5;
    reasons.push(`${completedEnrollments.length} learning classes completed — demonstrates initiative`);
  } else if (completedEnrollments.length >= 2) {
    score += 2;
    reasons.push(`${completedEnrollments.length} learning classes completed`);
  }

  // --- Preferred industries / job types (up to 5 pts) ---
  const desiredIndustries = (profile?.desired_industries || []).map(i => i.toLowerCase());
  const preferredJobTypes = (profile?.preferred_job_types || []).map(t => t.toLowerCase());
  if (desiredIndustries.length && job.industry) {
    if (desiredIndustries.some(d => job.industry.toLowerCase().includes(d) || d.includes(job.industry.toLowerCase()))) {
      score += 5;
      reasons.push(`Aligns with desired industry: ${job.industry}`);
    }
  }
  if (preferredJobTypes.length && job.schedule_type) {
    if (preferredJobTypes.includes(job.schedule_type)) {
      score += 3;
      reasons.push(`Matches preferred work type: ${job.schedule_type.replace('_', ' ')}`);
    }
  }

  // --- Accommodations needed check ---
  // accommodations_needed is a string field — treat non-empty as needing accommodations
  const needsAccommodations = profile?.accommodations_needed && profile.accommodations_needed.trim().length > 0;
  if (needsAccommodations && !job.accommodations_available) {
    score -= 5;
    blockers.push(`Resident needs accommodations (${profile.accommodations_needed}) but job listing does not indicate they are available`);
  } else if (needsAccommodations && job.accommodations_available) {
    score += 3;
    reasons.push('Job offers accommodations that match resident needs');
  }

  // --- Background check / drug test flags ---
  if (job.background_check_required && resident?.population === 'justice_impacted') {
    score -= 5;
    blockers.push('Background check required — may be a concern given justice-involved history');
  }
  if (job.drug_test_required && activeBarrierCategories.has('substance_recovery')) {
    score -= 5;
    blockers.push('Drug test required — resident has an active substance recovery barrier');
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