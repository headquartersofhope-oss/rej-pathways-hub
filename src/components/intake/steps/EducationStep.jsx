import React from 'react';
import { SelectField, BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const EDU_LEVELS = [
  { value: 'no_diploma', label: 'No Diploma / Did Not Graduate' },
  { value: 'ged', label: 'GED / HiSET Equivalency' },
  { value: 'high_school', label: 'High School Diploma' },
  { value: 'some_college', label: 'Some College (No Degree)' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'graduate', label: 'Graduate / Professional Degree' },
  { value: 'vocational', label: 'Vocational / Trade Certification' },
];

const CERTIFICATIONS = [
  { value: 'forklift', label: 'Forklift Operator' },
  { value: 'osha_10', label: 'OSHA 10-Hour' },
  { value: 'osha_30', label: 'OSHA 30-Hour' },
  { value: 'cdl_a', label: 'CDL Class A' },
  { value: 'cdl_b', label: 'CDL Class B' },
  { value: 'food_handlers', label: 'Food Handler / ServSafe' },
  { value: 'cna', label: 'Certified Nursing Assistant (CNA)' },
  { value: 'phlebotomy', label: 'Phlebotomy Certification' },
  { value: 'security_guard', label: 'Security Guard License' },
  { value: 'emt', label: 'EMT / First Responder' },
  { value: 'welding', label: 'Welding Certification' },
  { value: 'electrical', label: 'Electrician / Apprentice Card' },
  { value: 'plumbing', label: 'Plumbing Certification' },
  { value: 'hvac', label: 'HVAC Certification' },
  { value: 'real_estate', label: 'Real Estate License' },
  { value: 'cosmetology', label: 'Cosmetology License' },
  { value: 'childcare', label: 'Childcare / Child Development' },
  { value: 'it_comptia', label: 'CompTIA (A+, Network+, etc.)' },
  { value: 'microsoft', label: 'Microsoft Office Certification' },
  { value: 'other', label: 'Other' },
];

const ENROLLMENT_TYPES = [
  { value: 'ged_program', label: 'GED / Adult Ed Program' },
  { value: 'community_college', label: 'Community College' },
  { value: 'vocational_trade', label: 'Vocational / Trade School' },
  { value: 'university', label: 'University / 4-Year College' },
  { value: 'online_courses', label: 'Online Courses' },
  { value: 'workforce_training', label: 'Workforce Development Training' },
  { value: 'other', label: 'Other' },
];

export default function EducationStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <SelectField
        label="Highest Level of Education Completed"
        value={data.highest_level}
        onChange={v => set('highest_level', v)}
        options={EDU_LEVELS}
        placeholder="Select level..."
      />
      <BooleanField
        label="Currently Enrolled in School or Training?"
        value={data.currently_enrolled}
        onChange={v => set('currently_enrolled', v)}
      />
      {data.currently_enrolled && (
        <MultiSelectField
          label="Type of Program Currently Enrolled In"
          value={data.enrollment_types}
          onChange={v => set('enrollment_types', v)}
          options={ENROLLMENT_TYPES}
        />
      )}
      <MultiSelectField
        label="Certifications / Licenses Held"
        value={data.certifications}
        onChange={v => set('certifications', v)}
        options={CERTIFICATIONS}
      />
      <BooleanField
        label="Known Learning Disability?"
        description="Dyslexia, dyscalculia, or other documented learning difference"
        value={data.learning_disability}
        onChange={v => set('learning_disability', v)}
      />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}