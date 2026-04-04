import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase, Users, MapPin, DollarSign, Clock, Plus, Pencil,
  CheckCircle2, AlertTriangle, Star, BookOpen, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import JobListingDialog from '@/components/jobmatching/JobListingDialog';
import { JOB_STATUSES, matchLabel } from '@/lib/jobMatchScoring';

const PIPELINE_STAGES = ['recommended', 'applied', 'interview_requested', 'interview_scheduled', 'hired', 'not_selected'];
const NEXT_STAGE = {
  recommended: 'applied',
  applied: 'interview_requested',
  interview_requested: 'interview_scheduled',
  interview_scheduled: 'hired',
};

function CandidateCard({ match, onStatusChange, onNotesSave }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(match.notes || '');
  const [saving, setSaving] = useState(false);
  const { bg, color, label } = matchLabel(match.match_score ?? 0);
  const statusInfo = JOB_STATUSES[match.status] || { label: match.status, color: 'bg-muted text-muted-foreground' };
  const nextStage = NEXT_STAGE[match.status];

  const handleSaveNotes = async () => {
    setSaving(true);
    await onNotesSave(match.id, notes);
    setSaving(false);
    setEditingNotes(false);
  };

  // Safe display: show resident_id truncated, not full name (employer view)
  const candidateLabel = match.candidate_display || `Candidate #${match.resident_id?.slice(-6).toUpperCase() || '—'}`;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`font-bold text-sm ${color}`}>{match.match_score ?? '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{candidateLabel}</p>
              <p className="text-xs text-muted-foreground">{label} · {match.job_title}</p>
            </div>
            <Badge className={`text-[10px] border-0 flex-shrink-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
          </div>

          {/* Strengths preview */}
          {match.match_reasons?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {match.match_reasons.slice(0, 2).map((r, i) => (
                <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {r.slice(0, 40)}{r.length > 40 ? '…' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Blockers preview */}
          {match.blockers?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {match.blockers.slice(0, 1).map((b, i) => (
                <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> {b.slice(0, 40)}{b.length > 40 ? '…' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Learning badges */}
          {match.learning_summary && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {match.learning_summary.map((l, i) => (
                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  {l.type === 'cert' ? <Award className="w-2.5 h-2.5" /> : <BookOpen className="w-2.5 h-2.5" />} {l.label}
                </span>
              ))}
            </div>
          )}

          {/* Pipeline controls */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {nextStage && (
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                onClick={() => onStatusChange(match.id, nextStage)}>
                → {JOB_STATUSES[nextStage]?.label}
              </Button>
            )}
            <Select value={match.status} onValueChange={v => onStatusChange(match.id, v)}>
              <SelectTrigger className="h-6 text-[10px] w-36 flex-shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map(k => (
                  <SelectItem key={k} value={k} className="text-xs">{JOB_STATUSES[k]?.label || k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less' : 'Details'}
            </button>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-3 space-y-3 border-t pt-3">
              {match.match_reasons?.length > 2 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">All Strengths</p>
                  <div className="space-y-0.5">
                    {match.match_reasons.map((r, i) => (
                      <p key={i} className="text-xs text-emerald-700 flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" /> {r}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {match.blockers?.length > 1 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">All Considerations</p>
                  <div className="space-y-0.5">
                    {match.blockers.map((b, i) => (
                      <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {b}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Employer notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Employer Notes</p>
                  {!editingNotes && (
                    <button className="text-[10px] text-primary hover:underline" onClick={() => setEditingNotes(true)}>
                      Edit
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Interview feedback, hiring notes, next steps..."
                      className="text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSaveNotes} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => { setEditingNotes(false); setNotes(match.notes || ''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{notes || 'No notes added yet.'}</p>
                )}
              </div>

              {match.applied_date && (
                <p className="text-[10px] text-muted-foreground">Applied: {match.applied_date}</p>
              )}
              {match.hired_date && (
                <p className="text-[10px] text-emerald-700 font-medium">Hired: {match.hired_date}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function EmployerDetailPanel({ employer, user }) {
  const queryClient = useQueryClient();
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState('all');

  const { data: listings = [], refetch: refetchListings } = useQuery({
    queryKey: ['employer-detail-listings', employer.id],
    queryFn: async () => {
      const all = await base44.entities.JobListing.list('-created_date');
      return all.filter(j => j.employer_id === employer.id || j.employer_name === employer.company_name);
    },
    staleTime: 0,
  });

  const { data: allMatches = [], refetch: refetchMatches } = useQuery({
    queryKey: ['employer-detail-matches', employer.id, listings.map(l => l.id).join(',')],
    queryFn: async () => {
      const all = await base44.entities.JobMatch.list();
      const listingIds = new Set(listings.map(l => l.id));

      // Load certs and enrollments for learning summary
      const certs = await base44.entities.Certificate.list();
      const enrollments = await base44.entities.ClassEnrollment.list('-created_date', 1000);

      return all
        .filter(m => listingIds.has(m.job_listing_id))
        .map(m => {
          const myCerts = certs.filter(c => c.resident_id === m.resident_id);
          const myEnrollments = enrollments.filter(e => e.resident_id === m.resident_id && (e.status === 'completed' || e.quiz_passed));
          const learning_summary = [
            ...myCerts.map(c => ({ type: 'cert', label: c.certificate_name })),
            ...(myEnrollments.length > 0 ? [{ type: 'class', label: `${myEnrollments.length} classes completed` }] : []),
          ];
          return {
            ...m,
            candidate_display: `Candidate #${m.resident_id?.slice(-6).toUpperCase() || '—'}`,
            learning_summary,
          };
        });
    },
    enabled: listings.length > 0,
    staleTime: 0,
  });

  const handleSaved = async () => {
    await refetchListings();
    queryClient.invalidateQueries({ queryKey: ['job-listings'] });
  };

  const handleStatusChange = async (matchId, newStatus) => {
    const update = { status: newStatus };
    if (newStatus === 'applied') update.applied_date = new Date().toISOString().split('T')[0];
    if (newStatus === 'hired') update.hired_date = new Date().toISOString().split('T')[0];
    await base44.entities.JobMatch.update(matchId, update);
    await refetchMatches();
    queryClient.invalidateQueries({ queryKey: ['all-job-matches'] });
  };

  const handleNotesSave = async (matchId, notes) => {
    await base44.entities.JobMatch.update(matchId, { notes });
    await refetchMatches();
  };

  const filteredMatches = selectedJobId === 'all'
    ? allMatches
    : allMatches.filter(m => m.job_listing_id === selectedJobId);

  const groupedByStage = {};
  PIPELINE_STAGES.forEach(s => { groupedByStage[s] = filteredMatches.filter(m => m.status === s); });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="candidates">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="candidates">Candidates ({allMatches.length})</TabsTrigger>
          <TabsTrigger value="listings">Job Listings ({listings.length})</TabsTrigger>
        </TabsList>

        {/* CANDIDATES TAB */}
        <TabsContent value="candidates" className="mt-4 space-y-4">
          {/* Filter by job */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Filter by job..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs ({allMatches.length} candidates)</SelectItem>
                {listings.map(j => {
                  const count = allMatches.filter(m => m.job_listing_id === j.id).length;
                  return (
                    <SelectItem key={j.id} value={j.id}>{j.title} ({count})</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{filteredMatches.length} candidates shown</p>
          </div>

          {filteredMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold mb-1">No candidates yet</p>
              <p className="text-sm text-muted-foreground">Post a job and the matching engine will recommend candidates.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {PIPELINE_STAGES.map(stage => {
                const items = groupedByStage[stage] || [];
                if (items.length === 0) return null;
                const info = JOB_STATUSES[stage];
                return (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs border-0 ${info.color}`}>{info.label}</Badge>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {items
                        .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
                        .map(m => (
                          <CandidateCard
                            key={m.id}
                            match={m}
                            onStatusChange={handleStatusChange}
                            onNotesSave={handleNotesSave}
                          />
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* JOB LISTINGS TAB */}
        <TabsContent value="listings" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="gap-1.5" onClick={() => { setEditJob(null); setShowJobDialog(true); }}>
              <Plus className="w-3.5 h-3.5" /> Post New Job
            </Button>
          </div>

          {listings.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold mb-1">No job listings yet</p>
              <p className="text-sm text-muted-foreground mb-4">Post your first job to start receiving matched candidates.</p>
              <Button size="sm" onClick={() => { setEditJob(null); setShowJobDialog(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Post a Job
              </Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {listings.map(job => {
                const matchCount = allMatches.filter(m => m.job_listing_id === job.id).length;
                const hiredCount = allMatches.filter(m => m.job_listing_id === job.id && m.status === 'hired').length;
                const wageStr = job.wage_min
                  ? job.wage_max ? `$${job.wage_min}–$${job.wage_max}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
                  : `$${job.wage_min}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
                  : null;
                return (
                  <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.employer_name}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[10px] border-0 ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {job.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditJob(job); setShowJobDialog(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {(job.city || job.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[job.city, job.state].filter(Boolean).join(', ')}</span>}
                      {wageStr && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{wageStr}</span>}
                      {job.schedule_type && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.schedule_type.replace('_', ' ')}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {matchCount > 0 && <Badge className="text-[10px] bg-primary/10 text-primary border-0">{matchCount} matched</Badge>}
                      {hiredCount > 0 && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">{hiredCount} hired</Badge>}
                      {job.second_chance_friendly && <Badge className="text-[10px] bg-blue-50 text-blue-700 border-0">2nd Chance</Badge>}
                    </div>
                    {job.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <JobListingDialog
        open={showJobDialog}
        onClose={() => { setShowJobDialog(false); setEditJob(null); }}
        onSaved={handleSaved}
        editJob={editJob}
        user={user}
        defaultEmployerId={employer.id}
        defaultEmployerName={employer.company_name}
      />
    </div>
  );
}