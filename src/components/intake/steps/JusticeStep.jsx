import React from 'react';
import { SelectField, TextField, BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const CHARGE_TYPES = [
  { value: 'violent', label: 'Violent Offense' },
  { value: 'non_violent', label: 'Non-Violent Offense' },
  { value: 'drug_related', label: 'Drug-Related Offense' },
  { value: 'property', label: 'Property Crime' },
  { value: 'dui', label: 'DUI / Traffic Offense' },
  { value: 'domestic_violence', label: 'Domestic Violence' },
  { value: 'weapons', label: 'Weapons Offense' },
  { value: 'financial', label: 'Financial / Fraud' },
  { value: 'other', label: 'Other' },
  { value: 'na', label: 'N/A / Prefer Not to Say' },
];

const CHECKIN_FREQ = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice_weekly', label: 'Twice a Week' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every Two Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_needed', label: 'As Needed' },
];

const CURFEW_TIMES = [
  { value: '8pm', label: '8:00 PM' },
  { value: '9pm', label: '9:00 PM' },
  { value: '10pm', label: '10:00 PM' },
  { value: '11pm', label: '11:00 PM' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'none', label: 'No Curfew' },
  { value: 'other', label: 'Other / Varies' },
];

const SUPERVISION_CONDITIONS = [
  { value: 'drug_testing', label: 'Mandatory Drug Testing' },
  { value: 'employment_requirement', label: 'Employment Requirement' },
  { value: 'no_alcohol', label: 'No Alcohol' },
  { value: 'no_firearms', label: 'No Firearms' },
  { value: 'no_contact_order', label: 'No-Contact Order' },
  { value: 'gps_monitoring', label: 'GPS / Electronic Monitoring' },
  { value: 'travel_restrictions', label: 'Travel / Geographic Restrictions' },
  { value: 'community_service', label: 'Community Service Hours' },
  { value: 'counseling_required', label: 'Counseling Requirement' },
  { value: 'other', label: 'Other' },
];

export default function JusticeStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField
        label="Justice Involved?"
        description="Has the resident been incarcerated or has a criminal record?"
        value={data.justice_involved}
        onChange={v => set('justice_involved', v)}
      />
      {data.justice_involved && (
        <>
          <SelectField
            label="Most Recent Charge Type"
            value={data.charge_type}
            onChange={v => set('charge_type', v)}
            options={CHARGE_TYPES}
            placeholder="Select charge type..."
          />
          <TextField
            label="Most Recent Release Date"
            value={data.release_date}
            onChange={v => set('release_date', v)}
            type="date"
          />
          <BooleanField
            label="Currently on Probation?"
            value={data.on_probation}
            onChange={v => set('on_probation', v)}
          />
          <BooleanField
            label="Currently on Parole?"
            value={data.on_parole}
            onChange={v => set('on_parole', v)}
          />
          {(data.on_probation || data.on_parole) && (
            <>
              <TextField
                label="Supervising Officer Name"
                value={data.officer_name}
                onChange={v => set('officer_name', v)}
                placeholder="P.O. / Parole Agent name"
              />
              <TextField
                label="Officer Phone"
                value={data.officer_phone}
                onChange={v => set('officer_phone', v)}
                placeholder="(555) 000-0000"
              />
              <SelectField
                label="Required Check-in Frequency"
                value={data.check_in_frequency}
                onChange={v => set('check_in_frequency', v)}
                options={CHECKIN_FREQ}
                placeholder="Select frequency..."
              />
              <SelectField
                label="Curfew Time"
                value={data.curfew}
                onChange={v => set('curfew', v)}
                options={CURFEW_TIMES}
                placeholder="Select curfew..."
              />
              <MultiSelectField
                label="Supervision Conditions / Restrictions"
                value={data.supervision_conditions}
                onChange={v => set('supervision_conditions', v)}
                options={SUPERVISION_CONDITIONS}
              />
              <BooleanField
                label="Geographic / Travel Restrictions?"
                description="Cannot travel outside county, state, or specific areas"
                value={data.geographic_restrictions}
                onChange={v => set('geographic_restrictions', v)}
              />
            </>
          )}
          <BooleanField
            label="On Sex Offender Registry?"
            value={data.sex_offender_registry}
            onChange={v => set('sex_offender_registry', v)}
          />
        </>
      )}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}