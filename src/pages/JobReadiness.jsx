import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, Link } from 'react-router-dom';
import { isStaff } from '@/lib/roles';
import { Card } from '@/components/ui/card';
import PremiumCard from '@/components/premium/PremiumCard';
import PremiumPageHeader from '@/components/premium/PremiumPageHeader';
import PremiumSectionHeader from '@/components/premium/PremiumSectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Star, ChevronRight, AlertCircle, CheckCircle2, Search, Users, FileText } from 'lucide-react';

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
      <PremiumPageHeader
        title="Job Readiness"
        subtitle="Track resident employment readiness"
        icon={Star}
      />

       {/* Premium Stats */}
       <div>
         <PremiumSectionHeader title="Readiness Metrics" />
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
           <PremiumCard title="Active Residents" value={activeResidents.length} icon={Users} accentColor="#A78BFA" />
           <PremiumCard title="Nearly Ready (70%+)" value={nearlyReady.length} icon={CheckCircle2} accentColor="#34D399" />
           <PremiumCard title="Resumes on File" value={Object.keys(resumeByResident).length} icon={FileText} accentColor="#F59E0B" />
           <PremiumCard title="Mock Interviews" value={Object.keys(interviewByResident).length} icon={Users} accentColor="#3B82F6" />
         </div>
       </div>

      {/* Search */}
      <PremiumSectionHeader title="Search & Filter" />
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
          <PremiumSectionHeader title={`Nearly Job-Ready (${nearlyReady.length})`} icon={CheckCircle2} />
          <div className="mt-3">
          {nearlyReady.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">No residents at 70%+ yet.</Card>
          ) : (
            <div className="space-y-2">{nearlyReady.map(r => <ResidentCard key={r.id} r={r} />)}</div>
          )}
        </div>

        {/* Needs Work */}
        <div>
          <PremiumSectionHeader title={`Needs Work (${needsWork.length})`} icon={AlertCircle} />
          <div className="mt-3">
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