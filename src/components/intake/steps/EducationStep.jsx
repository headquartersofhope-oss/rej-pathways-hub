import React from 'react';
import { SelectField, BooleanField, NotesField } from '../IntakeFieldRow';

const EDU_LEVELS = [
  { value: 'no_diploma', label: 'No Diploma' },
  { value: 'ged', label: 'GED' },
  { value: 'high_school', label: 'High School Diploma' },
  { value: 'some_college', label: 'Some College' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'graduate', label: 'Graduate Degree' },
  { value: 'vocational', label: 'Vocational / Trade Certification' },
];

export default function EducationStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <SelectField label="Highest Level of Education Completed" value={data.highest_level} onChange={v => set('highest_level', v)} options={EDU_LEVELS} />
      <BooleanField label="Currently Enrolled in School?" value={data.currently_enrolled} onChange={v => set('currently_enrolled', v)} />
      <BooleanField label="Known Learning Disability?" value={data.learning_disability} onChange={v => set('learning_disability', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}