import React from 'react';
import { BooleanField, NotesField } from '../IntakeFieldRow';

export default function FosterCareStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Foster Care History?" description="Was the resident ever in the foster care system?" value={data.is_foster_care} onChange={v => set('is_foster_care', v)} />
      {data.is_foster_care && <>
        <BooleanField label="Aged Out of Foster Care?" description="Left foster care at age 18 without being adopted" value={data.aged_out} onChange={v => set('aged_out', v)} />
        <BooleanField label="Currently Receiving Extended Support Services?" value={data.current_support_services} onChange={v => set('current_support_services', v)} />
      </>}
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}