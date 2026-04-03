import React from 'react';
import { BooleanField, NotesField, SelectField, MultiSelectField } from '../IntakeFieldRow';

const NUM_DEPENDENTS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6+', label: '6 or more' },
];

const DEPENDENT_TYPES = [
  { value: 'infant_toddler', label: 'Infant / Toddler (0–2)' },
  { value: 'young_child', label: 'Young Child (3–5)' },
  { value: 'school_age', label: 'School-Age Child (6–12)' },
  { value: 'teen', label: 'Teenager (13–17)' },
  { value: 'adult_child', label: 'Adult Child with Disability' },
  { value: 'elderly_parent', label: 'Elderly Parent / Relative' },
  { value: 'other_adult', label: 'Other Adult Dependent' },
];

const CHILDCARE_BARRIERS = [
  { value: 'cost', label: 'Cost / Affordability' },
  { value: 'availability', label: 'No Available Slots' },
  { value: 'transportation', label: 'Transportation to Childcare' },
  { value: 'hours', label: 'Hours Don\'t Match Work Schedule' },
  { value: 'trust', label: 'Trust / Safety Concerns' },
  { value: 'other', label: 'Other' },
];

export default function DependentCareStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField
        label="Has Dependents?"
        description="Children, elderly parents, or others in care"
        value={data.has_dependents}
        onChange={v => set('has_dependents', v)}
      />
      {data.has_dependents && (
        <>
          <SelectField
            label="Number of Dependents"
            value={String(data.num_dependents || '')}
            onChange={v => set('num_dependents', parseInt(v) || 0)}
            options={NUM_DEPENDENTS}
            placeholder="Select number..."
          />
          <MultiSelectField
            label="Type(s) of Dependents"
            value={data.dependent_types}
            onChange={v => set('dependent_types', v)}
            options={DEPENDENT_TYPES}
          />
          <BooleanField
            label="Childcare / Care Currently Arranged?"
            value={data.childcare_arranged}
            onChange={v => set('childcare_arranged', v)}
          />
          {!data.childcare_arranged && (
            <MultiSelectField
              label="Barriers to Arranging Care"
              value={data.childcare_barriers}
              onChange={v => set('childcare_barriers', v)}
              options={CHILDCARE_BARRIERS}
            />
          )}
          <BooleanField
            label="Receiving Childcare Subsidy?"
            description="State or county childcare assistance"
            value={data.childcare_subsidy}
            onChange={v => set('childcare_subsidy', v)}
          />
        </>
      )}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}