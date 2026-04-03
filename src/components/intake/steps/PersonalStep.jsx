import React from 'react';
import { TextField, SelectField, BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const PRONOUNS = [
  { value: 'he_him', label: 'He/Him' },
  { value: 'she_her', label: 'She/Her' },
  { value: 'they_them', label: 'They/Them' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'mandarin', label: 'Mandarin' },
  { value: 'cantonese', label: 'Cantonese' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'tagalog', label: 'Tagalog' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'other', label: 'Other' },
];

const GENDER = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-Binary' },
  { value: 'transgender_male', label: 'Transgender Male' },
  { value: 'transgender_female', label: 'Transgender Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const RACE_ETHNICITY = [
  { value: 'american_indian', label: 'American Indian / Alaska Native' },
  { value: 'asian', label: 'Asian' },
  { value: 'black', label: 'Black / African American' },
  { value: 'hispanic_latino', label: 'Hispanic / Latino' },
  { value: 'middle_eastern', label: 'Middle Eastern / North African' },
  { value: 'native_hawaiian', label: 'Native Hawaiian / Pacific Islander' },
  { value: 'white', label: 'White / Caucasian' },
  { value: 'multiracial', label: 'Multiracial / Mixed' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

export default function PersonalStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <TextField
        label="First Name"
        value={data.first_name}
        onChange={v => set('first_name', v)}
        placeholder="First name"
      />
      <TextField
        label="Last Name"
        value={data.last_name}
        onChange={v => set('last_name', v)}
        placeholder="Last name"
      />
      <TextField
        label="Email"
        value={data.email}
        onChange={v => set('email', v)}
        placeholder="Email address"
        type="email"
      />
      <TextField
        label="Phone"
        value={data.phone}
        onChange={v => set('phone', v)}
        placeholder="Phone number"
        type="tel"
      />
      <TextField
        label="Date of Birth"
        value={data.date_of_birth}
        onChange={v => set('date_of_birth', v)}
        type="date"
      />
      <TextField
        label="Preferred Name"
        value={data.preferred_name}
        onChange={v => set('preferred_name', v)}
        placeholder="What name do they go by?"
      />
      <SelectField
        label="Pronouns"
        value={data.pronouns}
        onChange={v => set('pronouns', v)}
        options={PRONOUNS}
        placeholder="Select pronouns..."
      />
      {data.pronouns === 'other' && (
        <TextField
          label="Pronouns (specify)"
          value={data.pronouns_other}
          onChange={v => set('pronouns_other', v)}
          placeholder="e.g. ze/zir"
        />
      )}
      <SelectField
        label="Gender Identity"
        value={data.gender_identity}
        onChange={v => set('gender_identity', v)}
        options={GENDER}
        placeholder="Select gender identity..."
      />
      <MultiSelectField
        label="Race / Ethnicity"
        value={data.race_ethnicity}
        onChange={v => set('race_ethnicity', v)}
        options={RACE_ETHNICITY}
      />
      <SelectField
        label="Primary Language"
        value={data.primary_language}
        onChange={v => set('primary_language', v)}
        options={LANGUAGES}
        placeholder="Select language..."
      />
      {data.primary_language === 'other' && (
        <TextField
          label="Primary Language (specify)"
          value={data.primary_language_other}
          onChange={v => set('primary_language_other', v)}
          placeholder="Enter language"
        />
      )}
      <BooleanField
        label="Interpreter Needed?"
        description="Does the resident need a language interpreter?"
        value={data.interpreter_needed}
        onChange={v => set('interpreter_needed', v)}
      />
    </div>
  );
}