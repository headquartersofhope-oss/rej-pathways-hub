import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, AlertTriangle, Calendar, BookOpen,
  Briefcase, TrendingUp, Clock, UserCheck
} from 'lucide-react';

export default function StaffDashboard({ user }) {
  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.filter(
      user?.organization_id ? { organization_id: user.organization_id } : {}
    ),
  });

  const activeResidents = residents.filter(r => r.status === 'active');
  const highRisk = residents.filter(r => r.risk_level === 'high');
  const employed = residents.filter(r => r.status === 'employed');

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's your program overview for today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Residents" value={activeResidents.length} icon={Users} trend={5} />
        <StatCard title="High Risk" value={highRisk.length} icon={AlertTriangle} subtitle="Need attention" />
        <StatCard title="Employed" value={employed.length} icon={Briefcase} trend={12} />
        <StatCard title="Job Ready" value={residents.filter(r => (r.job_readiness_score || 0) >= 70).length} icon={UserCheck} subtitle="Score ≥ 70" />
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* High Risk Residents */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">High-Risk Residents</h3>
            <Badge variant="destructive" className="text-xs">{highRisk.length}</Badge>
          </div>
          <div className="space-y-3">
            {highRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No high-risk residents</p>
            ) : (
              highRisk.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-semibold text-destructive">
                    {r.first_name?.[0]}{r.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.preferred_name || r.first_name} {r.last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.barriers?.length || 0} barriers identified</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">High</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Today's Appointments</h3>
            <Badge variant="secondary" className="text-xs">3 scheduled</Badge>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Marcus J.', time: '10:00 AM', type: 'Intake Assessment' },
              { name: 'Sarah W.', time: '11:30 AM', type: 'Case Plan Review' },
              { name: 'Devon K.', time: '2:00 PM', type: 'Exit Planning' },
            ].map((apt, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {apt.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{apt.name}</p>
                  <p className="text-xs text-muted-foreground">{apt.type}</p>
                </div>
                <span className="text-xs text-muted-foreground font-medium">{apt.time}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Placement Pipeline */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Placement Pipeline</h3>
          <div className="space-y-3">
            {[
              { stage: 'Interview Scheduled', count: 4, color: 'bg-blue-500' },
              { stage: 'Awaiting Offer', count: 2, color: 'bg-amber-500' },
              { stage: 'Placed This Month', count: 7, color: 'bg-accent' },
              { stage: 'Retained 90+ Days', count: 12, color: 'bg-emerald-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="flex-1 text-sm text-muted-foreground">{item.stage}</span>
                <span className="font-heading font-bold text-sm">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Overdue Tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Overdue Tasks</h3>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">5 overdue</Badge>
          </div>
          <div className="space-y-3">
            {[
              { task: 'Complete intake for Devon K.', due: '2 days ago' },
              { task: 'Submit quarterly report', due: '3 days ago' },
              { task: 'Review Marcus J. case plan', due: '1 day ago' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Clock className="w-4 h-4 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.task}</p>
                  <p className="text-xs text-destructive">{t.due}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}