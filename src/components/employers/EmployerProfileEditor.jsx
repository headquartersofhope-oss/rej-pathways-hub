import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function EmployerProfileEditor({ employer, onSaved }) {
  const [form, setForm] = useState({
    company_name: employer.company_name || '',
    industry: employer.industry || '',
    contact_name: employer.contact_name || '',
    contact_email: employer.contact_email || '',
    contact_phone: employer.contact_phone || '',
    city: employer.city || '',
    state: employer.state || '',
    address: employer.address || '',
    website: employer.website || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Employer.update(employer.id, form);
      onSaved();
    } catch (err) {
      console.error('Error saving profile:', err);
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Company Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Company Name</label>
            <Input
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Industry</label>
            <Input
              value={form.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Contact Name</label>
            <Input
              value={form.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Email</label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Phone</label>
            <Input
              value={form.contact_phone}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Website</label>
            <Input
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Address</label>
            <Input
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">City</label>
            <Input
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">State</label>
            <Input
              value={form.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button onClick={onSaved} variant="outline">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}