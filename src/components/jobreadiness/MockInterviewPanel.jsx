import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MessageSquare, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  interviewer_name: '',
  overall_score: '',
  communication_score: '',
  confidence_score: '',
  preparation_score: '',
  strengths: '',
  areas_to_improve: '',
  recommended_next_steps: '',
  notes: '',
};

const scoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';
const scoreBg = (s) => s >= 80 ? 'bg-emerald-50 text-emerald-700' : s >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';

export default function MockInterviewPanel({ resident, profile, staff, residentId, globalId, onRefresh, mockInterviews, user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState(null);

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, interviewer_name: user?.full_name || '' });
    setShowForm(true);
  };

  const handleOpenEdit = (m) => {
    setEditingId(m.id);
    setForm({
      date: m.date || new Date().toISOString().split('T')[0],
      interviewer_name: m.interviewer_name || m.conducted_by_name || '',
      overall_score: m.overall_score ?? '',
      communication_score: m.communication_score ?? '',
      confidence_score: m.confidence_score ?? '',
      preparation_score: m.preparation_score ?? '',
      strengths: m.strengths || '',
      areas_to_improve: m.areas_to_improve || '',
      recommended_next_steps: m.recommended_next_steps || '',
      notes: m.notes || '',
    });
    setShowForm(true);
  };

  // Block backdrop clicks from silently closing the form
  const handleDialogChange = (open) => {
    if (!open) return; // only allow explicit cancel/save to close
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!residentId) { console.warn('MockInterviewPanel: residentId is missing'); return; }
    if (!form.date) { alert('Date is required.'); return; }

    setSaving(true);
    const payload = {
      global_resident_id: globalId || residentId,
      resident_id: residentId,
      organization_id: resident?.organization_id || '',
      conducted_by: user?.id,
      conducted_by_name: user?.full_name,
      interviewer_name: form.interviewer_name || user?.full_name || '',
      date: form.date,
      overall_score: form.overall_score !== '' ? Number(form.overall_score) : null,
      communication_score: form.communication_score !== '' ? Number(form.communication_score) : null,
      confidence_score: form.confidence_score !== '' ? Number(form.confidence_score) : null,
      preparation_score: form.preparation_score !== '' ? Number(form.preparation_score) : null,
      strengths: form.strengths,
      areas_to_improve: form.areas_to_improve,
      recommended_next_steps: form.recommended_next_steps,
      notes: form.notes,
    };

    if (editingId) {
      await base44.entities.MockInterview.update(editingId, payload);
    } else {
      await base44.entities.MockInterview.create(payload);
    }

    // Sync latest overall score to the employability profile
    if (profile && payload.overall_score != null) {
      await base44.entities.EmployabilityProfile.update(profile.id, {
        interview_readiness_score: payload.overall_score,
      });
    }

    await onRefresh();
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this mock interview record?')) return;
    await base44.entities.MockInterview.delete(id);
    await onRefresh();
  };

  // Sort newest first
  const sorted = [...mockInterviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm">Mock Interviews</h3>
          {latest?.overall_score != null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest score: <span className={`font-bold ${scoreColor(latest.overall_score)}`}>{latest.overall_score}%</span>
              {' '}· {sorted.length} session{sorted.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {staff && (
          <Button size="sm" onClick={handleOpenNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Mock Interview
          </Button>
        )}
      </div>

      {/* Latest score banner */}
      {latest?.overall_score != null && (
        <Card className={`p-3 flex items-center gap-3 border-0 ${scoreBg(latest.overall_score)}`}>
          <div className="flex-1">
            <p className="text-xs font-semibold">Latest Interview Score</p>
            <p className="text-xs opacity-80">{latest.date} · {latest.interviewer_name || latest.conducted_by_name || 'Staff'}</p>
          </div>
          <p className={`font-heading font-bold text-2xl ${scoreColor(latest.overall_score)}`}>{latest.overall_score}%</p>
        </Card>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No mock interviews recorded yet.</p>
          {staff && (
            <Button size="sm" className="mt-3 gap-1.5" onClick={handleOpenNew}>
              <Plus className="w-3.5 h-3.5" /> Add Mock Interview
            </Button>
          )}
        </Card>
      ) : (
        sorted.map((m, idx) => {
          const isExpanded = expandedId === m.id;
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className="text-sm font-semibold">{m.date}</p>
                    {idx === 0 && <Badge className="text-[10px] bg-primary/10 text-primary border-0">Latest</Badge>}
                    {m.overall_score != null && (
                      <span className={`text-xs font-bold ${scoreColor(m.overall_score)}`}>{m.overall_score}% overall</span>
                    )}
                    {(m.interviewer_name || m.conducted_by_name) && (
                      <span className="text-xs text-muted-foreground">by {m.interviewer_name || m.conducted_by_name}</span>
                    )}
                  </div>

                  {/* Score bars */}
                  {[
                    ['Overall', m.overall_score],
                    ['Communication', m.communication_score],
                    ['Confidence', m.confidence_score],
                    ['Preparation', m.preparation_score],
                  ].filter(([, score]) => score != null).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                      {[
                        ['Overall', m.overall_score],
                        ['Communication', m.communication_score],
                        ['Confidence', m.confidence_score],
                        ['Preparation', m.preparation_score],
                      ].filter(([, score]) => score != null).map(([label, score]) => (
                        <div key={label} className="text-center">
                          <p className={`font-heading font-bold text-base ${scoreColor(score)}`}>{score}%</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <Progress value={score} className="h-1 mt-1" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expandable detail */}
                  {(m.strengths || m.areas_to_improve || m.recommended_next_steps || m.notes) && (
                    <button
                      className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                  )}

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 text-xs">
                      {m.strengths && (
                        <p><span className="font-semibold text-emerald-700">Strengths: </span><span className="text-muted-foreground">{m.strengths}</span></p>
                      )}
                      {m.areas_to_improve && (
                        <p><span className="font-semibold text-amber-700">Areas to Improve: </span><span className="text-muted-foreground">{m.areas_to_improve}</span></p>
                      )}
                      {m.recommended_next_steps && (
                        <p><span className="font-semibold text-blue-700">Next Steps: </span><span className="text-muted-foreground">{m.recommended_next_steps}</span></p>
                      )}
                      {m.notes && (
                        <p className="text-muted-foreground italic">{m.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {staff && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(m)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}

      {/* Form Dialog — backdrop click blocked intentionally */}
      <Dialog open={showForm} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Mock Interview' : 'Record Mock Interview'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Date <span className="text-destructive">*</span></label>
                <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Interviewer Name</label>
                <Input value={form.interviewer_name} onChange={e => f('interviewer_name', e.target.value)} placeholder="Staff name" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Scores (0–100)</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['overall_score', 'Overall Score'],
                  ['communication_score', 'Communication'],
                  ['confidence_score', 'Confidence'],
                  ['preparation_score', 'Preparation'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                    <Input
                      type="number" min="0" max="100"
                      value={form[key]}
                      onChange={e => f(key, e.target.value)}
                      placeholder="0–100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Strengths</label>
              <Textarea value={form.strengths} onChange={e => f('strengths', e.target.value)} rows={2} placeholder="What did the resident do well?" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Areas to Improve</label>
              <Textarea value={form.areas_to_improve} onChange={e => f('areas_to_improve', e.target.value)} rows={2} placeholder="What should the resident work on?" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Recommended Next Steps</label>
              <Textarea value={form.recommended_next_steps} onChange={e => f('recommended_next_steps', e.target.value)} rows={2} placeholder="Suggested actions before the next interview..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Additional Notes</label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} placeholder="Any other observations..." />
            </div>

            <div className="flex gap-2 border-t pt-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Mock Interview'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}