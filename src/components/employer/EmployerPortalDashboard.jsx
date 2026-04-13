import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { JOB_STATUSES, matchLabel } from '@/lib/jobMatchScoring';

export default function EmployerPortalDashboard({ employer, user }) {
  const [selectedJobId, setSelectedJobId] = useState(null);

  const { data: jobsData } = useQuery({
    queryKey: ['ep-listings', employer.id],
    queryFn: () => base44.functions.invoke('getEmployerJobs', {}),
    enabled: !!employer?.id,
  });

  const listings = jobsData?.data?.listings || [];

  // For dashboard stats, load candidates using the scoped function per listing
  // We use a combined query keyed by listing ids
  const listingIds = listings.map(j => j.id);

  const { data: allMatches = [] } = useQuery({
    queryKey: ['ep-matches-dashboard', employer.id, listingIds.join(',')],
    queryFn: async () => {
      if (listingIds.length === 0) return [];
      // Fetch matches per listing in parallel (scoped via backend function)
      const results = await Promise.all(
        listingIds.map(id =>
          base44.functions.invoke('getEmployerCandidates', { job_listing_id: id })
            .then(r => r.data?.candidates || [])
            .catch(() => [])
        )
      );
      return results.flat();
    },
    enabled: listings.length > 0,
  });

  const active = listings.filter(j => j.status === 'active').length;
  const hired = allMatches.filter(m => m.status === 'hired').length;
  const interviews = allMatches.filter(m => ['interview_requested', 'interview_scheduled'].includes(m.status)).length;
  const recommended = allMatches.filter(m => m.status === 'recommended').length;

  const selectedJob = selectedJobId ? listings.find(j => j.id === selectedJobId) : null;
  const jobMatches = selectedJobId ? allMatches.filter(m => m.job_listing_id === selectedJobId) : [];

  const STAGES = ['recommended', 'interview_requested', 'interview_scheduled', 'hired', 'not_selected'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Jobs" value={active} icon={Briefcase} />
        <StatCard title="Recommended" value={recommended} icon={Users} />
        <StatCard title="Interviews" value={interviews} icon={TrendingUp} subtitle="In progress" />
        <StatCard title="Total Hires" value={hired} icon={CheckCircle2} />
      </div>

      {/* Jobs overview */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">
          Your Job Listings — Select to View Candidates
        </h3>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No jobs posted yet. Go to <strong>My Jobs</strong> to post your first listing.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map(job => {
              const count = job._match_count ?? allMatches.filter(m => m.job_listing_id === job.id).length;
              const isSelected = selectedJobId === job.id;
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{job.title}</p>
                    <Badge className={`text-[10px] border-0 flex-shrink-0 ${
                      job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>{job.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{job.schedule_type?.replace('_', ' ')} · {job.city || 'Location TBD'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-primary font-medium">{job._match_count ?? count} candidate{(job._match_count ?? count) !== 1 ? 's' : ''}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pipeline for selected job */}
      {selectedJob && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold">Candidate Pipeline — {selectedJob.title}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedJobId(null)} className="text-xs">
              Close
            </Button>
          </div>

          {jobMatches.length === 0 ? (
            <Card className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No approved candidates for this job yet.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {STAGES.filter(s => jobMatches.some(m => m.status === s)).map(stage => {
                const items = jobMatches.filter(m => m.status === stage);
                const info = JOB_STATUSES[stage] || { label: stage, color: 'bg-muted text-muted-foreground' };
                return (
                  <Card key={stage} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`text-xs border-0 ${info.color}`}>{info.label}</Badge>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(m => {
                        const { bg, color } = matchLabel(m.match_score ?? 0);
                        return (
                          <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                              <span className={`font-bold text-xs ${color}`}>{m.match_score ?? '?'}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {m.candidate_display || `Candidate #${m.resident_id?.slice(-6).toUpperCase() || '—'}`}
                              </p>
                              {m.match_reasons?.[0] && (
                                <p className="text-[10px] text-muted-foreground truncate">{m.match_reasons[0]}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}