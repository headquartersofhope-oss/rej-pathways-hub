import React from 'react';
import { BooleanField, TextField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const DISABILITY_TYPES = [
  { value: 'physical', label: 'Physical / Mobility' },
  { value: 'visual', label: 'Visual Impairment' },
  { value: 'hearing', label: 'Hearing Impairment / Deaf' },
  { value: 'cognitive', label: 'Cognitive / Intellectual' },
  { value: 'psychiatric', label: 'Psychiatric / Mental Health' },
  { value: 'chronic_illness', label: 'Chronic Illness' },
  { value: 'tbi', label: 'Traumatic Brain Injury' },
  { value: 'autism', label: 'Autism Spectrum' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const ACCOMMODATION_OPTIONS = [
  { value: 'modified_schedule', label: 'Modified Schedule' },
  { value: 'remote_work', label: 'Remote / Work From Home' },
  { value: 'accessible_worksite', label: 'Accessible Worksite' },
  { value: 'assistive_technology', label: 'Assistive Technology' },
  { value: 'sign_language_interpreter', label: 'Sign Language Interpreter' },
  { value: 'physical_assistance', label: 'Physical Assistance' },
  { value: 'reduced_load', label: 'Reduced Workload' },
  { value: 'other', label: 'Other' },
];

export default function DisabilityStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField
        label="Has a Documented Disability?"
        description="Physical, cognitive, psychiatric, or other documented condition"
        value={data.has_disability}
        onChange={v => set('has_disability', v)}
      />
      {data.has_disability && (
        <>
          <MultiSelectField
            label="Disability Type(s)"
            value={data.disability_types}
            onChange={v => set('disability_types', v)}
            options={DISABILITY_TYPES}
          />
          <BooleanField
            label="Workplace Accommodation Needed?"
            value={data.accommodation_needed}
            onChange={v => set('accommodation_needed', v)}
          />
          {data.accommodation_needed && (
            <>
              <MultiSelectField
                label="Type(s) of Accommodation Needed"
                value={data.accommodation_types}
                onChange={v => set('accommodation_types', v)}
                options={ACCOMMODATION_OPTIONS}
              />
              <TextField
                label="Additional Accommodation Details"
                value={data.accommodation_notes}
                onChange={v => set('accommodation_notes', v)}
                placeholder="Describe any specific needs not listed above"
              />
            </>
          )}
          <BooleanField
            label="Receiving SSI or SSDI?"
            value={data.ssi_ssdi}
            onChange={v => set('ssi_ssdi', v)}
          />
        </>
      )}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}