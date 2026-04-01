import React from 'react';
import { TextField, BooleanField } from '../IntakeFieldRow';

export default function EmergencyContactStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <TextField label="Emergency Contact Name" value={data.name} onChange={v => set('name', v)} placeholder="Full name" />
      <TextField label="Relationship" value={data.relationship} onChange={v => set('relationship', v)} placeholder="e.g. Mother, Friend, Sibling" />
      <TextField label="Phone Number" value={data.phone} onChange={v => set('phone', v)} placeholder="(555) 000-0000" />
      <BooleanField label="Can Contact for Employment Purposes?" description="May this person be contacted as a reference or in case of work emergency?" value={data.can_contact_for_employment} onChange={v => set('can_contact_for_employment', v)} />
    </div>
  );
}