import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus } from 'lucide-react';

const SHIFT_OPTIONS = ['morning', 'afternoon', 'evening', 'overnight', 'weekends', 'flexible'];
const LOCATION_OPTIONS = ['on_site', 'remote', 'hybrid', 'no_preference'];
const LOCATION_LABELS = { on_site: 'On-Site', remote: 'Remote', hybrid: 'Hybrid', no_preference: 'No Preference' };

const EMPTY_FORM = {
  preferred_job_types: '',
  desired_industries: '',
  available_shifts: [],
  work_location_preference: '',
  transportation_radius_miles: '',
  target_hourly_wage: '',
  skills: '',
  accommodations_needed: '',
  barrier_work_notes: '',
};

export default function WorkPreferencesPanel({ resident, profile, staff, residentId, globalId, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (profile) {
      setForm({
        preferred_job_types: (profile.preferred_job_types || []).join(', '),
        desired_industries: (profile.desired_industries || []).join(', '),
        available_shifts: profile.available_shifts || [],
        work_location_preference: profile.work_location_preference || '',
        transportation_radius_miles: profile.transportation_radius_miles ?? '',
        target_hourly_wage: profile.target_hourly_wage ?? '',
        skills: (profile.skills || []).join(', '),
        accommodations_needed: profile.accommodations_needed || '',
        barrier_work_notes: profile.barrier_work_notes || '',
      });
    }
  }, [profile?.id, profile?.updated_date]);

  // Auto-open editing only after we've confirmed there's no profile (profile query settled)
  const hasNoProfile = !profile;

  const toggleShift = (shift) => {
    setForm(f => ({
      ...f,
      available_shifts: f.available_shifts.includes(shift)
        ? f.available_shifts.filter(s => s !== shift)
        : [...f.available_shifts, shift],
    }));
  };

  const handleSave = async () => {
    if (!residentId) { console.warn('WorkPreferencesPanel: residentId is missing'); return; }
    setSaving(true);
    const data = {
      preferred_job_types: form.preferred_job_types.split(',').map(s => s.trim()).filter(Boolean),
      desired_industries: form.desired_industries.split(',').map(s => s.trim()).filter(Boolean),
      available_shifts: form.available_shifts,
      work_location_preference: form.work_location_preference,
      transportation_radius_miles: form.transportation_radius_miles ? Number(form.transportation_radius_miles) : null,
      target_hourly_wage: form.target_hourly_wage ? Number(form.target_hourly_wage) : null,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      accommodations_needed: form.accommodations_needed,
      barrier_work_notes: form.barrier_work_notes,
    };
    if (profile) {
      await base44.entities.EmployabilityProfile.update(profile.id, data);
    } else {
      await base44.entities.EmployabilityProfile.create({
        global_resident_id: globalId || residentId,
        resident_id: residentId,
        organization_id: resident?.organization_id || '',
        ...data,
        job_readiness_score: 0,
        resume_status: 'none',
        is_job_ready: false,
      });
    }
    await onRefresh();
    setSaving(false);
    setEditing(false);
  };

  const display = (val, fallback = '—') =>
    Array.isArray(val) ? (val.length ? val.join(', ') : fallback) : (val || fallback);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-sm">Work Preferences & Availability</h3>
        {staff && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit Work Preferences
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Preferred Job Types</label>
              <Input value={form.preferred_job_types} onChange={e => setForm(f => ({ ...f, preferred_job_types: e.target.value }))} placeholder="e.g. Warehouse, Retail, Food Service" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Desired Industries</label>
              <Input value={form.desired_industries} onChange={e => setForm(f => ({ ...f, desired_industries: e.target.value }))} placeholder="e.g. Logistics, Hospitality" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Transportation Radius (miles)</label>
              <Input type="number" value={form.transportation_radius_miles} onChange={e => setForm(f => ({ ...f, transportation_radius_miles: e.target.value }))} placeholder="e.g. 15" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Target Hourly Wage ($)</label>
              <Input type="number" value={form.target_hourly_wage} onChange={e => setForm(f => ({ ...f, target_hourly_wage: e.target.value }))} placeholder="e.g. 18" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Skills</label>
              <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Forklift, Customer Service, Data Entry" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Work Location Preference</label>
            <div className="flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, work_location_preference: f.work_location_preference === opt ? '' : opt }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.work_location_preference === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary'
                  }`}
                >{LOCATION_LABELS[opt]}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Available Shifts</label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleShift(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                    form.available_shifts?.includes(s)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Accommodations Needed</label>
            <Textarea value={form.accommodations_needed} onChange={e => setForm(f => ({ ...f, accommodations_needed: e.target.value }))} rows={2} placeholder="Any workplace accommodations required..." />
          </div>

          {staff && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Barrier-Aware Work Notes <span className="text-[10px] italic">(staff only)</span></label>
              <Textarea value={form.barrier_work_notes} onChange={e => setForm(f => ({ ...f, barrier_work_notes: e.target.value }))} rows={2} placeholder="Notes on how barriers affect job placement..." />
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Preferences'}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        !profile ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No work preferences set yet.</p>
            {staff && (
              <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Set Work Preferences
              </Button>
            )}
          </div>
        ) : (
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Preferred Job Types', display(profile.preferred_job_types)],
              ['Industries', display(profile.desired_industries)],
              ['Transport Radius', profile.transportation_radius_miles ? `${profile.transportation_radius_miles} miles` : '—'],
              ['Target Wage', profile.target_hourly_wage ? `$${profile.target_hourly_wage}/hr` : '—'],
              ['Work Location', profile.work_location_preference ? LOCATION_LABELS[profile.work_location_preference] || profile.work_location_preference : '—'],
              ['Skills', display(profile.skills)],
              ['Accommodations', profile.accommodations_needed || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-xs mb-0.5">{label}</dt>
                <dd className="font-medium text-sm">{value}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs mb-1">Available Shifts</dt>
              <dd className="flex flex-wrap gap-1">
                {(profile.available_shifts || []).length > 0
                  ? profile.available_shifts.map(s => <Badge key={s} variant="outline" className="text-xs capitalize">{s}</Badge>)
                  : <span className="text-muted-foreground text-sm">—</span>
                }
              </dd>
            </div>
          </dl>
        )
      )}
    </Card>
  );
}