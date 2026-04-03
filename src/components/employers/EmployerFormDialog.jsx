import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPTY_FORM = {
  company_name: '',
  contact_name: '',
  contact_title: '',
  contact_email: '',
  contact_phone: '',
  industry: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  website: '',
  hiring_preferences: '',
  status: 'active',
  notes: '',
  second_chance_friendly: false,
  veteran_friendly: false,
  open_positions: '',
};

const INDUSTRIES = [
  'Construction', 'Healthcare', 'Warehouse & Logistics', 'Food Service',
  'Retail', 'Transportation', 'Manufacturing', 'Technology',
  'Hospitality', 'Landscaping', 'Cleaning & Maintenance', 'Security',
  'Administrative', 'Education', 'Other',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function EmployerFormDialog({ open, onOpenChange, employer, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = !!employer;

  useEffect(() => {
    if (employer) {
      setForm({
        company_name: employer.company_name || '',
        contact_name: employer.contact_name || '',
        contact_title: employer.contact_title || '',
        contact_email: employer.contact_email || '',
        contact_phone: employer.contact_phone || '',
        industry: employer.industry || '',
        address: employer.address || '',
        city: employer.city || '',
        state: employer.state || '',
        zip: employer.zip || '',
        website: employer.website || '',
        hiring_preferences: employer.hiring_preferences || '',
        status: employer.status || 'active',
        notes: employer.notes || '',
        second_chance_friendly: employer.second_chance_friendly || false,
        veteran_friendly: employer.veteran_friendly || false,
        open_positions: employer.open_positions ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [employer, open]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.company_name.trim()) errs.company_name = 'Company name is required.';
    if (!form.contact_email.trim() && !form.contact_phone.trim()) {
      errs.contact_email = 'At least one contact method (email or phone) is required.';
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const payload = {
      ...form,
      open_positions: form.open_positions !== '' ? Number(form.open_positions) : 0,
    };

    if (isEditing) {
      await base44.entities.Employer.update(employer.id, payload);
    } else {
      await base44.entities.Employer.create(payload);
    }

    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employer' : 'Onboard New Employer'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Company Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Company Information</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Company / Organization Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.company_name}
                  onChange={e => set('company_name', e.target.value)}
                  placeholder="e.g. Acme Logistics Inc."
                  className={errors.company_name ? 'border-destructive' : ''}
                />
                {errors.company_name && <p className="text-xs text-destructive mt-1">{errors.company_name}</p>}
              </div>

              <div>
                <Label className="text-xs">Industry</Label>
                <Select value={form.industry} onValueChange={v => set('industry', v)}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
              </div>

              <div>
                <Label className="text-xs">Open Positions</Label>
                <Input type="number" min="0" value={form.open_positions} onChange={e => set('open_positions', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Primary Contact</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-xs">Contact Title</Label>
                <Input value={form.contact_title} onChange={e => set('contact_title', e.target.value)} placeholder="e.g. HR Manager" />
              </div>
              <div>
                <Label className="text-xs">Contact Email <span className="text-muted-foreground">(or phone required)</span></Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={e => set('contact_email', e.target.value)}
                  placeholder="email@company.com"
                  className={errors.contact_email ? 'border-destructive' : ''}
                />
                {errors.contact_email && <p className="text-xs text-destructive mt-1">{errors.contact_email}</p>}
              </div>
              <div>
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

          {/* Hiring Preferences & Flags */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Hiring Details</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Job Categories / Hiring Types</Label>
                <Input value={form.hiring_preferences} onChange={e => set('hiring_preferences', e.target.value)} placeholder="e.g. Warehouse, Forklift, Driver" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated list of roles or categories</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.second_chance_friendly}
                    onChange={e => set('second_chance_friendly', e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Second-Chance Friendly</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.veteran_friendly}
                    onChange={e => set('veteran_friendly', e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Veteran Friendly</span>
                </label>
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
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Employer'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}