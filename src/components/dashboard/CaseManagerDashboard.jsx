import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import StatCard from '@/components/shared/StatCard';
import QuickAction from '@/components/shared/QuickAction';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ResidentCard from '@/components/shared/ResidentCard';
import { format, isPast, isToday, parseISO } from 'date-fns';
import {
  Users, AlertTriangle, Calendar, CheckCircle2,
  Clock, FileWarning, AlertCircle, GraduationCap, Briefcase
} from 'lucide-react';
import { filterResidentsByAccess } from '@/lib/rbac';

export default function CaseManagerDashboard({ user }) {
  const { data: allResidents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.ServiceTask.list('-created_date', 100),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 50),
  });

  // Case managers see only their caseload
  const residents = filterResidentsByAccess(allResidents, user);
  const activeResidents = residents.filter(r => r.status === 'active');
  const highRisk = residents.filter(r => r.risk_level === 'high');
  const employed = residents.filter(r => r.status === 'employed');

  // Tasks for caseload only
  const caseloadResidentIds = new Set(residents.map(r => r.id));
  const myTasks = allTasks.filter(t => caseloadResidentIds.has(t.resident_id));
  const overdueTasks = myTasks.filter(t =>
    t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed'
  );

  // Appointments for caseload
  const myAppointments = allAppointments.filter(a => caseloadResidentIds.has(a.resident_id));
  const todayApts = myAppointments.filter(a => a.date && isToday(parseISO(a.date)));

  // Residents needing attention
  const needingAttention = residents.filter(r =>
    r.risk_level === 'high' || (r.barriers?.length || 0) >= 3
  );

  const residentName = (residentId) => {
    const r = residents.find(r => r.id === residentId);
    return r ? `${r.preferred_name || r.first_name} ${r.last_name}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's your caseload summary for today.
        </p>
      </div>

      {/* Caseload Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Caseload" value={activeResidents.length} icon={Users} />
        <StatCard title="High Risk" value={highRisk.length} icon={AlertTriangle} subtitle="Need attention" />
        <StatCard title="Due Today" value={overdueTasks.length} icon={Clock} subtitle="Tasks" />
        <StatCard title="Employed" value={employed.length} icon={Briefcase} />
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Residents Needing Attention */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Needs Attention
            </h3>
            <Badge variant="destructive" className="text-xs">{needingAttention.length}</Badge>
          </div>
          <div className="space-y-2">
            {needingAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All residents on track</p>
            ) : (
              needingAttention.slice(0, 5).map((r) => (
                <Link key={r.id} to={`/residents/${r.id}`}>
                  <div className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <ResidentCard
                      resident={r}
                      variant="summary"
                      showJobReadiness={false}
                      showPopulation={false}
                      showRisk={true}
                      className="p-2"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Today's Appointments */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Today's Schedule
            </h3>
            <Badge variant="secondary" className="text-xs">{todayApts.length} scheduled</Badge>
          </div>
          <div className="space-y-2">
            {todayApts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointments today</p>
            ) : (
              todayApts.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">{residentName(apt.resident_id)} · {apt.time || ''}</p>
                  </div>
                  <Badge className="text-[10px] bg-blue-50 text-blue-700">{apt.status}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Overdue Tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-destructive" /> Overdue Tasks
            </h3>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">{overdueTasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No overdue tasks</p>
            ) : (
              overdueTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Clock className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-destructive">
                      Due {t.due_date ? format(parseISO(t.due_date), 'MMM d') : ''} · {residentName(t.resident_id)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Job Readiness Blockers */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-amber-500" /> Job Readiness Blockers
            </h3>
          </div>
          <div className="space-y-2">
            {residents.filter(r => (r.barriers?.length || 0) >= 1).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No blockers identified</p>
            ) : (
              residents.filter(r => (r.barriers?.length || 0) >= 1).slice(0, 5).map(r => (
                <Link key={r.id} to={`/residents/${r.id}`}>
                  <div className="p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <ResidentCard
                      resident={r}
                      variant="summary"
                      showJobReadiness={false}
                      showPopulation={false}
                      showRisk={false}
                      className="p-2"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm px-1">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <QuickAction icon={Users} label="View My Caseload" description={`${activeResidents.length} residents`} to="/residents" colorClass="bg-primary/10 text-primary" />
          <QuickAction icon={CheckCircle2} label="Case Management" description="Tasks & plans" to="/case-management" colorClass="bg-emerald-50 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}