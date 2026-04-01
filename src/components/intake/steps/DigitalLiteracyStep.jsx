import React from 'react';
import { SelectField, BooleanField, NotesField } from '../IntakeFieldRow';

const COMFORT = [
  { value: 'none', label: 'No Experience' },
  { value: 'basic', label: 'Basic (can make calls/texts)' },
  { value: 'moderate', label: 'Moderate (email, browsing)' },
  { value: 'proficient', label: 'Proficient (apps, documents)' },
];

export default function DigitalLiteracyStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <SelectField label="Overall Digital Comfort Level" value={data.comfort_level} onChange={v => set('comfort_level', v)} options={COMFORT} />
      <BooleanField label="Can Use Email?" value={data.can_use_email} onChange={v => set('can_use_email', v)} />
      <BooleanField label="Can Apply for Jobs Online?" value={data.can_apply_online} onChange={v => set('can_apply_online', v)} />
      <BooleanField label="Can Use Video Conferencing (Zoom)?" value={data.can_use_zoom} onChange={v => set('can_use_zoom', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}