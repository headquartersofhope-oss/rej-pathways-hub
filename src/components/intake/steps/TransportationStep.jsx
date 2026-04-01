import React from 'react';
import { BooleanField, TextField, NotesField } from '../IntakeFieldRow';

export default function TransportationStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has Personal Vehicle?" value={data.has_vehicle} onChange={v => set('has_vehicle', v)} />
      <BooleanField label="Has Valid Driver's License?" value={data.valid_license} onChange={v => set('valid_license', v)} />
      <BooleanField label="License Suspended?" value={data.license_suspended} onChange={v => set('license_suspended', v)} />
      <BooleanField label="Uses Public Transit?" value={data.uses_public_transit} onChange={v => set('uses_public_transit', v)} />
      {data.uses_public_transit && (
        <BooleanField label="Public Transit Routes Accessible?" description="Can resident reach likely work sites by transit?" value={data.transit_accessible} onChange={v => set('transit_accessible', v)} />
      )}
      <TextField label="Maximum Commute Time (minutes)" value={data.max_commute_minutes} onChange={v => set('max_commute_minutes', parseFloat(v) || 0)} type="number" placeholder="60" />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}