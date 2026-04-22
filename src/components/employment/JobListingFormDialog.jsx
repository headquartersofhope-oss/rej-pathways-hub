import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function JobListingFormDialog({ job, employers = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    employer_id: job?.employer_id || '',
    employer_name: job?.employer_name || '',
    job_title: job?.job_title || job?.title || '',
    job_type: job?.job_type || 'full_time',
    pay_rate: job?.pay_rate || '',
    pay_type: job?.pay_type || 'hourly',
    shift_details: job?.shift_details || '',
    location: job?.location || '',
    transportation_accessible: job?.transportation_accessible ?? true,
    second_chance_friendly: job?.second_chance_friendly ?? false,
    background_check_required: job?.background_check_required ?? false,
    background_check_details: job?.background_check_details || '',
    drug_test_required: job?.drug_test_required ?? false,
    positions_available: job?.positions_available || 1,
    description: job?.description || '',
    dress_code: job?.dress_code || '',
    status: job?.status || 'active',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEmployerChange = (id) => {
    const emp = employers.find(e => e.id === id);
    set('employer_id', id);
    if (emp) set('employer_name', emp.company_name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (job?.id) {
      await base44.entities.JobListing.update(job.id, form);
    } else {
      await base44.entities.JobListing.create({ ...form, posted_date: new Date().toISOString().split('T')[0] });
    }
    setLoading(false);
    onSaved();
  };

  const cls = "w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#30363D] sticky top-0 bg-[#161B22]">
          <h2 className="font-bold text-white">{job ? 'Edit Job Listing' : 'Post New Job'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Employer *</label>
            <select value={form.employer_id} onChange={e => handleEmployerChange(e.target.value)} className={cls} required>
              <option value="">Select employer...</option>
              {employers.map(e => <option key={e.id} value={e.id}>{e.company_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Job Title *</label>
              <input value={form.job_title} onChange={e => set('job_title', e.target.value)} required className={cls} placeholder="e.g. Warehouse Associate" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Job Type</label>
              <select value={form.job_type} onChange={e => set('job_type', e.target.value)} className={cls}>
                {['full_time','part_time','temporary','contract','seasonal'].map(t => (
                  <option key={t} value={t}>{t.replace('_',' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pay Rate</label>
              <input value={form.pay_rate} onChange={e => set('pay_rate', e.target.value)} className={cls} placeholder="e.g. $18/hr or $42,000/yr" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Positions Available</label>
              <input type="number" min={1} value={form.positions_available} onChange={e => set('positions_available', parseInt(e.target.value))} className={cls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} className={cls} placeholder="City or address" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Shift Details</label>
            <input value={form.shift_details} onChange={e => set('shift_details', e.target.value)} className={cls} placeholder="e.g. Mon–Fri 7am–3pm" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={cls + ' resize-none'} placeholder="Job duties and requirements..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Dress Code</label>
            <input value={form.dress_code} onChange={e => set('dress_code', e.target.value)} className={cls} placeholder="e.g. Safety boots, steel-toed required" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.transportation_accessible} onChange={e => set('transportation_accessible', e.target.checked)} className="accent-amber-500" />
              Bus Route Accessible
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.second_chance_friendly} onChange={e => set('second_chance_friendly', e.target.checked)} className="accent-amber-500" />
              Second Chance Friendly
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.background_check_required} onChange={e => set('background_check_required', e.target.checked)} className="accent-amber-500" />
              Background Check Required
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.drug_test_required} onChange={e => set('drug_test_required', e.target.checked)} className="accent-amber-500" />
              Drug Test Required
            </label>
          </div>
          {form.background_check_required && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Background Check Details</label>
              <input value={form.background_check_details} onChange={e => set('background_check_details', e.target.value)} className={cls} placeholder="e.g. No violent felonies in 7 years" />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={cls}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="filled">Filled</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[#30363D] text-slate-300">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
              {loading ? 'Saving...' : job ? 'Update Listing' : 'Post Job'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}