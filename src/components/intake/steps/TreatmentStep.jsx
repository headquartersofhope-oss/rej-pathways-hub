import React from 'react';
import { SelectField, TextField, BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const TREATMENT_TYPES = [
  { value: 'outpatient', label: 'Outpatient Program' },
  { value: 'intensive_outpatient', label: 'Intensive Outpatient (IOP)' },
  { value: 'residential', label: 'Residential / Inpatient' },
  { value: 'mat', label: 'Medication-Assisted Treatment (MAT)' },
  { value: 'detox', label: 'Detox / Medical Withdrawal' },
  { value: 'sober_living', label: 'Sober Living / Recovery Home' },
  { value: 'peer_support', label: 'Peer Support / Coaching' },
  { value: 'telehealth', label: 'Telehealth Counseling' },
  { value: 'other', label: 'Other' },
];

const SUBSTANCES = [
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'opioids', label: 'Opioids / Heroin' },
  { value: 'methamphetamine', label: 'Methamphetamine' },
  { value: 'cocaine', label: 'Cocaine / Crack' },
  { value: 'cannabis', label: 'Cannabis' },
  { value: 'prescription', label: 'Prescription Misuse' },
  { value: 'poly_substance', label: 'Multiple Substances' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

export default function TreatmentStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField
        label="Currently in Substance Use Treatment?"
        description="Active participation in a treatment or recovery program"
        value={data.in_treatment}
        onChange={v => set('in_treatment', v)}
      />
      {data.in_treatment && (
        <>
          <SelectField
            label="Treatment Program Type"
            value={data.treatment_type}
            onChange={v => set('treatment_type', v)}
            options={TREATMENT_TYPES}
            placeholder="Select type..."
          />
          <MultiSelectField
            label="Substance(s) Being Treated"
            value={data.substances}
            onChange={v => set('substances', v)}
            options={SUBSTANCES}
          />
          <TextField
            label="Sobriety / Recovery Date"
            value={data.sobriety_date}
            onChange={v => set('sobriety_date', v)}
            type="date"
          />
          <BooleanField
            label="12-Step or Peer Support Program?"
            description="AA, NA, SMART Recovery, or similar"
            value={data['12_step_program']}
            onChange={v => set('12_step_program', v)}
          />
        </>
      )}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}