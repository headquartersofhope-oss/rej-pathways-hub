import React from 'react';
import { TextField, BooleanField, NotesField } from '../IntakeFieldRow';

export default function TreatmentStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Currently in Treatment?" description="Active substance use treatment program" value={data.in_treatment} onChange={v => set('in_treatment', v)} />
      {data.in_treatment && <>
        <TextField label="Treatment Type / Program" value={data.treatment_type} onChange={v => set('treatment_type', v)} placeholder="e.g. Outpatient, Residential, MAT" />
        <TextField label="Sobriety Date" value={data.sobriety_date} onChange={v => set('sobriety_date', v)} type="date" />
        <BooleanField label="12-Step or Peer Support Program?" value={data['12_step_program']} onChange={v => set('12_step_program', v)} />
      </>}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}