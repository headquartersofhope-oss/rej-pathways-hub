import { base44 } from '@/api/base44Client';

/**
 * Computes a job readiness score (0–100) from the current state of an
 * EmployabilityProfile plus the supporting records for that resident.
 *
 * Weights (must sum to 100):
 *   - Interview score present        25
 *   - Resume on file                 20
 *   - Work preferences set           15
 *   - Skills listed                  10
 *   - Certifications present         10
 *   - References present             10
 *   - Target wage set                 5
 *   - Transportation radius set       5
 */
export function computeReadinessScore({ profile, resumes = [], mockInterviews = [], references = [], certificates = [] }) {
  let score = 0;

  // Interview score (25 pts — proportional to the latest interview overall_score)
  const sortedInterviews = [...mockInterviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestInterview = sortedInterviews[0];
  const interviewScore = latestInterview?.overall_score ?? profile?.interview_readiness_score ?? null;
  if (interviewScore != null) {
    score += Math.round((interviewScore / 100) * 25);
  }

  // Resume on file (20 pts)
  if (resumes.length > 0) score += 20;

  // Work preferences set (15 pts — at least shifts or job types filled in)
  const hasPreferences =
    (profile?.preferred_job_types?.length > 0) ||
    (profile?.desired_industries?.length > 0) ||
    (profile?.available_shifts?.length > 0);
  if (hasPreferences) score += 15;

  // Skills listed (10 pts)
  if ((profile?.skills?.length || 0) > 0) score += 10;

  // Certifications from Learning module (10 pts)
  if (certificates.length > 0) score += 10;

  // Confirmed references (10 pts)
  const confirmedRefs = references.filter(r => r.status === 'confirmed' || !r.status);
  if (confirmedRefs.length > 0) score += 10;

  // Target wage set (5 pts)
  if (profile?.target_hourly_wage) score += 5;

  // Transportation radius set (5 pts)
  if (profile?.transportation_radius_miles) score += 5;

  return Math.min(100, score);
}

/**
 * Computes and writes back the job readiness score to both
 * EmployabilityProfile and Resident in parallel.
 *
 * Safe to call from any save handler — all params are optional and
 * will be fetched live if not supplied.
 */
export async function syncReadinessScore({ profile, residentId, resumes = [], mockInterviews = [], references = [], certificates = [] }) {
  if (!profile?.id || !residentId) return;

  const score = computeReadinessScore({ profile, resumes, mockInterviews, references, certificates });

  // Only write if score differs to avoid unnecessary updates
  await Promise.all([
    base44.entities.EmployabilityProfile.update(profile.id, { job_readiness_score: score }),
    base44.entities.Resident.update(residentId, { job_readiness_score: score }),
  ]);

  return score;
}