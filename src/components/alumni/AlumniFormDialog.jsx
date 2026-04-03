import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MENTOR_TOPIC_OPTIONS = [
  'Job Search', 'Resume Writing', 'Interview Prep', 'Financial Literacy',
  'Housing Navigation', 'Justice Reentry', 'Sobriety Support', 'Veteran Benefits',
  'Entrepreneurship', 'Trade Skills', 'Healthcare Careers', 'General Mentorship',
];

const EMPTY = {
  full_name: '', preferred_name: '', email: '', phone: '',
  industry: '', job_title: '', employer_name: '',
  graduation_date: '', population: '',
  willing_to_mentor: false, mentor_topics: [],
  short_story: '', opt_in_contact_sharing: false,
  staff_notes: '', status: 'pending_review',
};

export default function AlumniFormDialog({ open, onOpenChange, editing, user, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        full_name: editing.full_name || '',
        preferred_name: editing.preferred_name || '',
        email: editing.email || '',
        phone: editing.phone || '',
        industry: editing.industry || '',
        job_title: editing.job_title || '',
        employer_name: editing.employer_name || '',
        graduation_date: editing.graduation_date || '',
        population: editing.population || '',
        willing_to_mentor: editing.willing_to_mentor || false,
        mentor_topics: editing.mentor_topics || [],
        short_story: editing.short_story || '',
        opt_in_contact_sharing: editing.opt_in_contact_sharing || false,
        staff_notes: editing.staff_notes || '',
        status: editing.status || 'pending_review',
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleTopic = (t) => setForm(f => ({
    ...f,
    mentor_topics: f.mentor_topics.includes(t)
      ? f.mentor_topics.filter(x => x !== t)
      : [...f.mentor_topics, t],
  }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      opt_in_date: form.opt_in_contact_sharing ? new Date().toISOString().split('T')[0] : null,
      created_by: user?.id,
      global_resident_id: editing?.global_resident_id || null,
      resident_id: editing?.resident_id || null,
    };
    if (editing?.id) {
      await base44.entities.AlumniProfile.update(editing.id, payload);
    } else {
      await base44.entities.AlumniProfile.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Alumni Record' : 'Add Alumni Record'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Full Name *</Label>
              <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Preferred Name</Label>
              <Input value={form.preferred_name} onChange={e => set('preferred_name', e.target.value)} placeholder="Goes by…" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>

          {/* Work */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Industry / Field</Label>
              <Input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Construction" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Job Title</Label>
              <Input value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Title" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Employer</Label>
              <Input value={form.employer_name} onChange={e => set('employer_name', e.target.value)} placeholder="Company" />
            </div>
          </div>

          {/* Program info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Graduation Date</Label>
              <Input type="date" value={form.graduation_date} onChange={e => set('graduation_date', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Population</Label>
              <Select value={form.population} onValueChange={v => set('population', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="justice_impacted">Justice Impacted</SelectItem>
                  <SelectItem value="homeless_veteran">Homeless Veteran</SelectItem>
                  <SelectItem value="foster_youth">Foster Youth</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Record status */}
          <div>
            <Label className="text-xs mb-1 block">Record Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opt-in flags */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Alumni Permissions</p>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="opt_in" checked={form.opt_in_contact_sharing}
                onChange={e => set('opt_in_contact_sharing', e.target.checked)} className="mt-0.5" />
              <div>
                <Label htmlFor="opt_in" className="text-sm cursor-pointer font-medium">Opt-in: Contact Sharing</Label>
                <p className="text-[11px] text-muted-foreground">Alumni has agreed to share their contact info with current residents.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="mentor" checked={form.willing_to_mentor}
                onChange={e => set('willing_to_mentor', e.target.checked)} className="mt-0.5" />
              <div>
                <Label htmlFor="mentor" className="text-sm cursor-pointer font-medium">Willing to Mentor</Label>
                <p className="text-[11px] text-muted-foreground">Alumni will appear in the mentor directory (requires contact opt-in + Active status).</p>
              </div>
            </div>
          </div>

          {/* Mentor topics */}
          {form.willing_to_mentor && (
            <div>
              <Label className="text-xs mb-2 block">Mentorship Topics</Label>
              <div className="flex flex-wrap gap-1.5">
                {MENTOR_TOPIC_OPTIONS.map(t => (
                  <button key={t} onClick={() => toggleTopic(t)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                      form.mentor_topics.includes(t)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Short story */}
          <div>
            <Label className="text-xs mb-1 block">Short Story / Bio</Label>
            <Textarea rows={3} value={form.short_story}
              onChange={e => set('short_story', e.target.value)}
              placeholder="Brief success story or personal message to share with current residents…" />
          </div>

          {/* Staff notes (internal) */}
          <div>
            <Label className="text-xs mb-1 block">Internal Staff Notes</Label>
            <Textarea rows={2} value={form.staff_notes}
              onChange={e => set('staff_notes', e.target.value)}
              placeholder="Internal notes — not visible to residents." />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={saving || !form.full_name} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Alumni Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}