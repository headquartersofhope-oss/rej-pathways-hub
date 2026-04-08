import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const roleLabels = {
  case_manager: 'Case Manager',
  staff: 'Staff',
  probation_officer: 'Probation / Parole Officer',
  employer: 'Employer',
  partner: 'Partner / Resource Agency',
};

export default function RoleRequestForm({ role, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    requested_role: role,
    reason_for_access: '',
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Your Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name" className="text-sm">
              First Name *
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="last_name" className="text-sm">
              Last Name *
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Organization / Company</h3>
        <div>
          <Label htmlFor="organization" className="text-sm">
            {role === 'employer' ? 'Company Name' : 'Organization / Agency'} *
          </Label>
          <Input
            id="organization"
            value={formData.organization}
            onChange={(e) => handleInputChange('organization', e.target.value)}
            placeholder={role === 'employer' ? 'Your company name' : 'Your organization name'}
            required
            className="mt-1"
          />
        </div>
      </div>

      {/* Role Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Access Information</h3>
        <div>
          <Label className="text-sm">Requested Role</Label>
          <div className="mt-1 p-3 bg-muted rounded-md text-sm text-muted-foreground">
            {roleLabels[role]}
          </div>
        </div>

        <div>
          <Label htmlFor="reason" className="text-sm">
            Why do you need access? *
          </Label>
          <Textarea
            id="reason"
            value={formData.reason_for_access}
            onChange={(e) => handleInputChange('reason_for_access', e.target.value)}
            placeholder="Describe your role and why you need access to this system"
            required
            rows={4}
            className="mt-1"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end pt-4">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </div>
    </form>
  );
}