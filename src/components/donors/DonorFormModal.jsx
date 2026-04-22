import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';

const DONOR_TYPES = ['individual', 'corporation', 'foundation', 'government', 'organization'];
const STATUSES = ['active', 'lapsed', 'prospect', 'major_donor', 'recurring'];

const emptyForm = {
  donor_name: '', donor_type: 'individual', contact_email: '', contact_phone: '',
  total_given: '', first_gift_date: '', last_gift_date: '', status: 'prospect',
  communication_preference: '', notes: '', gifts: []
};

export default function DonorFormModal({ donor, onClose, onSaved }) {
  const [form, setForm] = useState(donor ? { ...donor, total_given: donor.total_given || '' } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [newGift, setNewGift] = useState({ amount: '', date: '', purpose: '' });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addGift = () => {
    if (!newGift.amount || !newGift.date) return;
    const gift = { ...newGift, amount: parseInt(newGift.amount) };
    const gifts = [...(form.gifts || []), gift];
    const total = gifts.reduce((s, g) => s + (g.amount || 0), 0);
    const dates = gifts.map(g => g.date).sort();
    set('gifts', gifts);
    set('total_given', total);
    set('first_gift_date', dates[0]);
    set('last_gift_date', dates[dates.length - 1]);
    setNewGift({ amount: '', date: '', purpose: '' });
  };

  const removeGift = (i) => {
    const gifts = form.gifts.filter((_, idx) => idx !== i);
    const total = gifts.reduce((s, g) => s + (g.amount || 0), 0);
    set('gifts', gifts);
    set('total_given', total);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, total_given: form.total_given ? parseInt(form.total_given) : 0 };
    if (donor?.id) {
      await base44.entities.Donor.update(donor.id, payload);
    } else {
      await base44.entities.Donor.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  const inputCls = "w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50";
  const Field = ({ label, children }) => (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#30363D]">
          <h2 className="text-lg font-semibold text-white">{donor ? 'Edit Donor' : 'New Donor'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Donor Name *">
              <input className={inputCls} value={form.donor_name} onChange={e => set('donor_name', e.target.value)} />
            </Field>
            <Field label="Donor Type">
              <select className={inputCls} value={form.donor_type} onChange={e => set('donor_type', e.target.value)}>
                {DONOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Total Given ($)">
              <input className={inputCls} type="number" value={form.total_given} onChange={e => set('total_given', e.target.value)} />
            </Field>
            <Field label="Contact Email">
              <input className={inputCls} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </Field>
            <Field label="Contact Phone">
              <input className={inputCls} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
            </Field>
            <Field label="First Gift Date">
              <input className={inputCls} type="date" value={form.first_gift_date} onChange={e => set('first_gift_date', e.target.value)} />
            </Field>
            <Field label="Last Gift Date">
              <input className={inputCls} type="date" value={form.last_gift_date} onChange={e => set('last_gift_date', e.target.value)} />
            </Field>
            <Field label="Communication Preference">
              <input className={inputCls} value={form.communication_preference} onChange={e => set('communication_preference', e.target.value)} placeholder="e.g. Email, Phone, Mail" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>

          {/* Gift History */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Gift History</label>
            <div className="space-y-2 mb-3">
              {(form.gifts || []).map((g, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#21262D] rounded-lg px-3 py-2 text-sm">
                  <span className="text-amber-400 font-semibold w-20">${g.amount?.toLocaleString()}</span>
                  <span className="text-slate-400 w-28">{g.date}</span>
                  <span className="text-slate-300 flex-1">{g.purpose}</span>
                  <button onClick={() => removeGift(i)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls + ' w-28'} type="number" placeholder="Amount" value={newGift.amount} onChange={e => setNewGift(n => ({ ...n, amount: e.target.value }))} />
              <input className={inputCls + ' w-36'} type="date" value={newGift.date} onChange={e => setNewGift(n => ({ ...n, date: e.target.value }))} />
              <input className={inputCls} placeholder="Purpose (optional)" value={newGift.purpose} onChange={e => setNewGift(n => ({ ...n, purpose: e.target.value }))} />
              <Button size="sm" variant="outline" onClick={addGift} className="border-[#30363D] text-slate-300 shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-[#30363D]">
          <Button variant="outline" onClick={onClose} className="border-[#30363D] text-slate-300">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.donor_name} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
            {saving ? 'Saving...' : 'Save Donor'}
          </Button>
        </div>
      </div>
    </div>
  );
}