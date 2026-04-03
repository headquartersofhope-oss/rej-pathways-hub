import React from 'react';
import { BooleanField, NotesField, MultiSelectField, SelectField } from '../IntakeFieldRow';

const EXIT_AGE_OPTIONS = [
  { value: '18', label: '18' },
  { value: '19', label: '19' },
  { value: '20', label: '20' },
  { value: '21', label: '21' },
  { value: 'before_18', label: 'Before 18 (Emancipated / Runaway)' },
  { value: 'adopted', label: 'Adopted / Reunified Before Aging Out' },
  { value: 'unknown', label: 'Unknown / Unsure' },
];

const SUPPORT_SERVICES = [
  { value: 'thr', label: 'Transitional Housing for Youth (THR)' },
  { value: 'ets', label: 'Extended Foster Care (ETS)' },
  { value: 'ils', label: 'Independent Living Skills (ILS)' },
  { value: 'cal_youth_conn', label: 'California Youth Connection' },
  { value: 'wraparound', label: 'Wraparound Services' },
  { value: 'mentor_program', label: 'Mentorship Program' },
  { value: 'case_management', label: 'Case Management (County)' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None' },
];

const PLACEMENT_TYPES = [
  { value: 'foster_home', label: 'Foster Home' },
  { value: 'group_home', label: 'Group Home / RCL' },
  { value: 'kinship', label: 'Kinship / Relative Care' },
  { value: 'residential_treatment', label: 'Residential Treatment Facility' },
  { value: 'multiple', label: 'Multiple Placements' },
  { value: 'other', label: 'Other' },
];

export default function FosterCareStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField
        label="Foster Care History?"
        description="Was the resident ever in the foster care system?"
        value={data.is_foster_care}
        onChange={v => set('is_foster_care', v)}
      />
      {data.is_foster_care && (
        <>
          <SelectField
            label="Age When Exited / Left Foster Care"
            value={data.exit_age}
            onChange={v => set('exit_age', v)}
            options={EXIT_AGE_OPTIONS}
            placeholder="Select age..."
          />
          <BooleanField
            label="Aged Out of Foster Care?"
            description="Left the system at 18+ without being adopted or reunified"
            value={data.aged_out}
            onChange={v => set('aged_out', v)}
          />
          <MultiSelectField
            label="Primary Placement Type(s)"
            value={data.placement_types}
            onChange={v => set('placement_types', v)}
            options={PLACEMENT_TYPES}
          />
          <BooleanField
            label="Currently Receiving Extended Support Services?"
            description="Active enrollment in any youth transitional support program"
            value={data.current_support_services}
            onChange={v => set('current_support_services', v)}
          />
          {data.current_support_services && (
            <MultiSelectField
              label="Current Support Programs"
              value={data.support_service_types}
              onChange={v => set('support_service_types', v)}
              options={SUPPORT_SERVICES}
            />
          )}
        </>
      )}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}