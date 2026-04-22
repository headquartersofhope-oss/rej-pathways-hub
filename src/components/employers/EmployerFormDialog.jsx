import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Upload } from 'lucide-react';

const BENEFITS_OPTIONS = ['Health Insurance', 'Dental', 'Vision', '401k', 'PTO', 'Paid Training', 'Uniform Provided', 'Tool Allowance', 'Flexible Schedule', 'Remote Work'];

export default function EmployerFormDialog({ employer, onClose, onSaved }) {
  const e = employer;
  const [form, setForm] = useState({
    company_name: e?.company_name || '',
    industry: e?.industry || '',
    company_size: e?.company_size || '',
    headquarters_city: e?.headquarters_city || e?.city || '',
    headquarters_state: e?.headquarters_state || e?.state || '',
    website: e?.website || '',
    company_logo_url: e?.company_logo_url || e?.logo_url || '',
    hiring_contact_name: e?.hiring_contact_name || e?.contact_name || '',
    hiring_contact_email: e?.hiring_contact_email || e?.contact_email || '',
    hiring_contact_phone: e?.hiring_contact_phone || e?.contact_phone || '',
    is_second_chance_employer: e?.is_second_chance_employer || e?.second_chance_friendly || false,
    second_chance_policy_description: e?.second_chance_policy_description || '',
    transportation_accessible: e?.transportation_accessible || false,
    bus_route_nearby: e?.bus_route_nearby || '',
    onsite_parking: e?.onsite_parking || false,
    benefits_offered: e?.benefits_offered || [],
    background_check_policy: e?.background_check_policy || '',
    drug_test_policy: e?.drug_test_policy || '',
    reliability_rating: e?.reliability_rating || '',
    status: e?.status || 'active',
    notes: e?.notes || '',
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('company_logo_url', file_url);
    setUploading(false);
  };

  const toggleBenefit = (b) => {
    const cur = form.benefits_offered;
    set('benefits_offered', cur.includes(b) ? cur.filter(x => x !== b) : [...cur, b]);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    const data = { ...form, logo_url: form.company_logo_url, second_chance_friendly: form.is_second_chance_employer };
    if (e?.id) {
      await base44.entities.Employer.update(e.id, data);
    } else {
      await base44.entities.Employer.create(data);
    }
    setLoading(false);
    onSaved();
  };

  const cls = "w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#30363D] sticky top-0 bg-[#161B22]">
          <h2 className="font-bold text-white">{e ? 'Edit Employer' : 'Add Employer'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-4">
            {form.company_logo_url ? (
              <img src={form.company_logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#30363D]" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center text-slate-500">
                <Upload className="w-6 h-6" />
              </div>
            )}
            <div>
              <label className="cursor-pointer text-xs text-amber-400 hover:text-amber-300 font-semibold">
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, SVG</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Company Info</h3>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)} required placeholder="Company Name *" className={cls} />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Industry" className={cls} />
              <select value={form.company_size} onChange={e => set('company_size', e.target.value)} className={cls}>
                <option value="">Company Size</option>
                {['1-10','11-50','51-200','201-500','500+'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.headquarters_city} onChange={e => set('headquarters_city', e.target.value)} placeholder="City" className={cls} />
              <input value={form.headquarters_state} onChange={e => set('headquarters_state', e.target.value)} placeholder="State" className={cls} />
            </div>
            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="Website URL" className={cls} />
          </div>

          {/* Hiring Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Hiring Contact</h3>
            <input value={form.hiring_contact_name} onChange={e => set('hiring_contact_name', e.target.value)} placeholder="Contact Name" className={cls} />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.hiring_contact_email} onChange={e => set('hiring_contact_email', e.target.value)} type="email" placeholder="Email" className={cls} />
              <input value={form.hiring_contact_phone} onChange={e => set('hiring_contact_phone', e.target.value)} placeholder="Phone" className={cls} />
            </div>
          </div>

          {/* Second Chance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Second Chance</h3>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.is_second_chance_employer} onChange={e => set('is_second_chance_employer', e.target.checked)} className="accent-amber-500" />
              This employer hires people with criminal records
            </label>
            {form.is_second_chance_employer && (
              <textarea value={form.second_chance_policy_description} onChange={e => set('second_chance_policy_description', e.target.value)} placeholder="Describe their background check policy..." rows={2} className={cls + ' resize-none'} />
            )}
          </div>

          {/* Accessibility */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Accessibility</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.transportation_accessible} onChange={e => set('transportation_accessible', e.target.checked)} className="accent-amber-500" />
                Bus Route Accessible
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.onsite_parking} onChange={e => set('onsite_parking', e.target.checked)} className="accent-amber-500" />
                Onsite Parking
              </label>
            </div>
            {form.transportation_accessible && (
              <input value={form.bus_route_nearby} onChange={e => set('bus_route_nearby', e.target.value)} placeholder="Bus route number or line name" className={cls} />
            )}
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Benefits Offered</h3>
            <div className="flex flex-wrap gap-2">
              {BENEFITS_OPTIONS.map(b => (
                <button
                  key={b} type="button"
                  onClick={() => toggleBenefit(b)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.benefits_offered.includes(b) ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'border-[#30363D] text-slate-400 hover:border-blue-500/30'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Policies */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Policies</h3>
            <input value={form.background_check_policy} onChange={e => set('background_check_policy', e.target.value)} placeholder="Background check policy" className={cls} />
            <input value={form.drug_test_policy} onChange={e => set('drug_test_policy', e.target.value)} placeholder="Drug test policy" className={cls} />
          </div>

          {/* Ratings & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reliability Rating (0–5)</label>
              <input type="number" min={0} max={5} step={0.1} value={form.reliability_rating} onChange={e => set('reliability_rating', parseFloat(e.target.value))} className={cls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={cls}>
                <option value="active">Active</option>
                <option value="pending_review">Pending Review</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." rows={2} className={cls + ' resize-none'} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[#30363D] text-slate-300">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
              {loading ? 'Saving...' : e ? 'Update Employer' : 'Add Employer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}