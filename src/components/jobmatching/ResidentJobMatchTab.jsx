import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { computeMatchScore } from '@/lib/jobMatchScoring';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Zap, RefreshCw, RotateCcw } from 'lucide-react';
import JobMatchCard from './JobMatchCard';

export default function ResidentJobMatchTab({ resident, user, barriers = [], perms = {} }) {
  const queryClient = useQueryClient();
  const residentId = resident?.id;
  const globalId = resident?.global_resident_id;
  const queryId = globalId || residentId;
  const staff = !perms.isReadOnly;
  const [generating, setGenerating] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['employability-profile', queryId],
    queryFn: async () => {
      let list = globalId ? await base44.entities.EmployabilityProfile.filter({ global_resident_id: globalId }) : [];
      if (!list.length) list = await base44.entities.EmployabilityProfile.filter({ resident_id: residentId });
      return list[0] || null;
    },
    enabled: !!residentId,
    staleTime: 0,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates-jr', queryId],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: residentId }),
    enabled: !!residentId,
    staleTime: 0,
  });

  // Check for a ResumeRecord to augment resume_status when profile lacks it
  const { data: resumeRecords = [] } = useQuery({
    queryKey: ['resume-records-jr', queryId],
    queryFn: () => base44.entities.ResumeRecord.filter({ resident_id: residentId }),
    enabled: !!residentId,
    staleTime: 0,
  });

  // Merge profile with resume_status derived from ResumeRecord if profile doesn't have it
  const enrichedProfile = React.useMemo(() => {
    if (!profile) return null;
    if (profile.resume_status && profile.resume_status !== 'none') return profile;
    const latestResume = resumeRecords[0];
    if (!latestResume) return profile;
    return { ...profile, resume_status: latestResume.status }; // 'draft' | 'staff_reviewed' | 'complete'
  }, [profile, resumeRecords]);

  const { data: activeJobs = [] } = useQuery({
    queryKey: ['job-listings-active'],
    queryFn: () => base44.entities.JobListing.filter({ status: 'active' }),
    staleTime: 30000,
  });

  const { data: allJobsForRescore = [] } = useQuery({
    queryKey: ['all-job-listings'],
    queryFn: () => base44.entities.JobListing.list(),
    staleTime: 30000,
  });

  const { data: existingMatches = [], refetch: refetchMatches } = useQuery({
    queryKey: ['job-matches', queryId],
    queryFn: async () => {
      let list = globalId ? await base44.entities.JobMatch.filter({ global_resident_id: globalId }) : [];
      if (!list.length) list = await base44.entities.JobMatch.filter({ resident_id: residentId });
      return list;
    },
    enabled: !!residentId,
    staleTime: 0,
  });

  const refresh = async () => {
    await queryClient.refetchQueries({ queryKey: ['job-matches', queryId] });
  };

  const handleGenerateMatches = async () => {
    if (!residentId) return;
    setGenerating(true);

    const existingJobIds = new Set(existingMatches.map(m => m.job_listing_id));

    const newMatches = [];
    for (const job of activeJobs) {
      if (existingJobIds.has(job.id)) continue; // skip already matched jobs
      const { match_score, match_reasons, blockers } = computeMatchScore({
        resident, profile: enrichedProfile, barriers, certificates, job,
      });
      if (match_score >= 40) { // only surface meaningful matches
        newMatches.push({
          global_resident_id: globalId || residentId,
          resident_id: residentId,
          organization_id: resident?.organization_id || '',
          job_listing_id: job.id,
          job_title: job.title,
          employer_name: job.employer_name,
          match_score,
          match_reasons,
          blockers,
          status: 'recommended',
          staff_approved: false,
          created_by: user?.id,
        });
      }
    }

    if (newMatches.length > 0) {
      await base44.entities.JobMatch.bulkCreate(newMatches);
    }
    await refresh();
    setGenerating(false);
  };

  const handleStatusChange = async (match, newStatus) => {
    // Prevent duplicate applications: if already applied/further along, require override
    const appliedStatuses = ['applied', 'interview_requested', 'interview_scheduled', 'hired', 'retained_30', 'retained_60', 'retained_90'];
    if (newStatus === 'applied' && appliedStatuses.includes(match.status)) {
      // Already applied or beyond — silently skip (UI will show the warning)
      return;
    }
    const update = { status: newStatus };
    if (newStatus === 'applied') update.applied_date = new Date().toISOString().split('T')[0];
    if (newStatus === 'hired') update.hired_date = new Date().toISOString().split('T')[0];
    await base44.entities.JobMatch.update(match.id, update);
    await refresh();
  };

  const handleApprove = async (match) => {
    await base44.entities.JobMatch.update(match.id, { staff_approved: true, approved_by: user?.id });
    await refresh();
  };

  // Build a job lookup map from active jobs
  const jobById = {};
  activeJobs.forEach(j => { jobById[j.id] = j; });

  // Build a complete job lookup map for rescoring (includes inactive jobs)
  const jobByIdAll = {};
  allJobsForRescore.forEach(j => { jobByIdAll[j.id] = j; });

  // Re-score all existing matches with latest profile/barrier/cert data
  const handleRescore = async () => {
    if (!residentId || existingMatches.length === 0) return;
    setRescoring(true);
    for (const match of existingMatches) {
      const job = jobByIdAll[match.job_listing_id];
      if (!job) continue;
      const { match_score, match_reasons, blockers } = computeMatchScore({
        resident, profile: enrichedProfile, barriers, certificates, job,
      });
      await base44.entities.JobMatch.update(match.id, { match_score, match_reasons, blockers });
    }
    await refresh();
    setRescoring(false);
  };

  // Also fetch jobs for matches whose job might no longer be "active"
  const allMatchedJobIds = existingMatches.map(m => m.job_listing_id);

  // Sort matches: highest score first
  const sorted = [...existingMatches].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

  // Stats
  const hired = existingMatches.filter(m => m.status === 'hired').length;
  const applied = existingMatches.filter(m => m.status === 'applied').length;
  const approved = existingMatches.filter(m => m.staff_approved).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-sm">Job Matches</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {existingMatches.length} match{existingMatches.length !== 1 ? 'es' : ''} · {approved} staff approved · {applied} applied · {hired} hired
          </p>
        </div>
        {staff && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5 h-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {existingMatches.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleRescore} disabled={rescoring} className="gap-1.5 h-8">
                <RotateCcw className="w-3.5 h-3.5" />
                {rescoring ? 'Rescoring...' : 'Re-score'}
              </Button>
            )}
            <Button size="sm" onClick={handleGenerateMatches} disabled={generating} className="gap-1.5 h-8">
              <Zap className="w-3.5 h-3.5" />
              {generating ? 'Matching...' : 'Run Match Engine'}
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <Card className="p-8 text-center">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h4 className="font-heading font-semibold text-sm mb-1">No Job Matches Yet</h4>
          <p className="text-xs text-muted-foreground mb-4">
            {activeJobs.length === 0
              ? 'No active job listings available. Add job listings from the Job Matching page.'
              : 'Click "Run Match Engine" to find suitable jobs for this resident.'}
          </p>
          {staff && activeJobs.length > 0 && (
            <Button size="sm" onClick={handleGenerateMatches} disabled={generating}>
              <Zap className="w-3.5 h-3.5 mr-1.5" />{generating ? 'Matching...' : 'Run Match Engine'}
            </Button>
          )}
        </Card>
      )}

      {/* Match list */}
      <div className="space-y-3">
        {sorted.map(match => (
          <JobMatchCard
            key={match.id}
            match={match}
            job={jobById[match.job_listing_id] || { title: match.job_title, employer_name: match.employer_name }}
            staff={staff}
            onStatusChange={handleStatusChange}
            onApprove={handleApprove}
          />
        ))}
      </div>
    </div>
  );
}