import { Zap } from 'lucide-react';

export function calcEmploymentReadiness(resident, barriers = [], enrollments = []) {
  let score = 0;
  if (['active', 'employed', 'housing_eligible'].includes(resident?.status)) score += 20;
  const totalBarriers = barriers.length;
  const resolvedBarriers = barriers.filter(b => b.status === 'resolved').length;
  if (totalBarriers > 0) score += Math.round((resolvedBarriers / totalBarriers) * 25);
  else score += 15;
  const completed = enrollments.filter(e => e.status === 'completed').length;
  score += Math.min(completed * 5, 25);
  if (resident?.job_readiness_score) score += Math.min(Math.round(resident.job_readiness_score * 0.3), 30);
  return Math.min(score, 100);
}

export default function ReadinessScoreBadge({ score, showLabel = false }) {
  if (score === undefined || score === null) return null;
  const color = score >= 75
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    : score >= 50
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : 'bg-rose-500/20 text-rose-400 border-rose-500/40';

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${color}`}>
      <Zap className="w-3 h-3" />
      {score}%{showLabel ? ' Ready' : ''}
    </span>
  );
}