import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function MockInterviewPanel({ resident, profile, staff, residentId, globalId, onRefresh, mockInterviews, user }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    overall_score: '',
    communication_score: '',
    confidence_score: '',
    preparation_score: '',
    strengths: '',
    areas_to_improve: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    const data = {
      global_resident_id: globalId,
      resident_id: residentId,
      organization_id: resident.organization_id,
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
    // Update interview readiness score on profile
    if (profile && data.overall_score != null) {
      await base44.entities.EmployabilityProfile.update(profile.id, {
        interview_readiness_score: data.overall_score,
      });
    }
    onRefresh();
    setSaving(false);
    setShowForm(false);
  };

  const scoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Mock Interviews</h3>
        {staff && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Record Interview
          </Button>
        )}
      </div>

      {mockInterviews.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No mock interviews recorded yet.
        </Card>
      ) : (
        mockInterviews.map(m => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">{m.date} {m.conducted_by_name ? `· ${m.conducted_by_name}` : ''}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    ['Overall', m.overall_score],
                    ['Communication', m.communication_score],
                    ['Confidence', m.confidence_score],
                    ['Preparation', m.preparation_score],
                  ].map(([label, score]) => score != null ? (
                    <div key={label} className="text-center">
                      <p className={`font-heading font-bold text-lg ${scoreColor(score)}`}>{score}%</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <Progress value={score} className="h-1 mt-1" />
                    </div>
                  ) : null)}
                </div>
                {m.strengths && <p className="text-xs text-emerald-700 mb-1"><span className="font-medium">Strengths:</span> {m.strengths}</p>}
                {m.areas_to_improve && <p className="text-xs text-amber-700"><span className="font-medium">Improve:</span> {m.areas_to_improve}</p>}
              </div>
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
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['overall_score', 'Overall Score (0-100)'],
                ['communication_score', 'Communication'],
                ['confidence_score', 'Confidence'],
                ['preparation_score', 'Preparation'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <Input type="number" min="0" max="100" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0-100" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Strengths</label>
              <Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Areas to Improve</label>
              <Textarea value={form.areas_to_improve} onChange={e => setForm(f => ({ ...f, areas_to_improve: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}