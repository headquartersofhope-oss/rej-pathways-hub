import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, Globe, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const INDUSTRIES = [
  'Construction', 'Healthcare', 'Warehouse & Logistics', 'Food & Hospitality',
  'Retail', 'Transportation', 'Manufacturing', 'Technology', 'Administrative',
  'Landscaping', 'Janitorial & Facilities', 'Security', 'Customer Service', 'Other'
];

export default function EmployerProfileTab({ employer, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...employer });

  useEffect(() => {
    setForm({ ...employer });
  }, [employer]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employer.update(employer.id, {
      company_name: form.company_name,
      industry: form.industry,
      contact_name: form.contact_name,
      contact_title: form.contact_title,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      website: form.website,
      hiring_preferences: form.hiring_preferences,
      second_chance_friendly: form.second_chance_friendly,
      veteran_friendly: form.veteran_friendly,
    });
    setSaving(false);
    setEditing(false);
    toast.success('Profile saved');
    if (onSaved) onSaved();
  };

  const handleCancel = () => {
    setForm({ ...employer });
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Company Profile</CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Company Name</p>
              <p className="font-semibold">{employer.company_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Industry</p>
              <p className="font-medium">{employer.industry || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Contact Name</p>
              <p className="font-medium">{employer.contact_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Title</p>
              <p className="font-medium">{employer.contact_title || '—'}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2.5">
            {employer.contact_email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{employer.contact_email}</span>
              </div>
            )}
            {employer.contact_phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{employer.contact_phone}</span>
              </div>
            )}
            {(employer.city || employer.state) && (
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{[employer.address, employer.city, employer.state, employer.zip].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {employer.website && (
              <div className="flex items-center gap-2.5 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a href={employer.website.startsWith('http') ? employer.website : `https://${employer.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {employer.website}
                </a>
              </div>
            )}
          </div>

          {employer.hiring_preferences && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-1">Hiring Preferences / Notes</p>
              <p className="text-sm">{employer.hiring_preferences}</p>
            </div>
          )}

          <div className="border-t pt-4 flex gap-4">
            {employer.second_chance_friendly && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                ✓ Second Chance Friendly
              </span>
            )}
            {employer.veteran_friendly && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                ✓ Veteran Friendly
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Edit Company Profile</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleCancel}>
            <X className="w-3 h-3" /> Cancel
          </Button>
          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={handleSave} disabled={saving}>
            <Check className="w-3 h-3" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Company Name</Label>
            <Input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Industry</Label>
            <Select value={form.industry || ''} onValueChange={v => set('industry', v)}>
              <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Name</Label>
            <Input value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Title</Label>
            <Input value={form.contact_title || ''} onChange={e => set('contact_title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Email</Label>
            <Input type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Phone</Label>
            <Input value={form.contact_phone || ''} onChange={e => set('contact_phone', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Address</Label>
            <Input value={form.address || ''} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input value={form.city || ''} onChange={e => set('city', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State</Label>
            <Input value={form.state || ''} onChange={e => set('state', e.target.value)} placeholder="CA" maxLength={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ZIP Code</Label>
            <Input value={form.zip || ''} onChange={e => set('zip', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Website</Label>
            <Input value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Hiring Preferences / Notes</Label>
          <Textarea
            value={form.hiring_preferences || ''}
            onChange={e => set('hiring_preferences', e.target.value)}
            rows={3}
            placeholder="Types of roles you typically hire for, any relevant context for the program team..."
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.second_chance_friendly}
              onChange={e => set('second_chance_friendly', e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Second Chance Friendly</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.veteran_friendly}
              onChange={e => set('veteran_friendly', e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Veteran Friendly</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}