import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  overall_score: '',
  communication_score: '',
  confidence_score: '',
  preparation_score: '',
  strengths: '',
  areas_to_improve: '',
  notes: '',
};

export default function MockInterviewPanel({ resident, profile, staff, residentId, globalId, onRefresh, mockInterviews, user }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleOpen = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!residentId || !globalId) return;
    setSaving(true);
    const data = {
      global_resident_id: globalId,
      resident_id: residentId,
      organization_id: resident?.organization_id || '',
      conducted_by: user?.id,
      conducted_by_name: user?.full_name,
      date: form.date,
      overall_score: form.overall_score ? Number(form.overall_score) : null,
      communication_score: form.communication_score ? Number(form.communication_score) : null,
      confidence_score: form.confidence_score ? Number(form.confidence_score) : null,
      preparation_score: form.preparation_score ? Number(form.preparation_score) : null,
      strengths: form.strengths,
      areas_to_improve: form.areas_to_improve,
      notes: form.notes,
    };
    await base44.entities.MockInterview.create(data);
    // Update interview readiness score on profile if overall score provided
    if (profile && data.overall_score != null) {
      await base44.entities.EmployabilityProfile.update(profile.id, {
        interview_readiness_score: data.overall_score,
      });
    }
    onRefresh();
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this interview record?')) return;
    await base44.entities.MockInterview.delete(id);
    onRefresh();
  };

  const scoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Mock Interviews</h3>
        {staff && (
          <Button size="sm" onClick={handleOpen} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Mock Interview
          </Button>
        )}
      </div>

      {mockInterviews.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No mock interviews recorded yet.</p>
          {staff && (
            <Button size="sm" className="mt-3 gap-1.5" onClick={handleOpen}>
              <Plus className="w-3.5 h-3.5" /> Add Mock Interview
            </Button>
          )}
        </Card>
      ) : (
        mockInterviews.map(m => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold">{m.date}</p>
                  {m.conducted_by_name && <p className="text-xs text-muted-foreground">by {m.conducted_by_name}</p>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    ['Overall', m.overall_score],
                    ['Communication', m.communication_score],
                    ['Confidence', m.confidence_score],
                    ['Preparation', m.preparation_score],
                  ].filter(([, score]) => score != null).map(([label, score]) => (
                    <div key={label} className="text-center">
                      <p className={`font-heading font-bold text-lg ${scoreColor(score)}`}>{score}%</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <Progress value={score} className="h-1 mt-1" />
                    </div>
                  ))}
                </div>
                {m.strengths && (
                  <p className="text-xs mb-1">
                    <span className="font-medium text-emerald-700">Strengths: </span>
                    <span className="text-muted-foreground">{m.strengths}</span>
                  </p>
                )}
                {m.areas_to_improve && (
                  <p className="text-xs mb-1">
                    <span className="font-medium text-amber-700">Areas to Improve: </span>
                    <span className="text-muted-foreground">{m.areas_to_improve}</span>
                  </p>
                )}
                {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
              </div>
              {staff && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Mock Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} />
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
              <label className="text-xs font-medium text-muted-foreground block mb-1">Additional Notes</label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} placeholder="Any other observations..." />
            </div>

            <div className="flex gap-2 border-t pt-3">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Interview'}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}