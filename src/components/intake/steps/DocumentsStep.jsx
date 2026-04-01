import React from 'react';
import { BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const MISSING_DOCS = [
  { value: 'state_id', label: 'State ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'social_security_card', label: 'Social Security Card' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'dd214', label: 'DD-214 (Veterans)' },
  { value: 'resume', label: 'Resume' },
  { value: 'work_authorization', label: 'Work Authorization / EAD' },
  { value: 'references', label: 'Professional References' },
  { value: 'background_check', label: 'Background Check Clearance' },
];

export default function DocumentsStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium mb-3">Documents Currently in Possession</p>
        <div className="space-y-1">
          <BooleanField label="State-Issued Photo ID" description="Driver's license, state ID, or passport" value={data.has_state_id} onChange={v => set('has_state_id', v)} />
          <BooleanField label="Birth Certificate" value={data.has_birth_certificate} onChange={v => set('has_birth_certificate', v)} />
          <BooleanField label="Social Security Card" value={data.has_ssn_card} onChange={v => set('has_ssn_card', v)} />
          <BooleanField label="Work Authorization / EAD" description="If applicable" value={data.has_work_authorization} onChange={v => set('has_work_authorization', v)} />
          <BooleanField label="Current Resume" value={data.has_resume} onChange={v => set('has_resume', v)} />
          <BooleanField label="Professional / Character References" value={data.has_references} onChange={v => set('has_references', v)} />
          <BooleanField label="DD-214 (Veterans Only)" value={data.has_dd214} onChange={v => set('has_dd214', v)} />
        </div>
      </div>
      <MultiSelectField
        label="Missing / Needed Documents"
        value={data.missing_documents}
        onChange={v => set('missing_documents', v)}
        options={MISSING_DOCS}
      />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}