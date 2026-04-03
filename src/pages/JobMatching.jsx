import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext, Link } from 'react-router-dom';
import { isStaff } from '@/lib/roles';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Briefcase, Plus, Search, MapPin, DollarSign, Clock, Building2,
  Users, Zap, CheckCircle2, ChevronRight, Pencil, Eye, EyeOff
} from 'lucide-react';
import JobListingDialog from '@/components/jobmatching/JobListingDialog';
import { computeMatchScore, JOB_STATUSES, matchLabel } from '@/lib/jobMatchScoring';

const SOURCE_LABELS = {
  employer_direct: 'Employer',
  internal: 'Internal',
  staffing_partner: 'Partner',
  workforce_board: 'Workforce Board',
  external_board: 'External Board',
};

export default function JobMatching() {
  const { user } = useOutletContext();
  const staff = isStaff(user?.role);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [bulkMatching, setBulkMatching] = useState(false);

  const { data: jobListings = [], refetch: refetchListings } = useQuery({
    queryKey: ['job-listings'],
    queryFn: () => base44.entities.JobListing.list('-created_date'),
    staleTime: 0,
  });

  const { data: allMatches = [] } = useQuery({
    queryKey: ['all-job-matches'],
    queryFn: () => base44.entities.JobMatch.list(),
    staleTime: 0,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
    staleTime: 60000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-employability-profiles'],
    queryFn: () => base44.entities.EmployabilityProfile.list(),
    staleTime: 60000,
  });

  const { data: allBarriers = [] } = useQuery({
    queryKey: ['all-barriers-jm'],
    queryFn: () => base44.entities.BarrierItem.list(),
    staleTime: 60000,
  });

  const { data: allCerts = [] } = useQuery({
    queryKey: ['all-certs-jm'],
    queryFn: () => base44.entities.Certificate.list(),
    staleTime: 60000,
  });

  const handleSaved = async () => {
    await refetchListings();
    await queryClient.refetchQueries({ queryKey: ['job-listings-active'] });
  };

  const handleEdit = (job) => { setEditJob(job); setShowDialog(true); };
  const handleNew = () => { setEditJob(null); setShowDialog(true); };

  // Bulk match all active residents against all active jobs
  const handleBulkMatch = async () => {
    setBulkMatching(true);
    const activeJobs = jobListings.filter(j => j.status === 'active');
    const activeResidents = residents.filter(r => ['active', 'pre_intake'].includes(r.status));

    // Build duplicate keys from both resident_id and global_resident_id to be safe
    const existingMatchKeys = new Set([
      ...allMatches.map(m => `${m.resident_id}__${m.job_listing_id}`),
      ...allMatches.map(m => `${m.global_resident_id}__${m.job_listing_id}`).filter(k => !k.startsWith('__')),
    ]);
    const profileByGlobal = {};
    profiles.forEach(p => { profileByGlobal[p.global_resident_id] = p; profileByGlobal[p.resident_id] = p; });
    const barriersByGlobal = {};
    allBarriers.forEach(b => {
      const key = b.global_resident_id || b.resident_id;
      if (!barriersByGlobal[key]) barriersByGlobal[key] = [];
      barriersByGlobal[key].push(b);
    });
    const certsByResident = {};
    allCerts.forEach(c => {
      if (!certsByResident[c.resident_id]) certsByResident[c.resident_id] = [];
      certsByResident[c.resident_id].push(c);
    });

    const newMatches = [];
    for (const resident of activeResidents) {
      const profile = profileByGlobal[resident.global_resident_id] || profileByGlobal[resident.id];
      const barriers = barriersByGlobal[resident.global_resident_id] || barriersByGlobal[resident.id] || [];
      const certificates = certsByResident[resident.id] || [];
      for (const job of activeJobs) {
        const key = `${resident.id}__${job.id}`;
        if (existingMatchKeys.has(key)) continue;
        const { match_score, match_reasons, blockers } = computeMatchScore({ resident, profile, barriers, certificates, job });
        if (match_score >= 40) {
          newMatches.push({
            global_resident_id: resident.global_resident_id || resident.id,
            resident_id: resident.id,
            organization_id: resident.organization_id || '',
            job_listing_id: job.id,
            job_title: job.title,
            employer_name: job.employer_name,
            match_score, match_reasons, blockers,
            status: 'recommended',
            staff_approved: false,
            created_by: user?.id,
          });
        }
      }
    }

    if (newMatches.length > 0) {
      // Batch in groups of 20
      for (let i = 0; i < newMatches.length; i += 20) {
        await base44.entities.JobMatch.bulkCreate(newMatches.slice(i, i + 20));
      }
    }
    await queryClient.refetchQueries({ queryKey: ['all-job-matches'] });
    setBulkMatching(false);
    alert(`Match engine complete. ${newMatches.length} new matches created across ${activeResidents.length} residents.`);
  };

  // Filtered listings
  const filtered = jobListings.filter(j => {
    const matchSearch = search === '' ||
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.employer_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.industry?.toLowerCase().includes(search.toLowerCase());
    const matchSource = sourceFilter === 'all' || j.source === sourceFilter;
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchSource && matchStatus;
  });

  // Pipeline stats
  const pipelineCounts = {};
  Object.keys(JOB_STATUSES).forEach(k => { pipelineCounts[k] = allMatches.filter(m => m.status === k).length; });
  const hiredCount = pipelineCounts.hired || 0;
  const appliedCount = pipelineCounts.applied || 0;

  // Match counts per job
  const matchCountByJob = {};
  allMatches.forEach(m => {
    matchCountByJob[m.job_listing_id] = (matchCountByJob[m.job_listing_id] || 0) + 1;
  });

  const JobCard = ({ job }) => {
    const wageStr = job.wage_min
      ? job.wage_max && job.wage_max !== job.wage_min
        ? `$${job.wage_min}–$${job.wage_max}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
        : `$${job.wage_min}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
      : null;

    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.employer_name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[10px] border-0 ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {job.status}
                </Badge>
                {staff && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(job)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
              {job.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}{job.state ? `, ${job.state}` : ''}</span>}
              {wageStr && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{wageStr}</span>}
              {job.schedule_type && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.schedule_type.replace('_', ' ')}</span>}
              {job.source && <Badge className="text-[10px] bg-muted text-muted-foreground border-0">{SOURCE_LABELS[job.source] || job.source}</Badge>}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {job.second_chance_friendly && <Badge className="text-[10px] bg-blue-50 text-blue-700 border-0">2nd Chance</Badge>}
              {job.veteran_friendly && <Badge className="text-[10px] bg-purple-50 text-purple-700 border-0">Veteran</Badge>}
              {job.is_remote && <Badge className="text-[10px] bg-teal-50 text-teal-700 border-0">Remote</Badge>}
              {job.certifications_required?.length > 0 && <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">{job.certifications_required.length} cert required</Badge>}
              {matchCountByJob[job.id] > 0 && (
                <Badge className="text-[10px] bg-primary/10 text-primary border-0 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />{matchCountByJob[job.id]} matched
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Pipeline view
  const PipelineView = () => {
    const recentMatches = [...allMatches]
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 50);

    const residentById = {};
    residents.forEach(r => { residentById[r.id] = r; });

    const grouped = {};
    Object.keys(JOB_STATUSES).forEach(k => { grouped[k] = recentMatches.filter(m => m.status === k); });

    const stages = ['recommended', 'applied', 'interview_requested', 'interview_scheduled', 'hired'];

    return (
      <div className="space-y-3">
        {stages.map(stage => {
          const items = grouped[stage] || [];
          const info = JOB_STATUSES[stage];
          return (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-xs border-0 ${info.color}`}>{info.label}</Badge>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-2">None</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map(m => {
                    const r = residentById[m.resident_id];
                    const { bg, color, label: mlabel } = matchLabel(m.match_score ?? 0);
                    return (
                      <Link key={m.id} to={`/residents/${m.resident_id}?tab=job-matching`}>
                        <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                              <span className={`font-bold text-sm ${color}`}>{m.match_score ?? '?'}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{r ? `${r.preferred_name || r.first_name} ${r.last_name}` : m.resident_id}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{m.job_title}</p>
                              <p className="text-[10px] text-muted-foreground">{m.employer_name}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-auto" />
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Job Matching</h1>
            <p className="text-sm text-muted-foreground">Match residents to employment opportunities</p>
          </div>
        </div>
        {staff && (
          <div className="sm:ml-auto flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleBulkMatch} disabled={bulkMatching} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />{bulkMatching ? 'Running...' : 'Run Bulk Match Engine'}
            </Button>
            <Button size="sm" onClick={handleNew} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Job Listing
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Listings', value: jobListings.filter(j => j.status === 'active').length },
          { label: 'Total Matches', value: allMatches.length },
          { label: 'Applied', value: appliedCount },
          { label: 'Hired', value: hiredCount },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 text-center">
            <p className="font-heading font-bold text-2xl">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="mb-5 flex-wrap h-auto gap-1">
          <TabsTrigger value="listings">Job Listings</TabsTrigger>
          <TabsTrigger value="pipeline">Placement Pipeline</TabsTrigger>
        </TabsList>

        {/* Listings tab */}
        <TabsContent value="listings">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search jobs, employers, industries..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {['active', 'inactive', 'filled', 'draft'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <h3 className="font-heading font-semibold mb-1">No Job Listings Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {jobListings.length === 0 ? 'Start by adding job listings from employers, partners, or workforce boards.' : 'Try adjusting your filters.'}
              </p>
              {staff && jobListings.length === 0 && (
                <Button size="sm" onClick={handleNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Job Listing</Button>
              )}
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </TabsContent>

        {/* Pipeline tab */}
        <TabsContent value="pipeline">
          <PipelineView />
        </TabsContent>
      </Tabs>

      <JobListingDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditJob(null); }}
        onSaved={handleSaved}
        editJob={editJob}
        user={user}
      />
    </div>
  );
}