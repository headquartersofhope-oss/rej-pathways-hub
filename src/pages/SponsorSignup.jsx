import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SponsorSignup
 * Route: /sponsor/signup (public, no auth required)
 *
 * Public form for people applying to sponsor someone in the program.
 * Creates a Sponsor record with status='pending_approval' — admin must approve
 * + complete background check + match to sponsoree.
 */
export default function SponsorSignup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    sponsor_name: '',
    email: '',
    phone: '',
    sponsorship_type: 'recovery_general',
    sobriety_date: '',
    years_sober: '',
    home_group: '',
    experience_with: [],
    availability: '',
    preferred_contact_method: 'phone',
    notes: '',
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleExperience = (exp) => {
    setForm(prev => ({
      ...prev,
      experience_with: prev.experience_with.includes(exp)
        ? prev.experience_with.filter(e => e !== exp)
        : [...prev.experience_with, exp],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sponsor_name || !form.email) {
      toast.error('Please fill in your name and email');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        years_sober: form.years_sober ? Number(form.years_sober) : null,
        sobriety_date: form.sobriety_date || null,
      };
      const result = await base44.functions.invoke('processSponsorSignup', payload);
      if (result?.success) {
        setSubmitted(true);
      } else {
        throw new Error(result?.error || 'Something went wrong');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-background to-amber-50">
        <Card className="max-w-md w-full p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-2">Application Received</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for stepping up. Watch your inbox for next steps over the next 1-7 business days.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">Return Home</Button>
        </Card>
      </div>
    );
  }

  const experienceOptions = [
    'Incarceration / reentry',
    'Addiction / recovery',
    'Homelessness',
    'Veteran service',
    'Domestic violence',
    'Foster care',
    'Mental health',
    'Other',
  ];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-amber-50 via-background to-amber-50">
      <div className="max-w-2xl mx-auto py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
            <Users className="w-6 h-6 text-slate-900" />
          </div>
          <h1 className="text-3xl font-heading font-bold mb-2">Become a Sponsor</h1>
          <p className="text-muted-foreground">
            Walk alongside someone who's rebuilding their life. Share your experience. Make a difference.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={form.sponsor_name} onChange={(e) => update('sponsor_name', e.target.value)} placeholder="John Smith" required />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@example.com" required />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 555-5555" />
              </div>
              <div>
                <Label htmlFor="type">Sponsorship Type</Label>
                <select
                  id="type"
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                  value={form.sponsorship_type}
                  onChange={(e) => update('sponsorship_type', e.target.value)}
                >
                  <option value="recovery_12step">Recovery (12-step)</option>
                  <option value="recovery_general">Recovery (general)</option>
                  <option value="reentry_peer">Reentry peer</option>
                  <option value="mentorship">Mentorship</option>
                  <option value="professional">Professional</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {(form.sponsorship_type.startsWith('recovery')) && (
              <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div>
                  <Label htmlFor="sobriety_date">Sobriety Date (optional)</Label>
                  <Input id="sobriety_date" type="date" value={form.sobriety_date} onChange={(e) => update('sobriety_date', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="years">Years Sober</Label>
                  <Input id="years" type="number" min="0" step="0.5" value={form.years_sober} onChange={(e) => update('years_sober', e.target.value)} placeholder="5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="home_group">Home Group (AA/NA, optional)</Label>
                  <Input id="home_group" value={form.home_group} onChange={(e) => update('home_group', e.target.value)} placeholder="e.g. Tuesday Night Big Book" />
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">What lived experience can you bring? (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {experienceOptions.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => toggleExperience(exp)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.experience_with.includes(exp)
                        ? 'bg-amber-500 border-amber-500 text-slate-900 font-semibold'
                        : 'bg-background border-muted hover:border-amber-300'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Input id="availability" value={form.availability} onChange={(e) => update('availability', e.target.value)} placeholder="e.g. Evenings + weekends" />
              </div>
              <div>
                <Label htmlFor="contact">Preferred Contact</Label>
                <select
                  id="contact"
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                  value={form.preferred_contact_method}
                  onChange={(e) => update('preferred_contact_method', e.target.value)}
                >
                  <option value="phone">Phone</option>
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="video">Video call</option>
                  <option value="in_person">In person</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Why do you want to sponsor? (optional)</Label>
              <textarea
                id="notes"
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background min-h-[100px]"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Tell us a little about your journey and why you want to give back."
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2" size="lg">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Submit Application
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-2">
              All sponsors complete a background check before being matched.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
