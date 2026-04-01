import React from 'react';
import { SelectField, TextField, NotesField } from '../IntakeFieldRow';

const REASON_LEFT = [
  { value: 'quit', label: 'Resigned / Quit' },
  { value: 'fired', label: 'Terminated / Fired' },
  { value: 'laid_off', label: 'Laid Off' },
  { value: 'seasonal', label: 'Seasonal / Contract Ended' },
  { value: 'never_worked', label: 'Never Worked' },
];

export default function WorkHistoryStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <TextField label="Years of Work Experience" value={data.years_of_experience} onChange={v => set('years_of_experience', parseFloat(v) || 0)} type="number" placeholder="0" />
      <TextField label="Date Last Employed" value={data.last_employed} onChange={v => set('last_employed', v)} type="date" />
      <TextField label="Longest Job Held (months)" value={data.longest_held_job_months} onChange={v => set('longest_held_job_months', parseFloat(v) || 0)} type="number" placeholder="0" />
      <SelectField label="Reason for Leaving Most Recent Job" value={data.fired_or_left} onChange={v => set('fired_or_left', v)} options={REASON_LEFT} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}