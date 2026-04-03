import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPTY_FORM = {
  name: '',
  type: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  website: '',
  status: 'active',
  notes: '',
};

const PARTNER_TYPES = [
  'probation_parole',
  'social_services',
  'housing',
  'healthcare',
  'legal_aid',
  'education',
  'employment',
  'other',
];

const PARTNER_TYPE_LABELS = {
  probation_parole: 'Probation/Parole',
  social_services: 'Social Services',
  housing: 'Housing',
  healthcare: 'Healthcare',
  legal_aid: 'Legal Aid',
  education: 'Education',
  employment: 'Employment',
  other: 'Other',
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function PartnerFormDialog({ open, onOpenChange, partner, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);

  const isEditing = !!partner;

  const isDirty = () => {
    if (!partner) {
      return Object.entries(form).some(([k, v]) => {
        if (k === 'status') return v !== 'active';
        return v !== '' && v !== false;
      });
    }
    return Object.keys(EMPTY_FORM).some(k => String(form[k] ?? '') !== String(partner[k] ?? ''));
  };

  const handleOpenChange = (open) => {
    if (!open && isDirty()) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(open);
  };

  const handleConfirmDiscard = () => {
    setConfirmClose(false);
    onOpenChange(false);
  };

  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name || '',
        type: partner.type || '',
        contact_name: partner.contact_name || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        address: partner.address || '',
        city: partner.city || '',
        state: partner.state || '',
        zip: partner.zip || '',
        website: partner.website || '',
        status: partner.status || 'active',
        notes: partner.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [partner, open]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Organization name is required.';
    if (!form.type) errs.type = 'Partner type is required.';
    if (!form.contact_email.trim() && !form.contact_phone.trim()) {
      errs.contact_email = 'At least one contact method (email or phone) is required.';
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { 
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await base44.entities.PartnerAgency.update(partner.id, form);
      } else {
        await base44.entities.PartnerAgency.create(form);
      }
      setSaving(false);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      setSaving(false);
      setErrors({ submit: error.message });
    }
  };

  return (
    <>
    <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">You have unsaved changes. If you close now, all entered data will be lost.</p>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => setConfirmClose(false)}>Keep Editing</Button>
          <Button variant="destructive" onClick={handleConfirmDiscard}>Discard Changes</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Partner Agency' : 'Add Partner Agency'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {errors.submit && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {errors.submit}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Partner Information</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Organization Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Community Probation Services"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label className="text-xs">Partner Type <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-destructive mt-1">{errors.type}</p>}
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Contact Information</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-xs">Contact Email <span className="text-muted-foreground">(or phone required)</span></Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={e => set('contact_email', e.target.value)}
                  placeholder="email@agency.org"
                  className={errors.contact_email ? 'border-destructive' : ''}
                />
                {errors.contact_email && <p className="text-xs text-destructive mt-1">{errors.contact_email}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Contact Phone</Label>
                <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Address</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Street Address</Label>
                <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">State</Label>
                  <Select value={form.state} onValueChange={v => set('state', v)}>
                    <SelectTrigger><SelectValue placeholder="ST" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">ZIP</Label>
                  <Input value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="00000" maxLength={10} />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Partnership notes, relationship history, special considerations..." />
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Partner'}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}