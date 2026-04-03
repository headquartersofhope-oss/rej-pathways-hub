import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pencil, Check, X, User, Phone, Mail, AlertTriangle, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { canViewField } from '@/lib/fieldVisibility';

const PRONOUNS_LABELS = {
  he_him: 'He/Him', she_her: 'She/Her', they_them: 'They/Them',
  other: 'Other', prefer_not_to_say: 'Prefer not to say',
};
const GENDER_LABELS = {
  male: 'Male', female: 'Female', non_binary: 'Non-Binary',
  prefer_not_to_say: 'Prefer not to say', other: 'Other',
};
const LANGUAGE_LABELS = {
  english: 'English', spanish: 'Spanish', french: 'French',
  mandarin: 'Mandarin', cantonese: 'Cantonese', vietnamese: 'Vietnamese',
  tagalog: 'Tagalog', arabic: 'Arabic', other: 'Other',
};
const POPULATION_LABELS = {
  justice_impacted: 'Justice Impacted', homeless_veteran: 'Homeless Veteran',
  foster_youth: 'Foster Youth', other: 'Other',
};

function EditableField({ label, value, onSave, type = 'text', options = null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const displayValue = options ? (options[value] || value || '—') : (value || '—');

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-sm w-36 flex-shrink-0 pt-0.5">{label}</dt>
      {editing ? (
        <dd className="flex items-center gap-1 flex-1 min-w-0">
          {options ? (
            <select
              className="border rounded px-2 py-1 text-sm flex-1 min-w-0 bg-background"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
            >
              <option value="">— Not set —</option>
              {Object.entries(options).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-0 bg-background"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
            />
          )}
          <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-600 hover:text-emerald-700 shrink-0">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCancel} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </dd>
      ) : (
        <dd className="font-medium text-sm flex items-center gap-1.5 flex-1 group">
          <span className={!value ? 'text-muted-foreground italic' : ''}>{displayValue}</span>
          <button
            onClick={() => { setDraft(value || ''); setEditing(true); }}
            className="p-0.5 text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </dd>
      )}
    </div>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-sm w-36 flex-shrink-0 pt-0.5">{label}</dt>
      <dd className={`font-medium text-sm ${!value ? 'text-muted-foreground italic' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

export default function ResidentOverviewTab({ resident, assessment, barriers, residentId, canEdit = true, userRole = 'admin' }) {
  const queryClient = useQueryClient();

  const save = async (field, value) => {
    await base44.entities.Resident.update(resident.id, { [field]: value });
    queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
    queryClient.invalidateQueries({ queryKey: ['residents'] });
  };

  const activeBarriers = barriers.length > 0
    ? barriers.filter(b => b.status !== 'resolved')
    : [];

  const intakeDateDisplay = resident.intake_date
    || (assessment?.completed_at ? assessment.completed_at.split('T')[0] : null);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Identity & Contact */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Identity & Contact
        </h3>
        <dl>
          {canViewField(userRole, 'global_resident_id', 'identity') && <ReadonlyField label="Resident ID" value={resident.global_resident_id} />}
          {canViewField(userRole, 'first_name', 'identity') && <ReadonlyField label="Full Name" value={`${resident.first_name || ''} ${resident.last_name || ''}`.trim()} />}
          {canViewField(userRole, 'preferred_name', 'identity') && (canEdit ? <EditableField label="Preferred Name" value={resident.preferred_name} onSave={v => save('preferred_name', v)} /> : <ReadonlyField label="Preferred Name" value={resident.preferred_name} />)}
          {canViewField(userRole, 'email', 'contact') && (canEdit ? <EditableField label="Email" value={resident.email} onSave={v => save('email', v)} type="email" /> : <ReadonlyField label="Email" value={resident.email} />)}
          {canViewField(userRole, 'phone', 'contact') && (canEdit ? <EditableField label="Phone" value={resident.phone} onSave={v => save('phone', v)} type="tel" /> : <ReadonlyField label="Phone" value={resident.phone} />)}
          {canViewField(userRole, 'date_of_birth', 'identity') && (canEdit ? <EditableField label="Date of Birth" value={resident.date_of_birth} onSave={v => save('date_of_birth', v)} type="date" /> : <ReadonlyField label="Date of Birth" value={resident.date_of_birth} />)}
          {canViewField(userRole, 'pronouns', 'identity') && (canEdit ? <EditableField label="Pronouns" value={resident.pronouns} onSave={v => save('pronouns', v)} options={PRONOUNS_LABELS} /> : <ReadonlyField label="Pronouns" value={PRONOUNS_LABELS[resident.pronouns] || resident.pronouns} />)}
          {canViewField(userRole, 'gender', 'identity') && (canEdit ? <EditableField label="Gender" value={resident.gender} onSave={v => save('gender', v)} options={GENDER_LABELS} /> : <ReadonlyField label="Gender" value={GENDER_LABELS[resident.gender] || resident.gender} />)}
          {canViewField(userRole, 'primary_language', 'identity') && (canEdit ? <EditableField label="Primary Language" value={resident.primary_language} onSave={v => save('primary_language', v)} options={LANGUAGE_LABELS} /> : <ReadonlyField label="Primary Language" value={LANGUAGE_LABELS[resident.primary_language] || resident.primary_language} />)}
          {userRole === 'admin' && resident.ssn_last4 && (
            <ReadonlyField label="SSN Last 4" value={`●●●●${resident.ssn_last4}`} />
          )}
          </dl>
          </Card>

      {/* Program Info */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Program Info
        </h3>
        <dl>
          {canViewField(userRole, 'status', 'program') && <ReadonlyField label="Status" value={resident.status?.replace(/_/g, ' ')} />}
          {canViewField(userRole, 'population', 'program') && (canEdit ? <EditableField label="Population" value={resident.population} onSave={v => save('population', v)} options={POPULATION_LABELS} /> : <ReadonlyField label="Population" value={POPULATION_LABELS[resident.population] || resident.population} />)}
          {canViewField(userRole, 'intake_date', 'program') && <ReadonlyField label="Intake Date" value={intakeDateDisplay} />}
          {canViewField(userRole, 'expected_exit_date', 'program') && (canEdit ? <EditableField label="Expected Exit" value={resident.expected_exit_date} onSave={v => save('expected_exit_date', v)} type="date" /> : <ReadonlyField label="Expected Exit" value={resident.expected_exit_date} />)}
          {canViewField(userRole, 'actual_exit_date', 'program') && (canEdit ? <EditableField label="Actual Exit" value={resident.actual_exit_date} onSave={v => save('actual_exit_date', v)} type="date" /> : <ReadonlyField label="Actual Exit" value={resident.actual_exit_date} />)}
          {canViewField(userRole, 'assigned_case_manager', 'program') && (canEdit ? <EditableField label="Case Manager" value={resident.assigned_case_manager} onSave={v => save('assigned_case_manager', v)} /> : <ReadonlyField label="Case Manager" value={resident.assigned_case_manager} />)}
        </dl>

        {(canViewField(userRole, 'emergency_contact_name', 'emergency') || canViewField(userRole, 'emergency_contact_phone', 'emergency')) && (
          <>
            <h3 className="font-heading font-semibold text-sm mt-5 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" /> Emergency Contact
            </h3>
            <dl>
              {canViewField(userRole, 'emergency_contact_name', 'emergency') && (canEdit ? <EditableField label="Name" value={resident.emergency_contact_name} onSave={v => save('emergency_contact_name', v)} /> : <ReadonlyField label="Name" value={resident.emergency_contact_name} />)}
              {canViewField(userRole, 'emergency_contact_phone', 'emergency') && (canEdit ? <EditableField label="Phone" value={resident.emergency_contact_phone} onSave={v => save('emergency_contact_phone', v)} type="tel" /> : <ReadonlyField label="Phone" value={resident.emergency_contact_phone} />)}
            </dl>
          </>
        )}
      </Card>

      {/* Job Readiness & Barriers */}
      <Card className="p-5 lg:col-span-2">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> Progress & Barriers
        </h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Job Readiness Score</p>
            <Progress value={resident.job_readiness_score || 0} className="h-2 mb-1" />
            <p className="text-xs font-medium">{resident.job_readiness_score || 0}%</p>
          </div>
          <div>
            {activeBarriers.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Active Barriers ({activeBarriers.length})</p>
                <div className="flex flex-wrap gap-1">
                  {activeBarriers.slice(0, 8).map(b => (
                    <Badge key={b.id} variant="outline" className="text-[10px]">{b.title}</Badge>
                  ))}
                  {activeBarriers.length > 8 && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">+{activeBarriers.length - 8} more</Badge>
                  )}
                </div>
              </>
            ) : resident.barriers?.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Barrier Categories</p>
                <div className="flex flex-wrap gap-1">
                  {resident.barriers.slice(0, 8).map((b, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{b.replace(/_/g, ' ')}</Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No barriers recorded yet.</p>
            )}
          </div>
        </div>

        {resident.goals?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Goals</p>
            <ul className="space-y-1">
              {resident.goals.map((g, i) => (
                <li key={i} className="text-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {resident.missing_documents?.length > 0 && (
          <div className="mt-4 p-2.5 bg-destructive/5 rounded-lg">
            <p className="text-xs font-medium text-destructive mb-1.5">Missing Documents</p>
            <div className="flex flex-wrap gap-1">
              {resident.missing_documents.map((d, i) => (
                <Badge key={i} className="text-[10px] bg-destructive/10 text-destructive border-0">{d.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}