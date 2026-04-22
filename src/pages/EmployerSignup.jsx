import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Building2, Award, Users, CheckCircle, ChevronRight, Heart, Briefcase, TrendingUp } from 'lucide-react';

const BENEFITS = [
  { icon: Heart, title: 'Pre-Screened Candidates', desc: 'Every candidate is assessed, coached, and ready to work.' },
  { icon: Award, title: 'Tax Incentives', desc: 'Qualify for Work Opportunity Tax Credits (WOTC) up to $9,600 per hire.' },
  { icon: Users, title: 'Ongoing Support', desc: 'Our case managers support both you and the employee post-placement.' },
  { icon: TrendingUp, title: 'Retention Coaching', desc: 'We provide 90-day retention coaching to protect your investment.' },
];

export default function EmployerSignup() {
  const [step, setStep] = useState(1); // 1=info, 2=form, 3=success
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', industry: '', company_size: '', headquarters_city: '', headquarters_state: '',
    hiring_contact_name: '', hiring_contact_email: '', hiring_contact_phone: '',
    website: '', is_second_chance_employer: false, second_chance_policy_description: '',
    transportation_accessible: false, onsite_parking: false,
    background_check_policy: '', drug_test_policy: '', signup_message: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.Employer.create({
      ...form,
      status: 'pending_review',
      self_signup: true,
      contact_name: form.hiring_contact_name,
      contact_email: form.hiring_contact_email,
      contact_phone: form.hiring_contact_phone,
    });
    setLoading(false);
    setStep(3);
  };

  if (step === 3) return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Application Received!</h2>
        <p className="text-slate-400 mb-6">Thank you for joining our Second Chance employer network. Our team will review your application and reach out within 2 business days to discuss next steps.</p>
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 text-left">
          <p className="text-xs text-slate-400 mb-2">What happens next:</p>
          {['Admin reviews your profile', 'We schedule an intro call', 'You go live on the job board', 'Start receiving pre-screened candidates'].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400 font-bold shrink-0">{i+1}</div>
              <span className="text-sm text-slate-300">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#0D1117] to-[#0D1117] border-b border-[#30363D]">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent" />
        <div className="relative px-6 py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-semibold mb-6">
            <Award className="w-4 h-4" /> Second Chance Hiring Program
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Partner with HOH to Hire<br /><span className="text-amber-400">Austin's Most Motivated Workers</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Headquarters of Hope connects Austin employers with pre-screened, job-ready candidates from our reentry, recovery, and veteran programs. Our candidates are coached, motivated, and supported through their first 90 days.
          </p>
          <Button onClick={() => setStep(2)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-lg px-8 py-6 gap-2">
            Join Our Employer Network <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">Why Partner with HOH?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {BENEFITS.map((b, i) => (
            <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 flex gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                <b.icon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{b.title}</h3>
                <p className="text-sm text-slate-400">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-[#161B22] border border-amber-500/20 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready to make a difference while growing your team?</h3>
          <p className="text-slate-400 mb-6">Join 50+ Austin employers already partnering with Headquarters of Hope.</p>
          <Button onClick={() => setStep(2)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 gap-2">
            Register Your Company <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="border-b border-[#30363D] bg-[#161B22]">
        <div className="px-6 py-6 max-w-2xl mx-auto flex items-center gap-3">
          <Building2 className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="font-bold text-white">Employer Registration</h1>
            <p className="text-xs text-slate-400">Your profile will be reviewed before going live</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <Section title="Company Information">
          <Field label="Company Name *" value={form.company_name} onChange={v => set('company_name', v)} required />
          <Row>
            <Field label="Industry" value={form.industry} onChange={v => set('industry', v)} />
            <Field label="Company Size" value={form.company_size} onChange={v => set('company_size', v)} type="select" options={['1-10','11-50','51-200','201-500','500+']} />
          </Row>
          <Row>
            <Field label="City" value={form.headquarters_city} onChange={v => set('headquarters_city', v)} />
            <Field label="State" value={form.headquarters_state} onChange={v => set('headquarters_state', v)} />
          </Row>
          <Field label="Website" value={form.website} onChange={v => set('website', v)} />
        </Section>

        <Section title="Hiring Contact">
          <Field label="Contact Name *" value={form.hiring_contact_name} onChange={v => set('hiring_contact_name', v)} required />
          <Row>
            <Field label="Email *" value={form.hiring_contact_email} onChange={v => set('hiring_contact_email', v)} type="email" required />
            <Field label="Phone" value={form.hiring_contact_phone} onChange={v => set('hiring_contact_phone', v)} />
          </Row>
        </Section>

        <Section title="Second Chance Commitment">
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <input
              type="checkbox"
              id="sc"
              checked={form.is_second_chance_employer}
              onChange={e => set('is_second_chance_employer', e.target.checked)}
              className="mt-1 accent-amber-500"
            />
            <label htmlFor="sc" className="text-sm text-slate-300 cursor-pointer">
              <span className="font-semibold text-amber-400">I commit to being a Second Chance employer</span>
              <br />We will consider candidates with criminal records on a case-by-case basis and not use background checks as an automatic disqualifier.
            </label>
          </div>
          {form.is_second_chance_employer && (
            <textarea
              value={form.second_chance_policy_description}
              onChange={e => set('second_chance_policy_description', e.target.value)}
              placeholder="Describe your background check policy and how you evaluate candidates with records..."
              rows={3}
              className="w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 resize-none"
            />
          )}
        </Section>

        <Section title="Worksite Accessibility">
          <Row>
            <Checkbox label="Bus Route Accessible" checked={form.transportation_accessible} onChange={v => set('transportation_accessible', v)} />
            <Checkbox label="Onsite Parking" checked={form.onsite_parking} onChange={v => set('onsite_parking', v)} />
          </Row>
        </Section>

        <Section title="Hiring Policies">
          <Field label="Background Check Policy" value={form.background_check_policy} onChange={v => set('background_check_policy', v)} placeholder="e.g. 7-year lookback, no auto-disqualification" />
          <Field label="Drug Test Policy" value={form.drug_test_policy} onChange={v => set('drug_test_policy', v)} placeholder="e.g. Pre-employment only, safety-sensitive positions" />
        </Section>

        <Section title="Message to HOH Team">
          <textarea
            value={form.signup_message}
            onChange={e => set('signup_message', e.target.value)}
            placeholder="Tell us about your hiring needs, the types of roles you're looking to fill, and what makes your company a great place for second-chance employees..."
            rows={4}
            className="w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </Section>

        <div className="flex items-center gap-3 pt-4 border-t border-[#30363D]">
          <button type="button" onClick={() => setStep(1)} className="text-slate-400 hover:text-white text-sm">← Back</button>
          <Button type="submit" disabled={loading || !form.company_name || !form.hiring_contact_name || !form.hiring_contact_email} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">{title}</h3>
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, onChange, type = 'text', required, placeholder, options }) {
  const cls = "w-full bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50";
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
          <option value="">Select...</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-amber-500" />
      {label}
    </label>
  );
}