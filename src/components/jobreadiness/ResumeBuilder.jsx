import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, FileText, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  staff_reviewed: 'bg-amber-50 text-amber-700',
  complete: 'bg-emerald-50 text-emerald-700',
};

export default function ResumeBuilder({ resident, profile, staff, residentId, globalId, onRefresh, resumes, certificates }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    version_label: '',
    objective: '',
    skills: '',
    certifications: '',
    staff_notes: '',
    status: 'draft',
    work_history: [],
    education: [],
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      version_label: `Draft ${resumes.length + 1}`,
      objective: '',
      skills: (profile?.skills || []).join(', '),
      certifications: certificates.map(c => c.certificate_name).join(', '),
      staff_notes: '',
      status: 'draft',
      work_history: [],
      education: [],
    });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      version_label: r.version_label || '',
      objective: r.objective || '',
      skills: (r.skills || []).join(', '),
      certifications: (r.certifications || []).join(', '),
      staff_notes: r.staff_notes || '',
      status: r.status || 'draft',
      work_history: r.work_history || [],
      education: r.education || [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      global_resident_id: globalId,
      resident_id: residentId,
      organization_id: resident.organization_id,
      version_label: form.version_label,
      objective: form.objective,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
      staff_notes: form.staff_notes,
      status: form.status,
      work_history: form.work_history,
      education: form.education,
    };
    if (editing) {
      await base44.entities.ResumeRecord.update(editing.id, data);
    } else {
      await base44.entities.ResumeRecord.create(data);
    }
    onRefresh();
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.ResumeRecord.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Resume Drafts</h3>
        {staff && (
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Resume
          </Button>
        )}
      </div>

      {resumes.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No resumes yet. {staff ? 'Create one above.' : 'Ask your case manager to build one.'}
        </Card>
      ) : (
        resumes.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm">{r.version_label || 'Resume'}</p>
                  <Badge className={`text-[10px] border-0 ${STATUS_STYLES[r.status]}`}>{r.status?.replace('_', ' ')}</Badge>
                </div>
                {r.objective && <p className="text-xs text-muted-foreground line-clamp-2">{r.objective}</p>}
                {r.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.skills.slice(0, 5).map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                    {r.skills.length > 5 && <Badge variant="outline" className="text-[10px]">+{r.skills.length - 5}</Badge>}
                  </div>
                )}
              </div>
              {staff && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Resume' : 'New Resume'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Version Label</label>
                <Input value={form.version_label} onChange={e => setForm(f => ({ ...f, version_label: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="staff_reviewed">Staff Reviewed</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Objective / Summary</label>
              <Textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={3} placeholder="Brief professional summary..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Skills (comma separated)</label>
              <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Forklift certified, Customer service..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Certifications (comma separated)</label>
              <Input value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} placeholder="e.g. OSHA 10, ServSafe..." />
            </div>
            {staff && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Staff Notes (internal)</label>
                <Textarea value={form.staff_notes} onChange={e => setForm(f => ({ ...f, staff_notes: e.target.value }))} rows={2} placeholder="Internal review notes..." />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Resume'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}