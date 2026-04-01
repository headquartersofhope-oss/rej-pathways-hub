import React from 'react';
import { SelectField, TextField, BooleanField, NotesField } from '../IntakeFieldRow';

const DISCHARGE = [
  { value: 'honorable', label: 'Honorable' },
  { value: 'other_than_honorable', label: 'Other Than Honorable' },
  { value: 'dishonorable', label: 'Dishonorable' },
  { value: 'na', label: 'N/A' },
];

export default function VeteranStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Veteran Status" description="Has the resident served in the U.S. military?" value={data.is_veteran} onChange={v => set('is_veteran', v)} />
      {data.is_veteran && <>
        <TextField label="Branch of Service" value={data.branch} onChange={v => set('branch', v)} placeholder="Army, Navy, Marines, Air Force, etc." />
        <SelectField label="Discharge Status" value={data.discharge_status} onChange={v => set('discharge_status', v)} options={DISCHARGE} />
        <BooleanField label="Enrolled in VA Services?" value={data.va_enrolled} onChange={v => set('va_enrolled', v)} />
        <BooleanField label="Service-Connected Disability?" value={data.service_connected_disability} onChange={v => set('service_connected_disability', v)} />
      </>}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}