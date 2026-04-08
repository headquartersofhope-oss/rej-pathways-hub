import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, CheckCircle2, TrendingUp, Plus, Eye } from 'lucide-react';
import { JOB_STATUSES, matchLabel } from '@/lib/jobMatchScoring';
import { Link } from 'react-router-dom';

export default function EmployerDashboard({ user }) {
  const { data: employer } = useQuery({
    queryKey: ['employer-profile', user?.id],
    queryFn: async () => {
      const all = await base44.entities.Employer.list();
      return all.find(e => e.user_id === user?.id) || null;
    },
    enabled: !!user?.id,
  });

  const { data: myListings = [] } = useQuery({
    queryKey: ['employer-listings', employer?.id],
    queryFn: async () => {
      const all = await base44.entities.JobListing.list('-created_date');
      return all.filter(j => j.employer_id === employer.id || j.employer_name === employer.company_name);
    },
    enabled: !!employer?.id,
  });

  const listingIds = myListings.map(j => j.id);

  const { data: allMatches = [] } = useQuery({
    queryKey: ['employer-matches', employer?.id],
    queryFn: () => base44.entities.JobMatch.list(),
    enabled: !!employer?.id,
    select: (data) => data.filter(m => listingIds.includes(m.job_listing_id)),
  });

  const activeListings = myListings.filter(j => j.status === 'active').length;
  const candidateCount = allMatches.length;
  const hiredCount = allMatches.filter(m => m.status === 'hired').length;
  const interviewCount = allMatches.filter(m => ['interview_requested', 'interview_scheduled'].includes(m.status)).length;

  const recentCandidates = [...allMatches]
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 5);

  if (!employer) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-bold">Employer Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your employer profile is not yet set up.</p>
        </div>
        <Card className="p-8 text-center">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-semibold mb-2">No employer profile linked to your account</p>
          <p className="text-sm text-muted-foreground mb-4">
            Contact your program coordinator to have your employer account set up.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold">
            {employer.company_name}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Employer Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Link to="/employer-portal?tab=jobs">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Post a Job
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Listings" value={activeListings} icon={Briefcase} />
        <StatCard title="Matched Candidates" value={candidateCount} icon={Users} />
        <StatCard title="Interviews" value={interviewCount} subtitle="In progress" icon={TrendingUp} />
        <StatCard title="Total Hires" value={hiredCount} icon={CheckCircle2} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Active Jobs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Active Job Listings</h3>
            <Link to="/employer-portal">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                <Eye className="w-3 h-3" /> View All
              </Button>
            </Link>
          </div>
          {myListings.filter(j => j.status === 'active').length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active listings</p>
          ) : (
            <div className="space-y-2">
              {myListings.filter(j => j.status === 'active').slice(0, 4).map(job => {
                const matchCount = allMatches.filter(m => m.job_listing_id === job.id).length;
                return (
                  <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.schedule_type?.replace('_', ' ')} · {job.city || 'Location TBD'}</p>
                    </div>
                    {matchCount > 0 && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">{matchCount} matched</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top Candidates */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Top Candidates</h3>
            <Link to="/employer-portal">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                <Eye className="w-3 h-3" /> View Pipeline
              </Button>
            </Link>
          </div>
          {recentCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No candidates yet — post a job to get matched</p>
          ) : (
            <div className="space-y-2">
              {recentCandidates.map(m => {
                const { bg, color } = matchLabel(m.match_score ?? 0);
                const statusInfo = JOB_STATUSES[m.status];
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`font-bold text-sm ${color}`}>{m.match_score ?? '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.job_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.employer_name}</p>
                    </div>
                    <Badge className={`text-[10px] border-0 ${statusInfo?.color || 'bg-muted text-muted-foreground'}`}>
                      {statusInfo?.label || m.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}