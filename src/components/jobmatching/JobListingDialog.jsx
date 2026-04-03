import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const EMPTY = {
  title: '', employer_name: '', source: 'internal', source_label: '',
  location: '', city: '', state: '', is_remote: false,
  wage_min: '', wage_max: '', wage_type: 'hourly', schedule_type: 'full_time',
  shifts: [], industry: '', description: '', requirements: '',
  certifications_required: [], skills_required: [],
  transportation_accessible: true, max_commute_miles: '',
  second_chance_friendly: false, veteran_friendly: false,
  accommodations_available: false, background_check_required: false,
  drug_test_required: false, status: 'active',
  posted_date: new Date().toISOString().split('T')[0], expiration_date: '', notes: '',
};

const SHIFT_OPTIONS = ['morning', 'afternoon', 'evening', 'overnight', 'weekends', 'flexible'];
const SOURCES = [
  { value: 'employer_direct', label: 'Employer Direct' },
  { value: 'internal', label: 'Internal / Manual' },
  { value: 'staffing_partner', label: 'Staffing Partner' },
  { value: 'workforce_board', label: 'Workforce Board' },
  { value: 'external_board', label: 'External Job Board' },
];

export default function JobListingDialog({ open, onClose, onSaved, editJob, user }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [certInput, setCertInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (editJob) {
      setForm({ ...EMPTY, ...editJob, shifts: editJob.shifts || [], certifications_required: editJob.certifications_required || [], skills_required: editJob.skills_required || [] });
    } else {
      setForm(EMPTY);
    }
  }, [editJob, open]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleShift = (s) => f('shifts', form.shifts.includes(s) ? form.shifts.filter(x => x !== s) : [...form.shifts, s]);
  const addTag = (field, val, setter) => { if (val.trim()) { f(field, [...(form[field] || []), val.trim()]); setter(''); } };
  const removeTag = (field, idx) => f(field, form[field].filter((_, i) => i !== idx));

  const handleClose = () => { if (!saving) onClose(); };

  const handleSave = async () => {
    if (!form.title || !form.employer_name) { alert('Title and Employer are required.'); return; }
    setSaving(true);
    const payload = {
      ...form,
      wage_min: form.wage_min !== '' ? Number(form.wage_min) : null,
      wage_max: form.wage_max !== '' ? Number(form.wage_max) : null,
      max_commute_miles: form.max_commute_miles !== '' ? Number(form.max_commute_miles) : null,
      created_by: form.created_by || user?.id,
    };
    if (editJob) {
      await base44.entities.JobListing.update(editJob.id, payload);
    } else {
      await base44.entities.JobListing.create(payload);
    }
    await onSaved();
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editJob ? 'Edit Job Listing' : 'Add Job Listing'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Job Title <span className="text-destructive">*</span></label>
              <Input value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Warehouse Associate" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Employer Name <span className="text-destructive">*</span></label>
              <Input value={form.employer_name} onChange={e => f('employer_name', e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Source</label>
              <Select value={form.source} onValueChange={v => f('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.source !== 'internal' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Source Name / Partner</label>
                <Input value={form.source_label} onChange={e => f('source_label', e.target.value)} placeholder="Partner or board name" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Industry</label>
              <Input value={form.industry} onChange={e => f('industry', e.target.value)} placeholder="e.g. Warehouse, Healthcare" />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Location / Address</label>
              <Input value={form.location} onChange={e => f('location', e.target.value)} placeholder="Street address or area" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">State</label>
              <Input value={form.state} onChange={e => f('state', e.target.value)} placeholder="CA" />
            </div>
          </div>

          {/* Wage & Schedule */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Min Wage</label>
              <Input type="number" value={form.wage_min} onChange={e => f('wage_min', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Max Wage</label>
              <Input type="number" value={form.wage_max} onChange={e => f('wage_max', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Wage Type</label>
              <Select value={form.wage_type} onValueChange={v => f('wage_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['hourly','salary','commission','stipend'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Schedule</label>
              <Select value={form.schedule_type} onValueChange={v => f('schedule_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['full_time','part_time','contract','seasonal','flexible'].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_',' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shifts */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Available Shifts</label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_OPTIONS.map(s => (
                <button key={s} type="button"
                  className={`px-3 py-1 rounded-full text-xs border transition-colors capitalize ${form.shifts.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
                  onClick={() => toggleShift(s)}>{s}
                </button>
              ))}
            </div>
          </div>

          {/* Certs */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Certifications Required</label>
            <div className="flex gap-2 mb-1.5">
              <Input value={certInput} onChange={e => setCertInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag('certifications_required', certInput, setCertInput)} placeholder="Type and press Enter" />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag('certifications_required', certInput, setCertInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.certifications_required.map((c, i) => (
                <Badge key={i} className="gap-1 bg-muted text-foreground border-0">
                  {c} <button onClick={() => removeTag('certifications_required', i)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Skills Required</label>
            <div className="flex gap-2 mb-1.5">
              <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag('skills_required', skillInput, setSkillInput)} placeholder="Type and press Enter" />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag('skills_required', skillInput, setSkillInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.skills_required.map((s, i) => (
                <Badge key={i} className="gap-1 bg-muted text-foreground border-0">
                  {s} <button onClick={() => removeTag('skills_required', i)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Job Flags</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['second_chance_friendly', 'Second Chance Friendly'],
                ['veteran_friendly', 'Veteran Friendly'],
                ['is_remote', 'Remote Eligible'],
                ['transportation_accessible', 'Transit Accessible'],
                ['accommodations_available', 'Accommodations Available'],
                ['background_check_required', 'Background Check Required'],
                ['drug_test_required', 'Drug Test Required'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={e => f(key, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Description / Requirements */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Job Description</label>
            <Textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3} placeholder="Describe the role..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Requirements</label>
            <Textarea value={form.requirements} onChange={e => f('requirements', e.target.value)} rows={2} placeholder="Experience, skills, or qualifications needed..." />
          </div>

          {/* Status & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['active','inactive','filled','draft'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Posted Date</label>
              <Input type="date" value={form.posted_date} onChange={e => f('posted_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Expires</label>
              <Input type="date" value={form.expiration_date} onChange={e => f('expiration_date', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 border-t pt-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editJob ? 'Save Changes' : 'Create Job Listing'}</Button>
            <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}