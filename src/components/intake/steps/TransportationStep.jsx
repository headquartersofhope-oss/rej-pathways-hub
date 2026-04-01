import React from 'react';
import { BooleanField, TextField, NotesField, SelectField, MultiSelectField } from '../IntakeFieldRow';

const TRANSPORT_ACCESS = [
  { value: 'none', label: 'None – No Transportation' },
  { value: 'public_transit', label: 'Public Transit' },
  { value: 'rideshare', label: 'Rideshare (Uber/Lyft)' },
  { value: 'own_vehicle', label: 'Own Vehicle' },
  { value: 'carpool', label: 'Carpool / Shared Ride' },
  { value: 'bicycle', label: 'Bicycle / Walking Distance' },
];

const SHIFT_AVAILABILITY = [
  { value: 'morning', label: 'Morning (6am–12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm–5pm)' },
  { value: 'evening', label: 'Evening (5pm–10pm)' },
  { value: 'overnight', label: 'Overnight (10pm–6am)' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'flexible', label: 'Flexible / Any Shift' },
];

const SCHEDULE_PREF = [
  { value: 'full_time', label: 'Full-Time (35+ hrs/week)' },
  { value: 'part_time', label: 'Part-Time (under 35 hrs/week)' },
  { value: 'flexible', label: 'Flexible / Open to Either' },
];

export default function TransportationStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <SelectField
        label="Primary Transportation Access"
        value={data.transport_access}
        onChange={v => set('transport_access', v)}
        options={TRANSPORT_ACCESS}
        placeholder="Select transportation type..."
      />
      <BooleanField label="Has Personal Vehicle?" value={data.has_vehicle} onChange={v => set('has_vehicle', v)} />
      <BooleanField label="Has Valid Driver's License?" value={data.valid_license} onChange={v => set('valid_license', v)} />
      <BooleanField label="License Suspended?" value={data.license_suspended} onChange={v => set('license_suspended', v)} />
      <BooleanField label="Uses Public Transit?" value={data.uses_public_transit} onChange={v => set('uses_public_transit', v)} />
      {data.uses_public_transit && (
        <BooleanField
          label="Public Transit Routes Accessible?"
          description="Can resident reach likely work sites by transit?"
          value={data.transit_accessible}
          onChange={v => set('transit_accessible', v)}
        />
      )}
      <TextField
        label="Maximum Commute Time (minutes)"
        value={data.max_commute_minutes}
        onChange={v => set('max_commute_minutes', parseFloat(v) || 0)}
        type="number"
        placeholder="60"
      />
      <MultiSelectField
        label="Shift Availability"
        value={data.shift_availability}
        onChange={v => set('shift_availability', v)}
        options={SHIFT_AVAILABILITY}
      />
      <SelectField
        label="Work Schedule Preference"
        value={data.schedule_preference}
        onChange={v => set('schedule_preference', v)}
        options={SCHEDULE_PREF}
        placeholder="Select preference..."
      />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}