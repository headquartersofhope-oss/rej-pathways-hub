import React from 'react';
import { BooleanField, NotesField } from '../IntakeFieldRow';

export default function MentalHealthStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has Mental Health Diagnosis?" value={data.has_diagnosis} onChange={v => set('has_diagnosis', v)} />
      {data.has_diagnosis && <>
        <BooleanField label="Currently in Counseling / Therapy?" value={data.in_counseling} onChange={v => set('in_counseling', v)} />
        <BooleanField label="Currently on Psychiatric Medication?" value={data.on_medication} onChange={v => set('on_medication', v)} />
      </>}
      <BooleanField label="History of Trauma?" description="Adverse childhood experiences, domestic violence, etc." value={data.trauma_history} onChange={v => set('trauma_history', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}