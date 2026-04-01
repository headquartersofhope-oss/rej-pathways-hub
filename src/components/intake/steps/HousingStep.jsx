import React from 'react';
import { SelectField, TextField, BooleanField, NotesField } from '../IntakeFieldRow';

const HOUSING_OPTIONS = [
  { value: 'stable', label: 'Stable (own/rented home)' },
  { value: 'transitional', label: 'Transitional Housing' },
  { value: 'shelter', label: 'Emergency Shelter' },
  { value: 'unstable', label: 'Couch Surfing / Unstable' },
  { value: 'none', label: 'Unsheltered / None' },
];

export default function HousingStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <SelectField label="Current Housing Status" value={data.current_status} onChange={v => set('current_status', v)} options={HOUSING_OPTIONS} />
      <TextField label="Length of Homelessness (months)" value={data.length_of_homelessness_months} onChange={v => set('length_of_homelessness_months', parseFloat(v) || 0)} type="number" placeholder="0" />
      <BooleanField label="Eviction History?" description="Has the resident ever been evicted?" value={data.eviction_history} onChange={v => set('eviction_history', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}