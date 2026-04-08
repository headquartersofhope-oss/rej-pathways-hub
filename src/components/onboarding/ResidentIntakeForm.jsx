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

export default function ResidentIntakeForm({ onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    preferred_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    resident_data: {
      housing_status: '',
      employment_status: '',
      primary_needs: [],
      literacy_level: '',
      digital_literacy: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      population: '',
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResidentDataChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      resident_data: {
        ...prev.resident_data,
        [field]: value,
      },
    }));
  };

  const handleNeedToggle = (need) => {
    setFormData((prev) => ({
      ...prev,
      resident_data: {
        ...prev.resident_data,
        primary_needs: prev.resident_data.primary_needs.includes(need)
          ? prev.resident_data.primary_needs.filter((n) => n !== need)
          : [...prev.resident_data.primary_needs, need],
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const needs = [
    'Housing assistance',
    'Employment support',
    'Training/education',
    'Mental health support',
    'Substance recovery support',
    'Financial assistance',
    'Legal support',
    'Transportation',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Personal Information</h3>
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
            <Label htmlFor="preferred_name" className="text-sm">
              Preferred Name
            </Label>
            <Input
              id="preferred_name"
              value={formData.preferred_name}
              onChange={(e) => handleInputChange('preferred_name', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth" className="text-sm">
              Date of Birth
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Contact Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
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

      {/* Current Situation */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Current Situation</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="housing" className="text-sm">
              Current Housing Status
            </Label>
            <Select value={formData.resident_data.housing_status} onValueChange={(value) => handleResidentDataChange('housing_status', value)}>
              <SelectTrigger id="housing" className="mt-1">
                <SelectValue placeholder="Select housing status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">Stable Housing</SelectItem>
                <SelectItem value="transitional">Transitional Housing</SelectItem>
                <SelectItem value="shelter">Shelter</SelectItem>
                <SelectItem value="unstable">Unstable / At Risk</SelectItem>
                <SelectItem value="none">Homeless</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employment" className="text-sm">
              Employment Status
            </Label>
            <Select value={formData.resident_data.employment_status} onValueChange={(value) => handleResidentDataChange('employment_status', value)}>
              <SelectTrigger id="employment" className="mt-1">
                <SelectValue placeholder="Select employment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unemployed">Unemployed</SelectItem>
                <SelectItem value="part_time">Part-Time</SelectItem>
                <SelectItem value="full_time">Full-Time</SelectItem>
                <SelectItem value="self_employed">Self-Employed</SelectItem>
                <SelectItem value="unable">Unable to Work</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="literacy" className="text-sm">
              Literacy Level
            </Label>
            <Select value={formData.resident_data.literacy_level} onValueChange={(value) => handleResidentDataChange('literacy_level', value)}>
              <SelectTrigger id="literacy" className="mt-1">
                <SelectValue placeholder="Select literacy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Literacy</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="digital" className="text-sm">
              Digital Literacy
            </Label>
            <Select value={formData.resident_data.digital_literacy} onValueChange={(value) => handleResidentDataChange('digital_literacy', value)}>
              <SelectTrigger id="digital" className="mt-1">
                <SelectValue placeholder="Select digital literacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / No Access</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="proficient">Proficient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="population" className="text-sm">
              Primary Population
            </Label>
            <Select value={formData.resident_data.population} onValueChange={(value) => handleResidentDataChange('population', value)}>
              <SelectTrigger id="population" className="mt-1">
                <SelectValue placeholder="Select population" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="justice_impacted">Justice Impacted</SelectItem>
                <SelectItem value="homeless_veteran">Homeless Veteran</SelectItem>
                <SelectItem value="foster_youth">Foster Youth</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Primary Needs */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Primary Needs</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {needs.map((need) => (
            <label key={need} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.resident_data.primary_needs.includes(need)}
                onChange={() => handleNeedToggle(need)}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">{need}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Emergency Contact</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergency_name" className="text-sm">
              Contact Name
            </Label>
            <Input
              id="emergency_name"
              value={formData.resident_data.emergency_contact_name}
              onChange={(e) => handleResidentDataChange('emergency_contact_name', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="emergency_phone" className="text-sm">
              Contact Phone
            </Label>
            <Input
              id="emergency_phone"
              type="tel"
              value={formData.resident_data.emergency_contact_phone}
              onChange={(e) => handleResidentDataChange('emergency_contact_phone', e.target.value)}
              className="mt-1"
            />
          </div>
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