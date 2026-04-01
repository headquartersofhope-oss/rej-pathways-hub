import React from 'react';
import { SelectField, TextField, BooleanField, NotesField } from '../IntakeFieldRow';

const CHARGE_TYPES = [
  { value: 'violent', label: 'Violent Offense' },
  { value: 'non_violent', label: 'Non-Violent Offense' },
  { value: 'drug_related', label: 'Drug-Related Offense' },
  { value: 'other', label: 'Other' },
  { value: 'na', label: 'N/A' },
];

export default function JusticeStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Justice Involved?" description="Has the resident been incarcerated or justice involved?" value={data.justice_involved} onChange={v => set('justice_involved', v)} />
      {data.justice_involved && <>
        <SelectField label="Charge Type" value={data.charge_type} onChange={v => set('charge_type', v)} options={CHARGE_TYPES} />
        <TextField label="Release Date" value={data.release_date} onChange={v => set('release_date', v)} type="date" />
        <BooleanField label="Currently on Probation?" value={data.on_probation} onChange={v => set('on_probation', v)} />
        <BooleanField label="Currently on Parole?" value={data.on_parole} onChange={v => set('on_parole', v)} />
        {(data.on_probation || data.on_parole) && <>
          <TextField label="Officer Name" value={data.officer_name} onChange={v => set('officer_name', v)} placeholder="P.O. name" />
          <TextField label="Officer Phone" value={data.officer_phone} onChange={v => set('officer_phone', v)} placeholder="(555) 000-0000" />
          <TextField label="Check-in Frequency" value={data.check_in_frequency} onChange={v => set('check_in_frequency', v)} placeholder="e.g. Weekly, Monthly" />
          <BooleanField label="Geographic Restrictions?" description="Are there travel or location restrictions?" value={data.geographic_restrictions} onChange={v => set('geographic_restrictions', v)} />
          <TextField label="Curfew Time" value={data.curfew} onChange={v => set('curfew', v)} placeholder="e.g. 9:00 PM" />
        </>}
        <BooleanField label="On Sex Offender Registry?" value={data.sex_offender_registry} onChange={v => set('sex_offender_registry', v)} />
      </>}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}