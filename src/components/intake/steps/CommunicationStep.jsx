import React from 'react';
import { SelectField, BooleanField, NotesField } from '../IntakeFieldRow';

const PHONE_TYPES = [
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'basic', label: 'Basic / Feature Phone' },
  { value: 'none', label: 'No Phone' },
];

export default function CommunicationStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has a Phone?" value={data.has_phone} onChange={v => set('has_phone', v)} />
      <SelectField label="Phone Type" value={data.phone_type} onChange={v => set('phone_type', v)} options={PHONE_TYPES} />
      <BooleanField label="Has Email Address?" value={data.has_email} onChange={v => set('has_email', v)} />
      <BooleanField label="Has Computer Access?" value={data.has_computer_access} onChange={v => set('has_computer_access', v)} />
      <BooleanField label="Has Internet Access?" value={data.has_internet_access} onChange={v => set('has_internet_access', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}