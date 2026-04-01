import React from 'react';
import { TextField, SelectField, BooleanField, NotesField } from '../IntakeFieldRow';

export default function PersonalStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <TextField label="Preferred Name" value={data.preferred_name} onChange={v => set('preferred_name', v)} placeholder="What name do they go by?" />
      <TextField label="Pronouns" value={data.pronouns} onChange={v => set('pronouns', v)} placeholder="e.g. he/him, she/her, they/them" />
      <TextField label="Primary Language" value={data.primary_language} onChange={v => set('primary_language', v)} placeholder="e.g. English, Spanish" />
      <BooleanField label="Interpreter Needed?" description="Does the resident need a language interpreter?" value={data.interpreter_needed} onChange={v => set('interpreter_needed', v)} />
    </div>
  );
}