import React from 'react';
import { SelectField, TextField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const EMPLOYMENT_STATUS = [
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'part_time', label: 'Part-Time Employed' },
  { value: 'full_time', label: 'Full-Time Employed' },
  { value: 'employed_with_barriers', label: 'Employed but Facing Barriers' },
  { value: 'gig_informal', label: 'Gig / Informal Work Only' },
  { value: 'unable_to_work', label: 'Unable to Work' },
];

const EXPERIENCE_LEVEL = [
  { value: 'none', label: 'None – Never Worked' },
  { value: 'limited', label: 'Limited (under 1 year total)' },
  { value: 'moderate', label: 'Moderate (1–5 years)' },
  { value: 'extensive', label: 'Extensive (5+ years)' },
];

const REASON_LEFT = [
  { value: 'quit', label: 'Resigned / Quit' },
  { value: 'fired', label: 'Terminated / Fired' },
  { value: 'laid_off', label: 'Laid Off' },
  { value: 'seasonal', label: 'Seasonal / Contract Ended' },
  { value: 'never_worked', label: 'Never Worked' },
];

const JOB_INTERESTS = [
  { value: 'construction', label: 'Construction / Trades' },
  { value: 'warehouse_logistics', label: 'Warehouse / Logistics' },
  { value: 'food_service', label: 'Food Service / Hospitality' },
  { value: 'retail', label: 'Retail / Customer Service' },
  { value: 'healthcare_support', label: 'Healthcare Support' },
  { value: 'landscaping', label: 'Landscaping / Groundskeeping' },
  { value: 'manufacturing', label: 'Manufacturing / Assembly' },
  { value: 'transportation_driving', label: 'Transportation / Driving' },
  { value: 'cleaning_janitorial', label: 'Cleaning / Janitorial' },
  { value: 'office_admin', label: 'Office / Administrative' },
  { value: 'tech', label: 'Technology / IT' },
  { value: 'childcare_education', label: 'Childcare / Education' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export default function WorkHistoryStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <SelectField
        label="Current Employment Status"
        value={data.employment_status}
        onChange={v => set('employment_status', v)}
        options={EMPLOYMENT_STATUS}
        placeholder="Select status..."
      />
      <SelectField
        label="Overall Work Experience Level"
        value={data.experience_level}
        onChange={v => set('experience_level', v)}
        options={EXPERIENCE_LEVEL}
        placeholder="Select experience level..."
      />
      <TextField
        label="Years of Work Experience"
        value={data.years_of_experience}
        onChange={v => set('years_of_experience', parseFloat(v) || 0)}
        type="number"
        placeholder="0"
      />
      <TextField
        label="Date Last Employed"
        value={data.last_employed}
        onChange={v => set('last_employed', v)}
        type="date"
      />
      <TextField
        label="Longest Job Held (months)"
        value={data.longest_held_job_months}
        onChange={v => set('longest_held_job_months', parseFloat(v) || 0)}
        type="number"
        placeholder="0"
      />
      <SelectField
        label="Reason for Leaving Most Recent Job"
        value={data.fired_or_left}
        onChange={v => set('fired_or_left', v)}
        options={REASON_LEFT}
      />
      <MultiSelectField
        label="Job Interest Categories"
        value={data.job_interests}
        onChange={v => set('job_interests', v)}
        options={JOB_INTERESTS}
      />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}