import React from 'react';
import { BooleanField, NotesField } from '../IntakeFieldRow';

export default function ClothingToolsStep({ data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <BooleanField label="Has Interview-Appropriate Clothing?" value={data.has_interview_clothes} onChange={v => set('has_interview_clothes', v)} />
      <BooleanField label="Needs Work Uniform?" value={data.needs_work_uniform} onChange={v => set('needs_work_uniform', v)} />
      <BooleanField label="Needs Tools or Equipment?" description="Hand tools, work boots, etc." value={data.needs_tools_equipment} onChange={v => set('needs_tools_equipment', v)} />
      <BooleanField label="Needs Safety Gear?" description="Hard hat, vest, gloves, etc." value={data.needs_safety_gear} onChange={v => set('needs_safety_gear', v)} />
      <NotesField value={data.notes} onChange={v => set('notes', v)} />
    </div>
  );
}