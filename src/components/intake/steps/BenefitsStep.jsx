import React from 'react';
import { BooleanField, NotesField, MultiSelectField } from '../IntakeFieldRow';

const BENEFIT_OPTIONS = [
  { value: 'snap', label: 'SNAP (Food Stamps)' },
  { value: 'medi_cal', label: 'Medi-Cal / Medicaid' },
  { value: 'calworks', label: 'CalWORKs / TANF' },
  { value: 'general_assistance', label: 'General Assistance (GA)' },
  { value: 'ssi', label: 'SSI (Supplemental Security Income)' },
  { value: 'ssdi', label: 'SSDI (Social Security Disability)' },
  { value: 'vet_benefits', label: 'VA / Veterans Benefits' },
  { value: 'wic', label: 'WIC (Women, Infants & Children)' },
  { value: 'unemployment', label: 'Unemployment Insurance (EDD)' },
  { value: 'housing_voucher', label: 'Housing Voucher (Section 8 / HCV)' },
  { value: 'calfresh', label: 'CalFresh (if separate from SNAP)' },
];

export default function BenefitsStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pb-2">Currently Receiving</p>
        <BooleanField label="SNAP (Food Stamps)" value={data.receiving_snap} onChange={v => set('receiving_snap', v)} />
        <BooleanField label="Medi-Cal / Medicaid" value={data.receiving_medi_cal} onChange={v => set('receiving_medi_cal', v)} />
        <BooleanField label="CalWORKs / TANF" value={data.receiving_calworks} onChange={v => set('receiving_calworks', v)} />
        <BooleanField label="General Assistance (GA)" value={data.receiving_ga} onChange={v => set('receiving_ga', v)} />
        <BooleanField label="SSI / SSDI" value={data.receiving_ssi_ssdi} onChange={v => set('receiving_ssi_ssdi', v)} />
        <BooleanField label="VA / Veterans Benefits" value={data.receiving_va} onChange={v => set('receiving_va', v)} />
        <BooleanField label="Unemployment Insurance" value={data.receiving_unemployment} onChange={v => set('receiving_unemployment', v)} />
      </div>
      <MultiSelectField
        label="Eligible But NOT Currently Enrolled In"
        value={data.eligible_not_enrolled}
        onChange={v => set('eligible_not_enrolled', v)}
        options={BENEFIT_OPTIONS}
      />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}