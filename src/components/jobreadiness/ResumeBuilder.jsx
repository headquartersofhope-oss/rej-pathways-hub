import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { syncReadinessScore } from '@/lib/syncReadinessScore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  staff_reviewed: 'bg-amber-50 text-amber-700',
  complete: 'bg-emerald-50 text-emerald-700',
};

function SectionHeader({ title, onAdd, addLabel }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</p>
      {onAdd && (
        <button onClick={onAdd} className="text-xs text-primary hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function WorkHistoryEditor({ items, onChange }) {
  const add = () => onChange([...items, { employer: '', title: '', start_date: '', end_date: '', description: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  return (
    <div>
      <SectionHeader title="Work History" onAdd={add} addLabel="Add Job" />
      {items.length === 0 && <p className="text-xs text-muted-foreground mb-2">No work history entries yet.</p>}
      {items.map((job, i) => (
        <div key={i} className="border rounded-lg p-3 mb-2 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Employer" value={job.employer} onChange={e => update(i, 'employer', e.target.value)} className="text-xs h-8" />
            <Input placeholder="Job Title" value={job.title} onChange={e => update(i, 'title', e.target.value)} className="text-xs h-8" />
            <Input placeholder="Start Date (e.g. Jan 2020)" value={job.start_date} onChange={e => update(i, 'start_date', e.target.value)} className="text-xs h-8" />
            <Input placeholder="End Date (or Present)" value={job.end_date} onChange={e => update(i, 'end_date', e.target.value)} className="text-xs h-8" />
          </div>
          <Textarea placeholder="Duties and accomplishments..." value={job.description} onChange={e => update(i, 'description', e.target.value)} rows={2} className="text-xs" />
          <button onClick={() => remove(i)} className="text-xs text-destructive hover:underline">Remove</button>
        </div>
      ))}
    </div>
  );
}

function EducationEditor({ items, onChange }) {
  const add = () => onChange([...items, { institution: '', credential: '', year: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  return (
    <div>
      <SectionHeader title="Education" onAdd={add} addLabel="Add Education" />
      {items.length === 0 && <p className="text-xs text-muted-foreground mb-2">No education entries yet.</p>}
      {items.map((edu, i) => (
        <div key={i} className="border rounded-lg p-3 mb-2 space-y-2 bg-muted/30">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Institution" value={edu.institution} onChange={e => update(i, 'institution', e.target.value)} className="text-xs h-8 col-span-2" />
            <Input placeholder="Year" value={edu.year} onChange={e => update(i, 'year', e.target.value)} className="text-xs h-8" />
            <Input placeholder="Credential / Degree" value={edu.credential} onChange={e => update(i, 'credential', e.target.value)} className="text-xs h-8 col-span-3" />
          </div>
          <button onClick={() => remove(i)} className="text-xs text-destructive hover:underline">Remove</button>
        </div>
      ))}
    </div>
  );
}

function ReferencesEditor({ items, onChange }) {
  const add = () => onChange([...items, { name: '', relationship: '', phone: '', email: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  return (
    <div>
      <SectionHeader title="References" onAdd={add} addLabel="Add Reference" />
      {items.length === 0 && <p className="text-xs text-muted-foreground mb-2">No references on resume yet.</p>}
      {items.map((ref, i) => (
        <div key={i} className="border rounded-lg p-3 mb-2 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={ref.name} onChange={e => update(i, 'name', e.target.value)} className="text-xs h-8" />
            <Input placeholder="Relationship" value={ref.relationship} onChange={e => update(i, 'relationship', e.target.value)} className="text-xs h-8" />
            <Input placeholder="Phone" value={ref.phone} onChange={e => update(i, 'phone', e.target.value)} className="text-xs h-8" />
            <Input placeholder="Email" value={ref.email} onChange={e => update(i, 'email', e.target.value)} className="text-xs h-8" />
          </div>
          <button onClick={() => remove(i)} className="text-xs text-destructive hover:underline">Remove</button>
        </div>
      ))}
    </div>
  );
}

// Full resume view panel shown after saving
function ResumeView({ resume, onEdit, onDelete, staff }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{resume.version_label || 'Resume'}</span>
          <Badge className={`text-[10px] border-0 ${STATUS_STYLES[resume.status] || 'bg-slate-100 text-slate-700'}`}>
            {resume.status?.replace('_', ' ') || 'draft'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {staff && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit} className="h-7 gap-1 text-xs">
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setExpanded(e => !e)} className="h-7 w-7">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-5 text-sm">
          {/* Contact Info */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-heading font-bold">{resume.full_name || '—'}</h2>
            <div className="flex flex-wrap justify-center gap-3 mt-1 text-xs text-muted-foreground">
              {resume.phone && <span>{resume.phone}</span>}
              {resume.email && <span>{resume.email}</span>}
              {resume.address && <span>{resume.address}</span>}
            </div>
          </div>

          {/* Summary */}
          {resume.objective && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Professional Summary</p>
              <p className="text-sm leading-relaxed">{resume.objective}</p>
            </div>
          )}

          {/* Work History */}
          {resume.work_history?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Work History</p>
              <div className="space-y-3">
                {resume.work_history.map((job, i) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-3">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="font-semibold">{job.title || 'Position'}</span>
                      <span className="text-xs text-muted-foreground">{job.start_date}{job.end_date ? ` – ${job.end_date}` : ''}</span>
                    </div>
                    {job.employer && <p className="text-xs text-muted-foreground">{job.employer}</p>}
                    {job.description && <p className="text-xs mt-1 text-foreground/80">{job.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Education</p>
              <div className="space-y-2">
                {resume.education.map((edu, i) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-3">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="font-semibold">{edu.credential || 'Credential'}</span>
                      <span className="text-xs text-muted-foreground">{edu.year}</span>
                    </div>
                    {edu.institution && <p className="text-xs text-muted-foreground">{edu.institution}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {resume.skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
              </div>
            </div>
          )}

          {/* Certifications */}
          {resume.certifications?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {resume.certifications.map(c => <Badge key={c} className="text-xs bg-primary/10 text-primary border-0">{c}</Badge>)}
              </div>
            </div>
          )}

          {/* References */}
          {resume.references?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">References</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {resume.references.map((ref, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <p className="font-semibold">{ref.name}</p>
                    {ref.relationship && <p className="text-muted-foreground">{ref.relationship}</p>}
                    {ref.phone && <p className="text-muted-foreground">{ref.phone}</p>}
                    {ref.email && <p className="text-muted-foreground">{ref.email}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Notes (internal) */}
          {staff && resume.staff_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Staff Notes (internal)</p>
              <p className="text-xs text-amber-900">{resume.staff_notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ResumeBuilder({ resident, profile, staff, residentId, globalId, onRefresh, resumes, certificates }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    version_label: '',
    full_name: '',
    phone: '',
    email: '',
    address: '',
    objective: '',
    skills: '',
    certifications: '',
    staff_notes: '',
    status: 'draft',
    work_history: [],
    education: [],
    references: [],
  });

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const openNew = () => {
    setEditing(null);
    setForm({
      version_label: `Draft ${(resumes?.length || 0) + 1}`,
      full_name: `${resident?.first_name || ''} ${resident?.last_name || ''}`.trim(),
      phone: resident?.phone || '',
      email: resident?.email || '',
      address: '',
      objective: '',
      skills: (profile?.skills || []).join(', '),
      certifications: (certificates || []).map(c => c.certificate_name).join(', '),
      staff_notes: '',
      status: 'draft',
      work_history: [],
      education: [],
      references: [],
    });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      version_label: r.version_label || '',
      full_name: r.full_name || '',
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      objective: r.objective || '',
      skills: (r.skills || []).join(', '),
      certifications: (r.certifications || []).join(', '),
      staff_notes: r.staff_notes || '',
      status: r.status || 'draft',
      work_history: r.work_history || [],
      education: r.education || [],
      references: r.references || [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!residentId) { console.warn('ResumeBuilder: residentId is missing'); return; }
    setSaving(true);
    const data = {
      global_resident_id: globalId || residentId,
      resident_id: residentId,
      organization_id: resident?.organization_id || '',
      version_label: form.version_label,
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      objective: form.objective,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
      staff_notes: form.staff_notes,
      status: form.status,
      work_history: form.work_history,
      education: form.education,
      references: form.references,
    };
    if (editing) {
      await base44.entities.ResumeRecord.update(editing.id, data);
    } else {
      await base44.entities.ResumeRecord.create(data);
    }

    // Recompute readiness score — resume presence is a major factor
    const updatedResumes = editing
      ? (resumes || []).map(r => r.id === editing.id ? { ...r, ...data } : r)
      : [...(resumes || []), data];
    await syncReadinessScore({ profile, residentId, resumes: updatedResumes });

    await onRefresh();
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resume?')) return;
    await base44.entities.ResumeRecord.delete(id);
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Resume</h3>
        {staff && (
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {resumes?.length > 0 ? 'New Resume Version' : 'Create Resume'}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {(!resumes || resumes.length === 0) ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No resume on file</p>
          {staff ? (
            <>
              <p className="text-xs mb-3">Click below to build a resume for this resident.</p>
              <Button size="sm" onClick={openNew} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create Resume
              </Button>
            </>
          ) : (
            <p className="text-xs">Ask your case manager to create a resume for you.</p>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {resumes.map(r => (
            <ResumeView
              key={r.id}
              resume={r}
              staff={staff}
              onEdit={() => openEdit(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Resume' : 'Create Resume'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">

            {/* Version / Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Version Label</label>
                <Input value={form.version_label} onChange={e => f('version_label', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="staff_reviewed">Staff Reviewed</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Contact Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Full Name</label>
                  <Input value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="Resident's full name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Phone</label>
                  <Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="(555) 555-5555" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                  <Input value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Address / City</label>
                  <Input value={form.address} onChange={e => f('address', e.target.value)} placeholder="City, State" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Professional Summary</p>
              <Textarea value={form.objective} onChange={e => f('objective', e.target.value)} rows={3} placeholder="Brief professional summary or objective..." />
            </div>

            {/* Work History */}
            <WorkHistoryEditor items={form.work_history} onChange={val => f('work_history', val)} />

            {/* Education */}
            <EducationEditor items={form.education} onChange={val => f('education', val)} />

            {/* Skills & Certifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1">Skills</label>
                <Textarea value={form.skills} onChange={e => f('skills', e.target.value)} rows={2} placeholder="Forklift certified, Customer service, Data entry..." className="text-xs" />
                <p className="text-[10px] text-muted-foreground mt-1">Comma-separated</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1">Certifications</label>
                <Textarea value={form.certifications} onChange={e => f('certifications', e.target.value)} rows={2} placeholder="OSHA 10, ServSafe, CPR..." className="text-xs" />
                <p className="text-[10px] text-muted-foreground mt-1">Comma-separated</p>
              </div>
            </div>

            {/* References */}
            <ReferencesEditor items={form.references} onChange={val => f('references', val)} />

            {/* Staff Notes */}
            {staff && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1">Staff Notes (internal only)</label>
                <Textarea value={form.staff_notes} onChange={e => f('staff_notes', e.target.value)} rows={2} placeholder="Internal review notes..." />
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editing ? 'Update Resume' : 'Save Resume')}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}