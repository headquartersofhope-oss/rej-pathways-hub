import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

/**
 * EmergencyShelterForm
 * Route: /emergency-shelter/new (staff only)
 *
 * Lets staff add a new emergency shelter, hotel partnership, or warming center
 * to the available inventory. These show up in the housing dispatch flow when
 * a resident has 'no stable housing' and needs an immediate placement.
 */
export default function EmergencyShelterForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    shelter_type: 'emergency_shelter',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    contact_name: '',
    contact_email: '',
    total_capacity: '',
    available_beds: '',
    rate_per_night: '',
    billing_type: 'voucher_program',
    populations_served: [],
    intake_hours: '',
    intake_requirements: '',
    max_stay_nights: '',
    accepts_pets: false,
    accepts_couples: false,
    is_active: true,
    notes: '',
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const togglePopulation = (pop) => {
    setForm(prev => ({
      ...prev,
      populations_served: prev.populations_served.includes(pop)
        ? prev.populations_served.filter(p => p !== pop)
        : [...prev.populations_served, pop],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.shelter_type) {
      toast.error('Name and shelter type are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        total_capacity: form.total_capacity ? Number(form.total_capacity) : null,
        available_beds: form.available_beds ? Number(form.available_beds) : null,
        rate_per_night: form.rate_per_night ? Number(form.rate_per_night) : null,
        max_stay_nights: form.max_stay_nights ? Number(form.max_stay_nights) : null,
      };
      await base44.entities.EmergencyShelter.create(payload);
      toast.success('Emergency shelter added to inventory');
      navigate('/housing');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const populationOptions = ['adults', 'families', 'women_only', 'men_only', 'youth', 'veterans', 'lgbtq', 'reentry', 'recovery', 'all'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto pb-20">
      <button
        onClick={() => navigate('/housing')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Housing Operations
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-amber-600" /> Add Emergency Shelter / Hotel Partnership
        </h1>
        <p className="text-sm text-muted-foreground">
          Use this for hotels, warming centers, DV shelters, or any emergency housing partner. These appear in the dispatch flow when residents need immediate placement.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Hope House Hotel Partnership" required />
            </div>
            <div>
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                value={form.shelter_type}
                onChange={(e) => update('shelter_type', e.target.value)}
              >
                <option value="hotel">Hotel Partnership</option>
                <option value="emergency_shelter">Emergency Shelter</option>
                <option value="warming_center">Warming Center</option>
                <option value="cooling_center">Cooling Center</option>
                <option value="domestic_violence_shelter">DV Shelter</option>
                <option value="youth_shelter">Youth Shelter</option>
                <option value="family_shelter">Family Shelter</option>
                <option value="veteran_shelter">Veteran Shelter</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main St" />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="TX" maxLength={2} />
            </div>
            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={form.zip_code} onChange={(e) => update('zip_code', e.target.value)} placeholder="77001" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 555-5555" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="capacity">Total Capacity (beds)</Label>
              <Input id="capacity" type="number" min="0" value={form.total_capacity} onChange={(e) => update('total_capacity', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="available">Currently Available</Label>
              <Input id="available" type="number" min="0" value={form.available_beds} onChange={(e) => update('available_beds', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="max_stay">Max Stay (nights)</Label>
              <Input id="max_stay" type="number" min="0" value={form.max_stay_nights} onChange={(e) => update('max_stay_nights', e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rate">Rate per Night ($)</Label>
              <Input id="rate" type="number" min="0" step="0.01" value={form.rate_per_night} onChange={(e) => update('rate_per_night', e.target.value)} placeholder="0 for free / voucher" />
            </div>
            <div>
              <Label htmlFor="billing">Billing</Label>
              <select
                id="billing"
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                value={form.billing_type}
                onChange={(e) => update('billing_type', e.target.value)}
              >
                <option value="voucher_program">Voucher Program</option>
                <option value="paid_partnership">Paid Partnership (we pay them)</option>
                <option value="free_referral">Free Referral</option>
                <option value="donation_based">Donation-based</option>
                <option value="government_funded">Government Funded</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Populations Served</Label>
            <div className="flex flex-wrap gap-2">
              {populationOptions.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePopulation(p)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    form.populations_served.includes(p)
                      ? 'bg-amber-500 border-amber-500 text-slate-900 font-semibold'
                      : 'bg-background border-muted hover:border-amber-300'
                  }`}
                >
                  {p.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours">Intake Hours</Label>
              <Input id="hours" value={form.intake_hours} onChange={(e) => update('intake_hours', e.target.value)} placeholder="e.g. 24/7 or Daily 4pm-9am" />
            </div>
            <div>
              <Label htmlFor="req">Intake Requirements</Label>
              <Input id="req" value={form.intake_requirements} onChange={(e) => update('intake_requirements', e.target.value)} placeholder="e.g. ID required, sober" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.accepts_pets} onChange={(e) => update('accepts_pets', e.target.checked)} />
              Accepts pets
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.accepts_couples} onChange={(e) => update('accepts_couples', e.target.checked)} />
              Accepts couples
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} />
              Active (shows in dispatch flow)
            </label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full mt-2 px-3 py-2 border rounded-md bg-background min-h-[80px]"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Special instructions, contact preferences, partnership terms..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Shelter
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/housing')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
