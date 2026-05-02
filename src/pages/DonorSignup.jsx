import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DonorSignup
 * Route: /donate/signup (public, no auth required)
 *
 * Public form that creates a Donor record + sends welcome email.
 * After signup, donors will be able to give via Stripe Checkout once keys are added.
 */
export default function DonorSignup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    donor_name: '',
    email: '',
    phone: '',
    donor_type: 'individual',
    interest_areas: [],
    notes: '',
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleInterest = (area) => {
    setForm(prev => ({
      ...prev,
      interest_areas: prev.interest_areas.includes(area)
        ? prev.interest_areas.filter(a => a !== area)
        : [...prev.interest_areas, area],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.donor_name || !form.email) {
      toast.error('Please fill in your name and email');
      return;
    }
    setSubmitting(true);
    try {
      const result = await base44.functions.invoke('processDonorSignup', form);
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
          <h2 className="text-2xl font-heading font-bold mb-2">Welcome to the family</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for joining the Headquarters of Hope donor community. Check your inbox for a welcome message.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">Return Home</Button>
        </Card>
      </div>
    );
  }

  const interestOptions = [
    'Reentry programs',
    'Recovery / addiction',
    'Veterans',
    'Housing / shelter',
    'Job training',
    'Education',
    'Youth',
    'Family reunification',
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
            <Heart className="w-6 h-6 text-slate-900" />
          </div>
          <h1 className="text-3xl font-heading font-bold mb-2">Become a Supporter</h1>
          <p className="text-muted-foreground">
            Every gift directly funds second chances. Tell us a bit about yourself.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.donor_name}
                  onChange={(e) => update('donor_name', e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="jane@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <Label htmlFor="type">I'm giving as a...</Label>
                <select
                  id="type"
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                  value={form.donor_type}
                  onChange={(e) => update('donor_type', e.target.value)}
                >
                  <option value="individual">Individual</option>
                  <option value="corporation">Business</option>
                  <option value="foundation">Foundation</option>
                  <option value="government">Government / Agency</option>
                  <option value="organization">Other organization</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">What programs interest you most? (select any)</Label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(area => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleInterest(area)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.interest_areas.includes(area)
                        ? 'bg-amber-500 border-amber-500 text-slate-900 font-semibold'
                        : 'bg-background border-muted hover:border-amber-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Anything else you'd like us to know? (optional)</Label>
              <textarea
                id="notes"
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background min-h-[80px]"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="How you heard about us, why you care, etc."
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2"
              size="lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              Join the Donor Community
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-2">
              We never sell your info. Headquarters of Hope is a 501(c)(3) nonprofit. All donations are tax-deductible.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
