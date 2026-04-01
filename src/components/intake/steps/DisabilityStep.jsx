import React from 'react';
import { BooleanField, TextField, NotesField } from '../IntakeFieldRow';

export default function DisabilityStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has a Documented Disability?" value={data.has_disability} onChange={v => set('has_disability', v)} />
      {data.has_disability && <>
        <BooleanField label="Workplace Accommodation Needed?" value={data.accommodation_needed} onChange={v => set('accommodation_needed', v)} />
        {data.accommodation_needed && (
          <TextField label="Accommodation Details" value={data.accommodation_notes} onChange={v => set('accommodation_notes', v)} placeholder="Describe accommodation needs" />
        )}
        <BooleanField label="Receiving SSI or SSDI?" value={data.ssi_ssdi} onChange={v => set('ssi_ssdi', v)} />
      </>}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}