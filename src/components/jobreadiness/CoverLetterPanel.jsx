import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  staff_reviewed: 'bg-amber-50 text-amber-700',
  complete: 'bg-emerald-50 text-emerald-700',
};

export default function CoverLetterPanel({ resident, staff, residentId, globalId, onRefresh, coverLetters }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ label: '', target_job_type: '', content: '', status: 'draft', staff_notes: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ label: '', target_job_type: '', content: '', status: 'draft', staff_notes: '' });
    setShowForm(true);
  };

  const openEdit = (cl) => {
    setEditing(cl);
    setForm({ label: cl.label || '', target_job_type: cl.target_job_type || '', content: cl.content || '', status: cl.status || 'draft', staff_notes: cl.staff_notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      global_resident_id: globalId || residentId,
      resident_id: residentId,
      organization_id: resident?.organization_id || '',
      ...form,
    };
    if (editing) {
      await base44.entities.CoverLetterRecord.update(editing.id, data);
    } else {
      await base44.entities.CoverLetterRecord.create(data);
    }
    await onRefresh();
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.CoverLetterRecord.delete(id);
    await onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Cover Letters</h3>
        {staff && (
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Cover Letter
          </Button>
        )}
      </div>

      {coverLetters.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No cover letters yet. {staff ? 'Create one above.' : 'Ask your case manager.'}
        </Card>
      ) : (
        coverLetters.map(cl => (
          <Card key={cl.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm">{cl.label || 'Cover Letter'}</p>
                  <Badge className={`text-[10px] border-0 ${STATUS_STYLES[cl.status]}`}>{cl.status?.replace('_', ' ')}</Badge>
                  {cl.target_job_type && <Badge variant="outline" className="text-[10px]">{cl.target_job_type}</Badge>}
                </div>
                {cl.content && (
                  <p
                    className={`text-xs text-muted-foreground cursor-pointer ${expanded === cl.id ? '' : 'line-clamp-2'}`}
                    onClick={() => setExpanded(expanded === cl.id ? null : cl.id)}
                  >
                    {cl.content}
                  </p>
                )}
              </div>
              {staff && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cl)} className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cl.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Cover Letter' : 'New Cover Letter'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Label</label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. General, Warehouse Roles" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Target Job Type</label>
                <Input value={form.target_job_type} onChange={e => setForm(f => ({ ...f, target_job_type: e.target.value }))} placeholder="e.g. Forklift Operator" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Cover Letter Content</label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} placeholder="Dear Hiring Manager..." />
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
            {staff && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Staff Notes</label>
                <Textarea value={form.staff_notes} onChange={e => setForm(f => ({ ...f, staff_notes: e.target.value }))} rows={2} />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}