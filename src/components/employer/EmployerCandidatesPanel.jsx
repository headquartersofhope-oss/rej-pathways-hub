import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, CheckCircle2, AlertTriangle, Award, BookOpen,
  ChevronDown, ChevronUp, Star
} from 'lucide-react';
import { JOB_STATUSES, matchLabel } from '@/lib/jobMatchScoring';

// Only stages employers can set
const EMPLOYER_STAGES = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'interview_requested', label: 'Interview Requested' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'hired', label: 'Hired' },
  { value: 'not_selected', label: 'Not Selected' },
];

const NEXT_STAGE = {
  recommended: 'interview_requested',
  interview_requested: 'interview_scheduled',
  interview_scheduled: 'hired',
};

function CandidateSummaryCard({ match, onStatusChange, onNotesSave }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(match.notes || '');
  const [saving, setSaving] = useState(false);

  const { bg, color, label } = matchLabel(match.match_score ?? 0);
  const statusInfo = JOB_STATUSES[match.status] || { label: match.status, color: 'bg-muted text-muted-foreground' };
  const nextStage = NEXT_STAGE[match.status];
  const candidateLabel = `Candidate #${match.resident_id?.slice(-6).toUpperCase() || '—'}`;

  const handleSave = async () => {
    setSaving(true);
    await onNotesSave(match.id, notes);
    setSaving(false);
    setEditingNotes(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`font-bold text-sm ${color}`}>{match.match_score ?? '?'}</span>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{candidateLabel}</p>
              <p className="text-xs text-muted-foreground">{label} match · {match.job_title}</p>
            </div>
            <Badge className={`text-[10px] border-0 flex-shrink-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Strengths */}
          {match.match_reasons?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.match_reasons.slice(0, expanded ? 999 : 2).map((r, i) => (
                <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {r.slice(0, 50)}{r.length > 50 ? '…' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Blockers — employer-safe language only */}
          {match.blockers?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.blockers.slice(0, expanded ? 999 : 1).map((b, i) => (
                <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {b.slice(0, 50)}{b.length > 50 ? '…' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Learning / Certs */}
          {match.learning_summary?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.learning_summary.map((l, i) => (
                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  {l.type === 'cert' ? <Award className="w-2.5 h-2.5" /> : <BookOpen className="w-2.5 h-2.5" />}
                  {l.label}
                </span>
              ))}
            </div>
          )}

          {/* Readiness score if available */}
          {match.readiness_score != null && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-secondary" />
              <span className="text-xs text-muted-foreground">Job Readiness: <strong>{match.readiness_score}/100</strong></span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {nextStage && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                onClick={() => onStatusChange(match.id, nextStage)}
              >
                → {EMPLOYER_STAGES.find(s => s.value === nextStage)?.label}
              </Button>
            )}
            <Select value={match.status} onValueChange={v => onStatusChange(match.id, v)}>
              <SelectTrigger className="h-6 text-[10px] w-40 flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYER_STAGES.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less' : 'Notes & Details'}
            </button>
          </div>

          {/* Expanded notes */}
          {expanded && (
            <div className="border-t pt-3 space-y-3 mt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Interview & Hiring Notes
                  </p>
                  {!editingNotes && (
                    <button
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => setEditingNotes(true)}
                    >
                      Add note
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Interview feedback, impressions, next steps, hiring decision notes..."
                      className="text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => { setEditingNotes(false); setNotes(match.notes || ''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {notes || 'No notes yet. Click "Add note" to leave feedback.'}
                  </p>
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

export default function EmployerCandidatesPanel({ job, employer }) {
  const queryClient = useQueryClient();

  const { data: matches = [], refetch } = useQuery({
    queryKey: ['ep-candidates', job.id],
    queryFn: async () => {
      const all = await base44.entities.JobMatch.list();
      const raw = all.filter(m => m.job_listing_id === job.id && m.staff_approved);

      // Load certs + enrollments for learning summary (safe fields only)
      const certs = await base44.entities.Certificate.list();
      const enrollments = await base44.entities.ClassEnrollment.list('-created_date', 500);

      return raw.map(m => {
        const myCerts = certs.filter(c => c.resident_id === m.resident_id);
        const completedEnrollments = enrollments.filter(
          e => e.resident_id === m.resident_id && (e.status === 'completed' || e.quiz_passed)
        );
        const learning_summary = [
          ...myCerts.map(c => ({ type: 'cert', label: c.certificate_name })),
          ...(completedEnrollments.length > 0
            ? [{ type: 'class', label: `${completedEnrollments.length} class${completedEnrollments.length !== 1 ? 'es' : ''} completed` }]
            : []),
        ];
        return { ...m, learning_summary };
      });
    },
    enabled: !!job?.id,
    staleTime: 0,
  });

  const handleStatusChange = async (matchId, newStatus) => {
    const update = { status: newStatus };
    if (newStatus === 'hired') update.hired_date = new Date().toISOString().split('T')[0];
    await base44.entities.JobMatch.update(matchId, update);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['ep-matches'] });
    queryClient.invalidateQueries({ queryKey: ['ep-listings'] });
  };

  const handleNotesSave = async (matchId, notes) => {
    await base44.entities.JobMatch.update(matchId, { notes });
    refetch();
  };

  const STAGES = ['recommended', 'interview_requested', 'interview_scheduled', 'hired', 'not_selected'];

  if (matches.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
        <p className="font-semibold mb-1">No approved candidates yet</p>
        <p className="text-sm text-muted-foreground">
          Candidates will appear here once the program team has reviewed and approved them for this position.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{matches.length} candidate{matches.length !== 1 ? 's' : ''} matched to this position</p>

      {STAGES.map(stage => {
        const items = matches.filter(m => m.status === stage);
        if (items.length === 0) return null;
        const info = JOB_STATUSES[stage] || { label: stage, color: 'bg-muted text-muted-foreground' };
        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-xs border-0 ${info.color}`}>{info.label}</Badge>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {items
                .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
                .map(m => (
                  <CandidateSummaryCard
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
  );
}