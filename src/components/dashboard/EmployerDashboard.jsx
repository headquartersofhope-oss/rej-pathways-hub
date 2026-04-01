import React from 'react';
import StatCard from '@/components/shared/StatCard';
import QuickAction from '@/components/shared/QuickAction';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Users, Calendar, CheckCircle2, UserCheck, Clock } from 'lucide-react';

export default function EmployerDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          Employer Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your job postings and review candidates.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Open Positions" value="3" icon={Briefcase} />
        <StatCard title="Candidates" value="12" subtitle="In review" icon={Users} />
        <StatCard title="Interviews" value="4" subtitle="This week" icon={Calendar} />
        <StatCard title="Placements" value="8" subtitle="Total" icon={CheckCircle2} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Candidate Shortlist */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Candidate Shortlist</h3>
            <Badge variant="secondary" className="text-xs">5 new</Badge>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Marcus J.', role: 'Warehouse Associate', readiness: 85, status: 'Ready' },
              { name: 'Sarah W.', role: 'Administrative Assistant', readiness: 72, status: 'In Progress' },
              { name: 'Devon K.', role: 'Maintenance Tech', readiness: 90, status: 'Ready' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {c.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.role} • {c.readiness}% ready</p>
                </div>
                <Badge variant={c.status === 'Ready' ? 'default' : 'outline'} className="text-xs">
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Interview Schedule */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Upcoming Interviews</h3>
          <div className="space-y-3">
            {[
              { name: 'Marcus J.', date: 'Tomorrow, 10:00 AM', position: 'Warehouse Associate' },
              { name: 'Devon K.', date: 'Wed, 2:00 PM', position: 'Maintenance Tech' },
            ].map((int, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{int.name}</p>
                  <p className="text-xs text-muted-foreground">{int.position}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{int.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm px-1">Quick Actions</h3>
        <QuickAction icon={Briefcase} label="Post a New Job" description="Create a job listing" to="/module/employer_portal" colorClass="bg-primary/10 text-primary" />
        <QuickAction icon={UserCheck} label="Review Candidates" description="12 pending review" to="/module/job_matching" colorClass="bg-amber-50 text-amber-600" />
      </div>
    </div>
  );
}