import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Target, CheckCircle2, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

const PIPELINE_STAGES = [
  { key: 'recommended', label: 'Matched', step: 1 },
  { key: 'viewed', label: 'Reviewed', step: 2 },
  { key: 'applied', label: 'Applied', step: 3 },
  { key: 'interview_requested', label: 'Interview Requested', step: 4 },
  { key: 'interview_scheduled', label: 'Interview Scheduled', step: 5 },
  { key: 'hired', label: 'Hired!', step: 6 },
  { key: 'not_selected', label: 'Not Selected', step: 0 },
  { key: 'retained_30', label: 'Retained 30 Days', step: 7 },
  { key: 'retained_60', label: 'Retained 60 Days', step: 7 },
  { key: 'retained_90', label: 'Retained 90 Days', step: 8 },
];

const STATUS_COLORS = {
  recommended: 'bg-blue-50 text-blue-700',
  viewed: 'bg-slate-100 text-slate-600',
  applied: 'bg-purple-50 text-purple-700',
  interview_requested: 'bg-amber-50 text-amber-700',
  interview_scheduled: 'bg-orange-50 text-orange-700',
  hired: 'bg-emerald-50 text-emerald-700',
  not_selected: 'bg-slate-100 text-slate-500',
  retained_30: 'bg-green-50 text-green-700',
  retained_60: 'bg-green-100 text-green-800',
  retained_90: 'bg-emerald-100 text-emerald-800',
};

function getPipelineStep(status) {
  return PIPELINE_STAGES.find(s => s.key === status)?.step || 0;
}

function MatchProgressBar({ status }) {
  const step = getPipelineStep(status);
  if (status === 'not_selected') return null;
  const pct = Math.min(Math.round((step / 8) * 100), 100);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">Progress</span>
        <span className="text-[10px] font-medium">{PIPELINE_STAGES.find(s => s.key === status)?.label || status}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export default function MyJobs() {
  const { user } = useOutletContext();

  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: jobMatches = [], isLoading } = useQuery({
    queryKey: ['my-job-matches', myResident?.id],
    queryFn: () => base44.entities.JobMatch.filter({ resident_id: myResident.id, staff_approved: true }),
    enabled: !!myResident?.id,
  });

  const activeMatches = jobMatches.filter(m => m.status !== 'not_selected');
  const hiredMatches = jobMatches.filter(m => m.status === 'hired' || m.status?.startsWith('retained'));
  const inProgressMatches = jobMatches.filter(m =>
    ['applied', 'interview_requested', 'interview_scheduled'].includes(m.status)
  );

  const readinessScore = myResident?.job_readiness_score;

  const residentQuerySettled = myResident !== undefined;

  if (!myResident && residentQuerySettled && !isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto">
        <PageHeader title="My Jobs" icon={Briefcase} />
        <Card className="p-8 text-center text-muted-foreground">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Your resident profile isn't linked yet. Contact your case manager.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="My Job Progress" subtitle="Your matched jobs and hiring status" icon={Briefcase} />

      {/* Readiness Score */}
      {readinessScore != null && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Job Readiness Score
            </p>
            <span className="text-2xl font-bold text-primary">{readinessScore}<span className="text-sm text-muted-foreground">/100</span></span>
          </div>
          <Progress value={readinessScore} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {readinessScore >= 80 ? 'Great job! You are ready for most positions.' :
             readinessScore >= 60 ? 'Good progress. Keep completing your learning plan.' :
             'Keep working on your plan to improve your readiness.'}
          </p>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeMatches.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Matches</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{inProgressMatches.length}</p>
          <p className="text-xs text-muted-foreground mt-1">In Interview</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{hiredMatches.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Hired</p>
        </Card>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <Card key={i} className="p-5 h-24 animate-pulse bg-muted/30" />)}
        </div>
      )}

      {/* Active matches */}
      {!isLoading && activeMatches.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No job matches yet.</p>
          <p className="text-xs mt-1">Your case manager will review and approve job matches for you.</p>
        </Card>
      )}

      {/* Hired / Retained */}
      {hiredMatches.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Employed
          </h3>
          <div className="space-y-3">
            {hiredMatches.map(m => (
              <Card key={m.id} className="p-4 border-emerald-200 bg-emerald-50/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.job_title}</p>
                    <p className="text-xs text-muted-foreground">{m.employer_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-800">
                        {m.status.replace(/_/g, ' ')}
                      </Badge>
                      {m.hired_date && (
                        <span className="text-[10px] text-muted-foreground">Since {m.hired_date}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In-progress (applied/interview) */}
      {inProgressMatches.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" /> In Progress
          </h3>
          <div className="space-y-3">
            {inProgressMatches.map(m => (
              <JobMatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}

      {/* Recommended (awaiting action) */}
      {(() => {
        const recommended = activeMatches.filter(m => !['applied','interview_requested','interview_scheduled','hired'].includes(m.status) && !m.status?.startsWith('retained'));
        if (recommended.length === 0) return null;
        return (
          <div>
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Matched for You
            </h3>
            <div className="space-y-3">
              {recommended.map(m => <JobMatchCard key={m.id} match={m} />)}
            </div>
          </div>
        );
      })()}

      {/* Not selected */}
      {jobMatches.filter(m => m.status === 'not_selected').length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground py-2">
            Show past / not selected ({jobMatches.filter(m => m.status === 'not_selected').length})
          </summary>
          <div className="space-y-2 mt-2">
            {jobMatches.filter(m => m.status === 'not_selected').map(m => (
              <Card key={m.id} className="p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <p className="text-sm flex-1">{m.job_title}</p>
                  <span className="text-xs text-muted-foreground">{m.employer_name}</span>
                  <Badge variant="outline" className="text-[10px]">Not Selected</Badge>
                </div>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function JobMatchCard({ match: m }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{m.job_title}</p>
              <p className="text-xs text-muted-foreground">{m.employer_name}</p>
            </div>
            <Badge className={`text-[10px] border-0 flex-shrink-0 ${STATUS_COLORS[m.status] || 'bg-muted text-muted-foreground'}`}>
              {m.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {m.match_score != null && (
            <div className="flex items-center gap-1.5 mt-2">
              <Target className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">Match score:</span>
              <span className="text-xs font-semibold text-primary">{m.match_score}%</span>
            </div>
          )}

          <MatchProgressBar status={m.status} />

          {/* Match reasons (resident-friendly) */}
          {m.match_reasons?.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-1">Why this is a good match:</p>
              <div className="flex flex-wrap gap-1">
                {m.match_reasons.slice(0, 3).map((r, i) => (
                  <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Blockers — shown only if in early stage */}
          {m.blockers?.length > 0 && !['hired','retained_30','retained_60','retained_90'].includes(m.status) && (
            <div className="mt-2">
              <p className="text-[10px] text-amber-700 font-medium mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Things to work on:
              </p>
              <div className="flex flex-wrap gap-1">
                {m.blockers.slice(0, 3).map((b, i) => (
                  <span key={i} className="text-[10px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}