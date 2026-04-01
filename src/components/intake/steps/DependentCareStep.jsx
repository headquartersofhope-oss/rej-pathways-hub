import React from 'react';
import { BooleanField, TextField, NotesField } from '../IntakeFieldRow';

export default function DependentCareStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has Dependents?" description="Children, elderly parents, or others in care" value={data.has_dependents} onChange={v => set('has_dependents', v)} />
      {data.has_dependents && <>
        <TextField label="Number of Dependents" value={data.num_dependents} onChange={v => set('num_dependents', parseInt(v) || 0)} type="number" placeholder="0" />
        <BooleanField label="Childcare Currently Arranged?" value={data.childcare_arranged} onChange={v => set('childcare_arranged', v)} />
        <BooleanField label="Receiving Childcare Subsidy?" value={data.childcare_subsidy} onChange={v => set('childcare_subsidy', v)} />
      </>}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}