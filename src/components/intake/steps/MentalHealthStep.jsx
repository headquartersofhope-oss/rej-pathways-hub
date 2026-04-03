import React from 'react';
import { BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const DIAGNOSIS_OPTIONS = [
  { value: 'depression', label: 'Depression' },
  { value: 'anxiety', label: 'Anxiety Disorder' },
  { value: 'ptsd', label: 'PTSD' },
  { value: 'bipolar', label: 'Bipolar Disorder' },
  { value: 'schizophrenia', label: 'Schizophrenia / Psychosis' },
  { value: 'adhd', label: 'ADHD' },
  { value: 'ocd', label: 'OCD' },
  { value: 'personality_disorder', label: 'Personality Disorder' },
  { value: 'substance_use_disorder', label: 'Substance Use Disorder' },
  { value: 'tbi', label: 'Traumatic Brain Injury (TBI)' },
  { value: 'other', label: 'Other' },
  { value: 'not_disclosed', label: 'Prefer Not to Disclose' },
];

const TRAUMA_TYPES = [
  { value: 'domestic_violence', label: 'Domestic Violence' },
  { value: 'childhood_abuse', label: 'Childhood Abuse / Neglect' },
  { value: 'sexual_assault', label: 'Sexual Assault' },
  { value: 'combat', label: 'Combat / Military Trauma' },
  { value: 'community_violence', label: 'Community Violence' },
  { value: 'incarceration', label: 'Incarceration-Related Trauma' },
  { value: 'loss_grief', label: 'Loss / Grief' },
  { value: 'housing_instability', label: 'Housing Instability / Homelessness' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

export default function MentalHealthStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField
        label="Has Mental Health Diagnosis?"
        description="Current or past documented diagnosis"
        value={data.has_diagnosis}
        onChange={v => set('has_diagnosis', v)}
      />
      {data.has_diagnosis && (
        <>
          <MultiSelectField
            label="Diagnosis / Condition(s)"
            value={data.diagnosis_list}
            onChange={v => set('diagnosis_list', v)}
            options={DIAGNOSIS_OPTIONS}
          />
          <BooleanField
            label="Currently in Counseling / Therapy?"
            value={data.in_counseling}
            onChange={v => set('in_counseling', v)}
          />
          <BooleanField
            label="Currently on Psychiatric Medication?"
            value={data.on_medication}
            onChange={v => set('on_medication', v)}
          />
        </>
      )}
      <BooleanField
        label="History of Trauma?"
        description="Adverse childhood experiences, violence, loss, etc."
        value={data.trauma_history}
        onChange={v => set('trauma_history', v)}
      />
      {data.trauma_history && (
        <MultiSelectField
          label="Type(s) of Trauma Experienced"
          value={data.trauma_types}
          onChange={v => set('trauma_types', v)}
          options={TRAUMA_TYPES}
        />
      )}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}