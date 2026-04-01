import React from 'react';
import { BooleanField, NotesField } from '../IntakeFieldRow';

export default function BenefitsStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pb-2">Currently Receiving</p>
      <BooleanField label="SNAP (Food Stamps)" value={data.receiving_snap} onChange={v => set('receiving_snap', v)} />
      <BooleanField label="Medi-Cal / Medicaid" value={data.receiving_medi_cal} onChange={v => set('receiving_medi_cal', v)} />
      <BooleanField label="CalWORKs / TANF" value={data.receiving_calworks} onChange={v => set('receiving_calworks', v)} />
      <BooleanField label="General Assistance (GA)" value={data.receiving_ga} onChange={v => set('receiving_ga', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}