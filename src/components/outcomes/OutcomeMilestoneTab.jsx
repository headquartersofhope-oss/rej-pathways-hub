import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2, Clock, Plus, Pencil, Phone, User, Home, Briefcase, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

const MILESTONES = [
  { id: '30_days',   label: '30 Days',   days: 30 },
  { id: '60_days',   label: '60 Days',   days: 60 },
  { id: '90_days',   label: '90 Days',   days: 90 },
  { id: '6_months',  label: '6 Months',  days: 180 },
  { id: '1_year',    label: '1 Year',    days: 365 },
  { id: '2_years',   label: '2 Years',   days: 730 },
];

const EMPLOYMENT_LABELS = {
  employed_full_time: 'Full-Time',
  employed_part_time: 'Part-Time',
  self_employed: 'Self-Employed',
  unemployed: 'Unemployed',
  unable_to_work: 'Unable to Work',
  unknown: 'Unknown',
};

const RETENTION_LABELS = {
  retained_same_job: 'Retained',
  changed_jobs: 'Changed Jobs',
  promoted: 'Promoted',
  lost_job: 'Lost Job',
  never_employed: 'Never Employed',
  unknown: 'Unknown',
};

const HOUSING_LABELS = {
  stable_housed: 'Stable',
  transitional: 'Transitional',
  unstable: 'Unstable',
  experiencing_homelessness: 'Homeless',
  unknown: 'Unknown',
};

const INCOME_LABELS = {
  stable: 'Stable',
  improving: 'Improving',
  declining: 'Declining',
  no_income: 'No Income',
  unknown: 'Unknown',
};

const employmentColor = (v) => ({
  employed_full_time: 'text-emerald-600 bg-emerald-50',
  employed_part_time: 'text-teal-600 bg-teal-50',
  self_employed: 'text-blue-600 bg-blue-50',
  unemployed: 'text-red-600 bg-red-50',
  unable_to_work: 'text-amber-600 bg-amber-50',
}[v] || 'text-muted-foreground bg-muted');

const housingColor = (v) => ({
  stable_housed: 'text-emerald-600 bg-emerald-50',
  transitional: 'text-amber-600 bg-amber-50',
  unstable: 'text-orange-600 bg-orange-50',
  experiencing_homelessness: 'text-red-600 bg-red-50',
}[v] || 'text-muted-foreground bg-muted');

const BARRIER_OPTIONS = [
  'legal', 'identification_documents', 'housing_stability', 'transportation', 'education',
  'digital_literacy', 'work_history', 'interview_readiness', 'mental_health_support',
  'substance_recovery', 'childcare_dependent_care', 'benefits', 'financial_readiness',
  'disability_accommodations', 'clothing_tools_gear', 'communication_access',
];

const EMPTY_FORM = {
  follow_up_date: new Date().toISOString().split('T')[0],
  contact_method: 'phone_call',
  contact_successful: true,
  employment_status: 'unknown',
  job_retention: 'unknown',
  housing_stability: 'unknown',
  income_stability: 'unknown',
  successfully_placed: false,
  recidivism_flag: false,
  employer_name: '',
  job_title: '',
  hourly_wage: '',
  ongoing_barriers: [],
  notes: '',
};

function MilestoneCard({ milestone, record, canEdit, onEdit, onAdd }) {
  const hasRecord = !!record;

  return (
    <div className={`rounded-xl border p-4 transition-all ${hasRecord ? 'bg-card' : 'bg-muted/30 border-dashed'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {hasRecord
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <Clock className="w-4 h-4 text-muted-foreground" />}
          <span className="font-heading font-bold text-sm">{milestone.label}</span>
        </div>
        {canEdit && (
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs"
            onClick={() => hasRecord ? onEdit(record) : onAdd(milestone.id)}>
            {hasRecord ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {hasRecord ? 'Edit' : 'Record'}
          </Button>
        )}
      </div>

      {hasRecord ? (
        <div className="space-y-2">
          {/* Date + contact */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            {record.follow_up_date ? format(new Date(record.follow_up_date), 'MMM d, yyyy') : '—'}
            {record.conducted_by_name && <span>· {record.conducted_by_name}</span>}
            {record.contact_successful === false && (
              <Badge variant="outline" className="text-[10px] text-amber-600">No Contact</Badge>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-1.5">
            {record.employment_status && (
              <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${employmentColor(record.employment_status)}`}>
                <Briefcase className="w-3 h-3 inline mr-1" />
                {EMPLOYMENT_LABELS[record.employment_status]}
              </span>
            )}
            {record.housing_stability && (
              <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${housingColor(record.housing_stability)}`}>
                <Home className="w-3 h-3 inline mr-1" />
                {HOUSING_LABELS[record.housing_stability]}
              </span>
            )}
            {record.income_stability && (
              <span className="text-[11px] px-2 py-1 rounded-md font-medium bg-blue-50 text-blue-600">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Income: {INCOME_LABELS[record.income_stability]}
              </span>
            )}
            {record.successfully_placed !== undefined && (
              <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${record.successfully_placed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {record.successfully_placed ? '✓ Placed' : '✗ Not Placed'}
              </span>
            )}
          </div>

          {/* Employer / wage */}
          {record.employer_name && (
            <p className="text-xs text-muted-foreground">
              {record.job_title ? `${record.job_title} @ ` : ''}{record.employer_name}
              {record.hourly_wage ? ` · $${record.hourly_wage}/hr` : ''}
            </p>
          )}

          {/* Recidivism flag */}
          {record.recidivism_flag && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertTriangle className="w-3 h-3" /> New justice involvement noted
            </div>
          )}

          {/* Ongoing barriers */}
          {record.ongoing_barriers?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {record.ongoing_barriers.map(b => (
                <Badge key={b} variant="outline" className="text-[10px]">{b.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <p className="text-xs text-muted-foreground italic line-clamp-2">"{record.notes}"</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No follow-up recorded yet.</p>
      )}
    </div>
  );
}

export default function OutcomeMilestoneTab({ resident, user, canEdit }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: records = [] } = useQuery({
    queryKey: ['outcome-records', resident?.id],
    queryFn: () => base44.entities.OutcomeRecord.filter({ resident_id: resident.id }),
    enabled: !!resident?.id,
  });

  const recordByMilestone = Object.fromEntries(records.map(r => [r.milestone, r]));

  const openAdd = (milestoneId) => {
    setEditingRecord(null);
    setSelectedMilestone(milestoneId);
    setForm({ ...EMPTY_FORM, milestone: milestoneId });
    setDialogOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setSelectedMilestone(record.milestone);
    setForm({
      follow_up_date: record.follow_up_date || EMPTY_FORM.follow_up_date,
      contact_method: record.contact_method || 'phone_call',
      contact_successful: record.contact_successful ?? true,
      employment_status: record.employment_status || 'unknown',
      job_retention: record.job_retention || 'unknown',
      housing_stability: record.housing_stability || 'unknown',
      income_stability: record.income_stability || 'unknown',
      successfully_placed: record.successfully_placed || false,
      recidivism_flag: record.recidivism_flag || false,
      employer_name: record.employer_name || '',
      job_title: record.job_title || '',
      hourly_wage: record.hourly_wage || '',
      ongoing_barriers: record.ongoing_barriers || [],
      notes: record.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      milestone: selectedMilestone,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      conducted_by: user?.id,
      conducted_by_name: user?.full_name || user?.email,
      hourly_wage: form.hourly_wage ? Number(form.hourly_wage) : null,
    };

    if (editingRecord) {
      await base44.entities.OutcomeRecord.update(editingRecord.id, payload);
    } else {
      await base44.entities.OutcomeRecord.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ['outcome-records', resident.id] });
    setSaving(false);
    setDialogOpen(false);
  };

  const toggleBarrier = (b) => {
    setForm(f => ({
      ...f,
      ongoing_barriers: f.ongoing_barriers.includes(b)
        ? f.ongoing_barriers.filter(x => x !== b)
        : [...f.ongoing_barriers, b],
    }));
  };

  const completedCount = MILESTONES.filter(m => recordByMilestone[m.id]).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div className="text-center">
          <p className="font-heading font-bold text-xl text-primary">{completedCount}/{MILESTONES.length}</p>
          <p className="text-[10px] text-muted-foreground">Checkpoints Done</p>
        </div>
        {records.filter(r => r.successfully_placed).length > 0 && (
          <div className="text-center">
            <p className="font-heading font-bold text-xl text-emerald-600">
              {records.filter(r => r.successfully_placed).length}
            </p>
            <p className="text-[10px] text-muted-foreground">Placed ✓</p>
          </div>
        )}
        {records.some(r => r.employment_status === 'employed_full_time' || r.employment_status === 'employed_part_time') && (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Employed at Latest Check</Badge>
        )}
        {records.some(r => r.recidivism_flag) && (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> Recidivism Flagged
          </Badge>
        )}
        <div className="flex-1" />
        <p className="text-xs text-muted-foreground">
          Global ID: <span className="font-mono">{resident.global_resident_id || '—'}</span>
        </p>
      </Card>

      {/* Milestone grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MILESTONES.map(m => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            record={recordByMilestone[m.id] || null}
            canEdit={canEdit}
            onEdit={openEdit}
            onAdd={openAdd}
          />
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit' : 'Record'} Follow-Up —{' '}
              {MILESTONES.find(m => m.id === selectedMilestone)?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Date & contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Follow-Up Date</Label>
                <Input type="date" value={form.follow_up_date}
                  onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Contact Method</Label>
                <Select value={form.contact_method} onValueChange={v => setForm(f => ({ ...f, contact_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['phone_call','in_person','email','text','home_visit','no_contact','other'].map(v => (
                      <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="contact_ok" checked={form.contact_successful}
                onChange={e => setForm(f => ({ ...f, contact_successful: e.target.checked }))} />
              <Label htmlFor="contact_ok" className="text-sm cursor-pointer">Contact was successful</Label>
            </div>

            {/* Employment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Employment Status</Label>
                <Select value={form.employment_status} onValueChange={v => setForm(f => ({ ...f, employment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Job Retention</Label>
                <Select value={form.job_retention} onValueChange={v => setForm(f => ({ ...f, job_retention: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RETENTION_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Employer</Label>
                <Input placeholder="Employer name" value={form.employer_name}
                  onChange={e => setForm(f => ({ ...f, employer_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Job Title</Label>
                <Input placeholder="Title" value={form.job_title}
                  onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Hourly Wage ($)</Label>
                <Input type="number" placeholder="0.00" value={form.hourly_wage}
                  onChange={e => setForm(f => ({ ...f, hourly_wage: e.target.value }))} />
              </div>
            </div>

            {/* Housing & Income */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Housing Stability</Label>
                <Select value={form.housing_stability} onValueChange={v => setForm(f => ({ ...f, housing_stability: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(HOUSING_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Income Stability</Label>
                <Select value={form.income_stability} onValueChange={v => setForm(f => ({ ...f, income_stability: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCOME_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="placed" checked={form.successfully_placed}
                  onChange={e => setForm(f => ({ ...f, successfully_placed: e.target.checked }))} />
                <Label htmlFor="placed" className="text-sm cursor-pointer">Successfully Placed</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="recid" checked={form.recidivism_flag}
                  onChange={e => setForm(f => ({ ...f, recidivism_flag: e.target.checked }))} />
                <Label htmlFor="recid" className="text-sm cursor-pointer text-red-600">Recidivism Flag</Label>
              </div>
            </div>

            {/* Ongoing barriers */}
            <div>
              <Label className="text-xs mb-2 block">Ongoing Barriers</Label>
              <div className="flex flex-wrap gap-1.5">
                {BARRIER_OPTIONS.map(b => (
                  <button key={b} onClick={() => toggleBarrier(b)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                      form.ongoing_barriers.includes(b)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                    }`}>
                    {b.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs mb-1 block">Follow-Up Notes</Label>
              <Textarea rows={3} placeholder="Observations, contact summary, additional context..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save Follow-Up'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}