import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import ReferralDocuments from './ReferralDocuments';
import { AlertCircle, Save, Send } from 'lucide-react';

const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low'];
const HOUSING_SITUATIONS = ['none', 'unstable', 'shelter', 'transitional', 'stable', 'unknown'];
const EMPLOYMENT_OPTIONS = ['unemployed', 'part_time', 'full_time', 'self_employed', 'unable', 'unknown'];
const BARRIER_OPTIONS = [
  'legal', 'identification_documents', 'housing_stability', 'transportation', 'education',
  'digital_literacy', 'work_history', 'mental_health_support', 'substance_recovery',
  'childcare_dependent_care', 'financial_readiness', 'disability_accommodations',
];
const CONSENT_CATEGORIES = [
  { value: 'income', label: 'Income & Benefits' },
  { value: 'justice_history', label: 'Justice History' },
  { value: 'health', label: 'Health & Mental Health' },
  { value: 'employment', label: 'Employment History' },
  { value: 'family', label: 'Family / Dependent Info' },
];

export default function ReferralForm({ referral, resident, user, providers, onSaved, onCancel }) {
  const isNew = !referral?.id;
  const [form, setForm] = useState({
    participant_name: referral?.participant_name || (resident ? `${resident.first_name} ${resident.last_name}` : ''),
    date_of_birth: referral?.date_of_birth || resident?.date_of_birth || '',
    contact_phone: referral?.contact_phone || resident?.phone || '',
    contact_email: referral?.contact_email || resident?.email || '',
    housing_need_summary: referral?.housing_need_summary || '',
    priority_level: referral?.priority_level || 'medium',
    current_housing_situation: referral?.current_housing_situation || 'unknown',
    employment_status: referral?.employment_status || 'unknown',
    income_benefit_summary: referral?.income_benefit_summary || '',
    relevant_barriers: referral?.relevant_barriers || [],
    documents: referral?.documents || [],
    consent_confirmed: referral?.consent_confirmed || false,
    consent_categories: referral?.consent_categories || [],
    target_provider_id: referral?.target_provider_id || '',
    target_provider_name: referral?.target_provider_name || '',
    internal_notes: referral?.internal_notes || '',
    status: referral?.status || 'draft',
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const toggleBarrier = (b) => {
    set('relevant_barriers', form.relevant_barriers.includes(b)
      ? form.relevant_barriers.filter(x => x !== b)
      : [...form.relevant_barriers, b]
    );
  };

  const toggleConsentCategory = (cat) => {
    set('consent_categories', form.consent_categories.includes(cat)
      ? form.consent_categories.filter(x => x !== cat)
      : [...form.consent_categories, cat]
    );
  };

  const handleProviderChange = (id) => {
    const p = providers.find(x => x.id === id);
    set('target_provider_id', id);
    set('target_provider_name', p?.provider_name || '');
  };

  const buildPayload = (status) => ({
    ...form,
    status,
    global_resident_id: resident?.global_resident_id || referral?.global_resident_id,
    resident_id: resident?.id || referral?.resident_id,
    organization_id: user?.data?.organization_id || referral?.organization_id,
    referring_staff_id: user?.id,
    referring_staff_name: user?.full_name,
    referral_date: referral?.referral_date || new Date().toISOString().split('T')[0],
  });

  const handleSave = async (statusOverride) => {
    setError('');
    if (!form.participant_name || !form.housing_need_summary) {
      setError('Participant name and housing need summary are required.');
      return;
    }
    setSaving(true);
    const payload = buildPayload(statusOverride || form.status);
    if (isNew) {
      await base44.entities.HousingReferral.create(payload);
    } else {
      await base44.entities.HousingReferral.update(referral.id, payload);
    }
    setSaving(false);
    onSaved();
  };

  const handleSubmitReferral = async () => {
    if (!form.consent_confirmed) {
      setError('Participant consent must be confirmed before submitting.');
      return;
    }
    setError('');
    // Save as ready_to_submit first
    setSaving(true);
    const payload = buildPayload('ready_to_submit');
    let rid = referral?.id;
    if (isNew) {
      const created = await base44.entities.HousingReferral.create(payload);
      rid = created.id;
    } else {
      await base44.entities.HousingReferral.update(rid, payload);
    }
    setSaving(false);

    // Then submit
    setSubmitting(true);
    await base44.functions.invoke('submitHousingReferral', { referral_id: rid });
    setSubmitting(false);
    onSaved();
  };

  const readOnly = ['submitted', 'received', 'under_review', 'approved', 'denied', 'closed', 'withdrawn'].includes(referral?.status);

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Participant Info */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Participant Information</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Participant Name *</Label>
            <Input value={form.participant_name} onChange={e => set('participant_name', e.target.value)} disabled={readOnly} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Date of Birth <span className="text-muted-foreground">(if consented)</span></Label>
            <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} disabled={readOnly} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Contact Phone</Label>
            <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} disabled={readOnly} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Contact Email</Label>
            <Input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} disabled={readOnly} className="mt-1 h-8 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Housing Need */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Housing Need</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div>
            <Label className="text-xs">Housing Need Summary *</Label>
            <Textarea value={form.housing_need_summary} onChange={e => set('housing_need_summary', e.target.value)} disabled={readOnly} className="mt-1 text-sm" rows={3} placeholder="Describe why this participant needs housing and any urgency..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Priority Level</Label>
              <select value={form.priority_level} onChange={e => set('priority_level', e.target.value)} disabled={readOnly} className="mt-1 w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring h-8">
                {PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Current Housing Situation</Label>
              <select value={form.current_housing_situation} onChange={e => set('current_housing_situation', e.target.value)} disabled={readOnly} className="mt-1 w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring h-8">
                {HOUSING_SITUATIONS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Employment Status</Label>
              <select value={form.employment_status} onChange={e => set('employment_status', e.target.value)} disabled={readOnly} className="mt-1 w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring h-8">
                {EMPLOYMENT_OPTIONS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Income / Benefit Summary <span className="text-muted-foreground">(if consented)</span></Label>
            <Input value={form.income_benefit_summary} onChange={e => set('income_benefit_summary', e.target.value)} disabled={readOnly} className="mt-1 h-8 text-sm" placeholder="e.g. SSI $943/mo, SNAP enrolled" />
          </div>
        </CardContent>
      </Card>

      {/* Relevant Barriers */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Relevant Barriers</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {BARRIER_OPTIONS.map(b => (
              <label key={b} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${form.relevant_barriers.includes(b) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'} ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
                <input type="checkbox" className="hidden" checked={form.relevant_barriers.includes(b)} onChange={() => toggleBarrier(b)} disabled={readOnly} />
                {b.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      {providers.length > 0 && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Target Housing Provider</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <select value={form.target_provider_id} onChange={e => handleProviderChange(e.target.value)} disabled={readOnly} className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">— Select provider (optional) —</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.provider_name}{p.site_name ? ` – ${p.site_name}` : ''}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Referral Packet Documents</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <ReferralDocuments documents={form.documents} onChange={docs => set('documents', docs)} readOnly={readOnly} />
        </CardContent>
      </Card>

      {/* Consent */}
      <Card className={!form.consent_confirmed ? 'border-amber-300' : 'border-green-300'}>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Consent & Data Sharing</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox checked={form.consent_confirmed} onCheckedChange={v => set('consent_confirmed', !!v)} disabled={readOnly} className="mt-0.5" />
            <span className="text-sm">Participant has given verbal or written consent to submit this housing referral and share the information included. <span className="text-destructive font-medium">Required before submission.</span></span>
          </label>
          {form.consent_confirmed && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Information categories consented for sharing:</p>
              <div className="flex flex-wrap gap-2">
                {CONSENT_CATEGORIES.map(cat => (
                  <label key={cat.value} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${form.consent_categories.includes(cat.value) ? 'bg-green-100 text-green-800 border-green-300' : 'bg-background border-border hover:bg-muted'} ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
                    <input type="checkbox" className="hidden" checked={form.consent_categories.includes(cat.value)} onChange={() => toggleConsentCategory(cat.value)} disabled={readOnly} />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Internal Notes <span className="font-normal text-muted-foreground">(not shared with housing provider)</span></CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} disabled={readOnly} className="text-sm" rows={2} placeholder="Internal case notes, context for staff only..." />
        </CardContent>
      </Card>

      {/* Actions */}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button size="sm" onClick={handleSubmitReferral} disabled={saving || submitting || !form.consent_confirmed}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? 'Submitting...' : 'Save & Submit Referral'}
          </Button>
        </div>
      )}
    </div>
  );
}