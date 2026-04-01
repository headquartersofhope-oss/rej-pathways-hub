import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import StatCard from '@/components/shared/StatCard';
import QuickAction from '@/components/shared/QuickAction';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, Users, MapPin, Briefcase, Shield,
  Settings, BarChart3, AlertTriangle, FileText, TrendingUp
} from 'lucide-react';
import { MODULES } from '@/lib/modules';

export default function AdminDashboard({ user }) {
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: employers = [] } = useQuery({
    queryKey: ['employers'],
    queryFn: () => base44.entities.Employer.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['recent-audit'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 5),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            Admin Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organization overview and platform management.
          </p>
        </div>
        <Link to="/modules">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" /> Module Settings
          </Button>
        </Link>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Organizations" value={orgs.length} icon={Building2} />
        <StatCard title="Sites" value={sites.length} icon={MapPin} />
        <StatCard title="Residents" value={residents.length} icon={Users} trend={8} />
        <StatCard title="Employers" value={employers.length} icon={Briefcase} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Outcome Highlights */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-sm mb-4">Outcome Highlights</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Employment Rate', value: '67%', trend: '+4%' },
              { label: 'Housing Retention', value: '82%', trend: '+2%' },
              { label: 'Recidivism Rate', value: '12%', trend: '-3%' },
              { label: 'Avg Time to Placement', value: '34 days', trend: '-5d' },
            ].map((m, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="font-heading text-xl font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                <p className="text-xs font-medium text-accent mt-0.5">{m.trend}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Audit Activity</h3>
            <Link to="/audit-logs">
              <Button variant="ghost" size="sm" className="text-xs h-7">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    log.severity === 'critical' ? 'bg-destructive' :
                    log.severity === 'warning' ? 'bg-amber-500' : 'bg-accent'
                  }`} />
                  <div>
                    <p className="text-xs font-medium">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground">{log.user_email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Active Modules */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-sm">Platform Modules</h3>
          <Link to="/modules">
            <Button variant="ghost" size="sm" className="text-xs h-7">Configure</Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.slug}
                to={`/module/${mod.slug}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-sm transition-all text-center"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium">{mod.name}</p>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Admin Quick Actions */}
      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm px-1">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <QuickAction icon={Users} label="Manage Users" description="Invite, edit, or deactivate" to="/users" colorClass="bg-primary/10 text-primary" />
          <QuickAction icon={BarChart3} label="Generate Report" description="Outcomes & compliance" to="/module/outcomes_reporting" colorClass="bg-teal-50 text-teal-600" />
          <QuickAction icon={Shield} label="View Audit Logs" description="Security & compliance" to="/audit-logs" colorClass="bg-slate-100 text-slate-600" />
          <QuickAction icon={FileText} label="Export Data" description="CSV & PDF exports" to="/module/outcomes_reporting" colorClass="bg-purple-50 text-purple-600" />
        </div>
      </div>
    </div>
  );
}