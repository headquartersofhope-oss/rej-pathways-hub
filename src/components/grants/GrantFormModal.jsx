import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';

const FUNDER_TYPES = ['federal', 'state', 'local', 'private_foundation', 'corporate', 'individual'];
const STATUSES = ['researching', 'drafting', 'submitted', 'under_review', 'awarded', 'denied', 'reporting', 'closed'];

const emptyForm = {
  grant_name: '', funder_name: '', funder_type: 'private_foundation',
  grant_amount: '', amount_received: '', application_deadline: '',
  award_date: '', grant_start: '', grant_end: '', status: 'researching',
  reporting_requirements: '', program_area: '', restrictions: '',
  contact_name: '', contact_email: '', notes: '', reporting_deadlines: []
};

export default function GrantFormModal({ grant, onClose, onSaved }) {
  const [form, setForm] = useState(grant ? {
    ...grant,
    grant_amount: grant.grant_amount || '',
    amount_received: grant.amount_received || '',
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ label: '', due_date: '' });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addDeadline = () => {
    if (!newDeadline.label || !newDeadline.due_date) return;
    set('reporting_deadlines', [...(form.reporting_deadlines || []), { ...newDeadline, completed: false }]);
    setNewDeadline({ label: '', due_date: '' });
  };

  const removeDeadline = (i) => {
    set('reporting_deadlines', form.reporting_deadlines.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      grant_amount: form.grant_amount ? parseInt(form.grant_amount) : null,
      amount_received: form.amount_received ? parseInt(form.amount_received) : null,
    };
    if (grant?.id) {
      await base44.entities.Grant.update(grant.id, payload);
    } else {
      await base44.entities.Grant.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#30363D]">
          <h2 className="text-lg font-semibold text-white">{grant ? 'Edit Grant' : 'New Grant'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Grant Name *">
              <input className={inputCls} value={form.grant_name} onChange={e => set('grant_name', e.target.value)} placeholder="e.g. Reentry Housing Initiative Grant" />
            </Field>
            <Field label="Funder Name *">
              <input className={inputCls} value={form.funder_name} onChange={e => set('funder_name', e.target.value)} placeholder="e.g. Department of Justice" />
            </Field>
            <Field label="Funder Type">
              <select className={inputCls} value={form.funder_type} onChange={e => set('funder_type', e.target.value)}>
                {FUNDER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Grant Amount ($)">
              <input className={inputCls} type="number" value={form.grant_amount} onChange={e => set('grant_amount', e.target.value)} placeholder="250000" />
            </Field>
            <Field label="Amount Received ($)">
              <input className={inputCls} type="number" value={form.amount_received} onChange={e => set('amount_received', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Application Deadline">
              <input className={inputCls} type="date" value={form.application_deadline} onChange={e => set('application_deadline', e.target.value)} />
            </Field>
            <Field label="Award Date">
              <input className={inputCls} type="date" value={form.award_date} onChange={e => set('award_date', e.target.value)} />
            </Field>
            <Field label="Grant Start">
              <input className={inputCls} type="date" value={form.grant_start} onChange={e => set('grant_start', e.target.value)} />
            </Field>
            <Field label="Grant End">
              <input className={inputCls} type="date" value={form.grant_end} onChange={e => set('grant_end', e.target.value)} />
            </Field>
            <Field label="Program Area">
              <input className={inputCls} value={form.program_area} onChange={e => set('program_area', e.target.value)} placeholder="e.g. Housing, Workforce Development" />
            </Field>
            <Field label="Contact Name">
              <input className={inputCls} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
            </Field>
            <Field label="Contact Email">
              <input className={inputCls} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </Field>
          </div>
          <Field label="Reporting Requirements">
            <textarea className={inputCls} rows={2} value={form.reporting_requirements} onChange={e => set('reporting_requirements', e.target.value)} />
          </Field>
          <Field label="Restrictions">
            <textarea className={inputCls} rows={2} value={form.restrictions} onChange={e => set('restrictions', e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>

          {/* Reporting Deadlines */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Reporting Deadlines</label>
            <div className="space-y-2 mb-3">
              {(form.reporting_deadlines || []).map((d, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#21262D] rounded-lg px-3 py-2 text-sm">
                  <span className="text-white flex-1">{d.label}</span>
                  <span className="text-slate-400">{d.due_date}</span>
                  <button onClick={() => removeDeadline(i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Label (e.g. Q1 Report)" value={newDeadline.label} onChange={e => setNewDeadline(n => ({ ...n, label: e.target.value }))} />
              <input className={inputCls + ' w-44'} type="date" value={newDeadline.due_date} onChange={e => setNewDeadline(n => ({ ...n, due_date: e.target.value }))} />
              <Button size="sm" variant="outline" onClick={addDeadline} className="border-[#30363D] text-slate-300 shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-[#30363D]">
          <Button variant="outline" onClick={onClose} className="border-[#30363D] text-slate-300">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.grant_name || !form.funder_name} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
            {saving ? 'Saving...' : 'Save Grant'}
          </Button>
        </div>
      </div>
    </div>
  );
}