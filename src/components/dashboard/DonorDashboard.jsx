import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Briefcase, Home, TrendingUp, Calendar, FileText, DollarSign, Gift, Star } from 'lucide-react';

/**
 * DonorDashboard
 * Shown to users with role === 'donor'.
 * Currently uses mock data for impact metrics, giving history, and stories.
 * Once Donor + Donation entities are seeded, replace MOCK blocks with real queries
 * via base44.entities.Donor.filter({ user_id: user.id }) and similar.
 */
export default function DonorDashboard({ user }) {
  // ---- MOCK DATA ----
  // Replace with: const { data: impact } = useQuery({ queryKey: ['donor-impact', user?.donor_id], ... })
  const impact = {
    total_given: 2500,
    residents_supported: 12,
    jobs_placed: 8,
    housing_days_funded: 340,
    success_rate: 92,
  };

  const givingHistory = [
    { id: 1, date: 'Apr 1, 2026', amount: 250, type: 'Recurring Monthly', receipt: true },
    { id: 2, date: 'Mar 1, 2026', amount: 250, type: 'Recurring Monthly', receipt: true },
    { id: 3, date: 'Feb 14, 2026', amount: 500, type: 'Special Gift', receipt: true },
    { id: 4, date: 'Feb 1, 2026', amount: 250, type: 'Recurring Monthly', receipt: true },
    { id: 5, date: 'Dec 25, 2025', amount: 1000, type: 'Year-End Gift', receipt: true },
  ];

  const stories = [
    { id: 1, title: 'James found his footing in 90 days', preview: 'After 14 years inside, James walked into Headquarters of Hope and started over...', date: 'Apr 2026' },
    { id: 2, title: 'Maria moved from a shelter to her own apartment', preview: 'In 6 months, Maria stabilized her sobriety, found work, and signed her first lease.', date: 'Mar 2026' },
  ];

  const events = [
    { id: 1, title: 'Annual Fundraising Gala', date: 'Jun 15, 2026', location: 'Houston, TX' },
    { id: 2, title: 'Quarterly Donor Tour', date: 'May 20, 2026', location: 'Headquarters of Hope House' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold">
            Welcome, {user?.full_name?.split(' ')[0] || 'Friend'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your impact at a glance</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Gift className="w-3.5 h-3.5" /> Give Now
        </Button>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Your total giving impact</p>
            <p className="text-3xl font-heading font-bold">${impact.total_given.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              You've helped support <span className="font-semibold text-foreground">{impact.residents_supported} people</span> on their reentry journey.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="People Helped" value={impact.residents_supported} icon={Users} />
        <StatCard title="Jobs Placed" value={impact.jobs_placed} icon={Briefcase} />
        <StatCard title="Housing Days Funded" value={impact.housing_days_funded} icon={Home} />
        <StatCard title="Success Rate" value={`${impact.success_rate}%`} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Your Giving History</h3>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
              <FileText className="w-3 h-3" /> Tax Receipts
            </Button>
          </div>
          <div className="space-y-2">
            {givingHistory.map(g => (
              <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">${g.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{g.date} · {g.type}</p>
                </div>
                {g.receipt && (
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2">
                    Receipt
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Stories You've Helped Write</h3>
          </div>
          <div className="space-y-3">
            {stories.map(s => (
              <div key={s.id} className="p-3 rounded-lg bg-muted/40">
                <div className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.preview}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Upcoming Events</h3>
          </div>
          <div className="space-y-2">
            {events.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.date} · {e.location}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs">RSVP</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
