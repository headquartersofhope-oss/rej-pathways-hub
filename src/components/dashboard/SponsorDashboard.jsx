import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Calendar, MessageSquare, AlertTriangle, CheckCircle2, Phone, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * SponsorDashboard
 * Shown to users with role === 'sponsor' (recovery sponsors / accountability partners).
 * Currently uses mock data for the sponsoree relationship and milestones.
 * Once a Sponsor + Sponsoree linkage entity is seeded, replace MOCK blocks with real queries
 * via base44.entities and base44.functions.
 */
export default function SponsorDashboard({ user }) {
  // ---- MOCK DATA ----
  // Replace with: const { data: sponsoree } = useQuery({ queryKey: ['sponsoree', user?.sponsoree_resident_id], ... })
  const sponsoree = user?.sponsoree_resident_id ? {
    name: 'Sponsoree',
    sobriety_days: 87,
    current_step: 4,
    last_check_in: '2 days ago',
    program_status: 'on_track',
    next_meeting: 'Tomorrow, 7:00 PM',
  } : {
    // Demo fallback so the dashboard is screenshot-ready even before real linking exists
    name: 'Demo Sponsoree',
    sobriety_days: 87,
    current_step: 4,
    last_check_in: '2 days ago',
    program_status: 'on_track',
    next_meeting: 'Tomorrow, 7:00 PM',
  };

  const recentMessages = [
    { id: 1, from: 'sponsoree', preview: 'Made it through a hard day. Going to a meeting tonight.', time: '2 hours ago' },
    { id: 2, from: 'me', preview: 'Proud of you. Keep going — one day at a time.', time: '2 hours ago' },
    { id: 3, from: 'sponsoree', preview: 'Step 4 inventory done. Want to talk through it Sunday?', time: 'Yesterday' },
  ];

  const milestones = [
    { id: 1, label: '30 Days Sober', date: 'Mar 1, 2026', achieved: true },
    { id: 2, label: '60 Days Sober', date: 'Mar 31, 2026', achieved: true },
    { id: 3, label: '90 Days Sober', date: 'Apr 30, 2026', achieved: false, in_progress: true },
    { id: 4, label: 'Step 4 Complete', date: 'Apr 28, 2026', achieved: true },
  ];

  const alerts = []; // populate when crisis flags / missed check-ins detected

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold">
            Welcome, {user?.full_name?.split(' ')[0] || 'Sponsor'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Recovery Sponsor Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Call
          </Button>
          <Link to="/messages">
            <Button size="sm" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </Button>
          </Link>
        </div>
      </div>

      {alerts.length > 0 && (
        <Card className="p-4 border-orange-300 bg-orange-50 dark:bg-orange-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">Attention Needed</p>
              <p className="text-xs text-orange-700 dark:text-orange-200 mt-1">
                {alerts.map(a => a.message).join(' · ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Sobriety Days" value={sponsoree.sobriety_days} icon={Award} />
        <StatCard title="Current Step" value={`Step ${sponsoree.current_step}`} icon={TrendingUp} />
        <StatCard title="Last Check-in" value={sponsoree.last_check_in} icon={CheckCircle2} />
        <StatCard title="Program Status" value="On Track" icon={Heart} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">My Sponsoree</h3>
            <Badge className="text-[10px] bg-green-100 text-green-800 border-0">Active</Badge>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{sponsoree.name}</p>
                <p className="text-xs text-muted-foreground">{sponsoree.sobriety_days} days sober · Working step {sponsoree.current_step}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              <Calendar className="w-3.5 h-3.5" />
              <span>Next meeting: <span className="font-medium text-foreground">{sponsoree.next_meeting}</span></span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Recent Communication</h3>
            <Link to="/messages">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                <MessageSquare className="w-3 h-3" /> Open
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentMessages.map(m => (
              <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.from === 'me' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <MessageSquare className={`w-3.5 h-3.5 ${m.from === 'me' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{m.from === 'me' ? 'You' : sponsoree.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.preview}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{m.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Recovery Milestones</h3>
          </div>
          <div className="space-y-2">
            {milestones.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.achieved ? 'bg-green-100 dark:bg-green-950' : m.in_progress ? 'bg-amber-100 dark:bg-amber-950' : 'bg-muted'}`}>
                  {m.achieved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.date}</p>
                </div>
                <Badge className={`text-[10px] border-0 ${m.achieved ? 'bg-green-100 text-green-800' : m.in_progress ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>
                  {m.achieved ? 'Achieved' : m.in_progress ? 'In Progress' : 'Upcoming'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
