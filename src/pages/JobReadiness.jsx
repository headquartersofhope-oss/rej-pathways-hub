import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, Link } from 'react-router-dom';
import { isStaff } from '@/lib/roles';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Star, ChevronRight, AlertCircle, CheckCircle2, Search } from 'lucide-react';

export default function JobReadiness() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const staff = isStaff(user?.role);

  const { data: residents = [], isLoading: residentsLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-employability-profiles'],
    queryFn: () => base44.entities.EmployabilityProfile.list(),
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['all-resumes'],
    queryFn: () => base44.entities.ResumeRecord.list(),
  });

  const { data: mockInterviews = [] } = useQuery({
    queryKey: ['all-mock-interviews'],
    queryFn: () => base44.entities.MockInterview.list(),
  });

  // Index by BOTH resident_id and global_resident_id for consistent lookups
  const profileByResident = {};
  profiles.forEach(p => {
    if (p.resident_id) profileByResident[p.resident_id] = p;
    if (p.global_resident_id) profileByResident[p.global_resident_id] = p;
  });

  const resumeByResident = {};
  resumes.forEach(r => {
    [r.resident_id, r.global_resident_id].filter(Boolean).forEach(key => {
      if (!resumeByResident[key]) resumeByResident[key] = [];
      resumeByResident[key].push(r);
    });
  });

  const interviewByResident = {};
  mockInterviews.forEach(m => {
    [m.resident_id, m.global_resident_id].filter(Boolean).forEach(key => {
      if (!interviewByResident[key]) interviewByResident[key] = [];
      interviewByResident[key].push(m);
    });
  });

  const activeResidents = residents.filter(r =>
    ['active', 'pre_intake'].includes(r.status) &&
    (search === '' ||
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      r.global_resident_id?.toLowerCase().includes(search.toLowerCase()))
  );

  const nearlyReady = activeResidents.filter(r => (r.job_readiness_score || 0) >= 70);
  const needsWork = activeResidents.filter(r => (r.job_readiness_score || 0) < 70);

  const ResidentCard = ({ r }) => {
    const profile = profileByResident[r.id] || profileByResident[r.global_resident_id];
    const hasResume = ((resumeByResident[r.id] || resumeByResident[r.global_resident_id] || [])).length > 0;
    const hasInterview = ((interviewByResident[r.id] || interviewByResident[r.global_resident_id] || [])).length > 0;
    const score = profile?.job_readiness_score ?? r.job_readiness_score ?? 0;
    const missing = r.missing_documents?.filter(Boolean) || [];
    const blockerCount = (!hasResume ? 1 : 0) + (!hasInterview ? 1 : 0) + missing.length;

    return (
      <Link to={`/residents/${r.id}?tab=job-readiness`}>
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
              {r.first_name?.[0]}{r.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm truncate">{r.preferred_name || r.first_name} {r.last_name}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground">{r.global_resident_id}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Readiness</span>
                  <span className="font-semibold">{score}%</span>
                </div>
                <Progress value={score} className="h-1.5" />
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {hasResume && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">Resume ✓</Badge>}
                {hasInterview && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">Interview ✓</Badge>}
                {blockerCount > 0 && (
                  <Badge className="text-[10px] bg-red-50 text-red-700 border-0 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />{blockerCount} blocker{blockerCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Job Readiness</h1>
            <p className="text-sm text-muted-foreground">Track resident employment readiness</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Residents', value: activeResidents.length },
          { label: 'Nearly Job-Ready (70%+)', value: nearlyReady.length },
          { label: 'Resumes on File', value: Object.keys(resumeByResident).length },
          { label: 'Mock Interviews Done', value: Object.keys(interviewByResident).length },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 text-center">
            <p className="font-heading font-bold text-2xl">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search residents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Nearly Ready */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-heading font-semibold text-sm">Nearly Job-Ready ({nearlyReady.length})</h2>
          </div>
          {nearlyReady.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">No residents at 70%+ yet.</Card>
          ) : (
            <div className="space-y-2">{nearlyReady.map(r => <ResidentCard key={r.id} r={r} />)}</div>
          )}
        </div>

        {/* Needs Work */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-heading font-semibold text-sm">Needs Work ({needsWork.length})</h2>
          </div>
          {needsWork.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">All residents are nearly ready!</Card>
          ) : (
            <div className="space-y-2">{needsWork.map(r => <ResidentCard key={r.id} r={r} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}