import React from 'react';
import { BooleanField, TextField, NotesField } from '../IntakeFieldRow';

export default function LegalFinancialStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has Outstanding Legal Fines / Fees?" value={data.has_fines_fees} onChange={v => set('has_fines_fees', v)} />
      {data.has_fines_fees && (
        <TextField label="Estimated Total Owed ($)" value={data.total_owed} onChange={v => set('total_owed', parseFloat(v) || 0)} type="number" placeholder="0.00" />
      )}
      <BooleanField label="Wage Garnishment Active?" value={data.wage_garnishment} onChange={v => set('wage_garnishment', v)} />
      <BooleanField label="Child Support Obligation?" value={data.child_support} onChange={v => set('child_support', v)} />
      <BooleanField label="Prior Bankruptcy?" value={data.bankruptcy} onChange={v => set('bankruptcy', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}