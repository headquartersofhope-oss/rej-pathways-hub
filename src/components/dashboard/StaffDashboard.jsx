import React from 'react';
import { deriveIntakeStatus } from '@/lib/intakeStatus';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format, isPast, isToday, parseISO } from 'date-fns';
import {
  Users, AlertTriangle, Calendar, Briefcase,
  Clock, UserCheck, FileWarning, AlertCircle, GraduationCap, Award
} from 'lucide-react';

const severityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-red-100 text-red-800',
};

export default function StaffDashboard({ user }) {
  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.filter(
      user?.organization_id ? { organization_id: user.organization_id } : {}
    ),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.ServiceTask.list('-created_date', 100),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 50),
  });

  const { data: recentIncidents = [] } = useQuery({
    queryKey: ['recent-incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date', 20),
  });

  const { data: recentEnrollments = [] } = useQuery({
    queryKey: ['recent-enrollments'],
    queryFn: () => base44.entities.ClassEnrollment.list('-created_date', 50),
  });

  const { data: learningClasses = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 100),
  });

  const activeResidents = residents.filter(r => r.status === 'active');
  const highRisk = residents.filter(r => r.risk_level === 'high');
  const employed = residents.filter(r => r.status === 'employed');

  // Overdue tasks: past due date, not completed
  const overdueTasks = allTasks.filter(t =>
    t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed'
  );

  // Today's appointments
  const todayApts = allAppointments.filter(a => a.date && isToday(parseISO(a.date)));

  // Missed appointments
  const missedApts = allAppointments.filter(a => a.status === 'missed');

  // High barrier residents (3+ active barriers)
  const highBarrierResidents = residents.filter(r => (r.barriers?.length || 0) >= 3);

  // Learning stats
  const classMap = Object.fromEntries(learningClasses.map(c => [c.id, c]));
  const recentCompletions = recentEnrollments.filter(e => e.status === 'completed').slice(0, 5);
  const noShowAlerts = recentEnrollments.filter(e => e.status === 'no_show').slice(0, 5);

  // Residents needing attention: high risk OR no intake completed yet
  const needingAttention = residents.filter(r =>
    r.risk_level === 'high' ||
    r.status === 'pre_intake' ||
    (!r.intake_date && deriveIntakeStatus({ resident: r }) !== 'completed')
  );

  // Get resident name by id
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
          Here's your program overview for today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Residents" value={activeResidents.length} icon={Users} trend={5} />
        <StatCard title="High Risk" value={highRisk.length} icon={AlertTriangle} subtitle="Need attention" />
        <StatCard title="Overdue Tasks" value={overdueTasks.length} icon={Clock} subtitle="Past due" />
        <StatCard title="Employed" value={employed.length} icon={Briefcase} trend={12} />
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
              <p className="text-sm text-muted-foreground py-4 text-center">No residents flagged</p>
            ) : (
              needingAttention.slice(0, 5).map((r) => (
                <Link key={r.id} to={`/residents/${r.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-semibold text-destructive">
                      {r.first_name?.[0]}{r.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.preferred_name || r.first_name} {r.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.status === 'pre_intake' ? 'No intake completed' : `${r.barriers?.length || 0} barriers`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${r.risk_level === 'high' ? 'border-destructive/30 text-destructive' : ''}`}>
                      {r.risk_level || r.status}
                    </Badge>
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
                  <Badge className={`text-[10px] ${apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                    {apt.status}
                  </Badge>
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

        {/* Recent Incidents */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Recent Incidents
            </h3>
            <Badge variant="outline" className="text-xs">{recentIncidents.length} total</Badge>
          </div>
          <div className="space-y-2">
            {recentIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No incidents reported</p>
            ) : (
              recentIncidents.slice(0, 5).map((inc) => (
                <div key={inc.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Badge className={`text-[10px] flex-shrink-0 mt-0.5 ${severityColors[inc.severity] || ''}`}>{inc.severity}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inc.incident_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{residentName(inc.resident_id)} · {inc.date ? format(parseISO(inc.date), 'MMM d') : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Learning alerts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" /> Recent Completions
            </h3>
            <Badge variant="outline" className="text-xs">{recentCompletions.length}</Badge>
          </div>
          <div className="space-y-2">
            {recentCompletions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No completions yet</p>
            ) : (
              recentCompletions.map(enr => (
                <Link key={enr.id} to={`/residents/${enr.resident_id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Award className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{classMap[enr.class_id]?.title || 'Class'}</p>
                      <p className="text-xs text-muted-foreground">{residentName(enr.resident_id)} · {enr.completion_date || ''}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-destructive" /> No-Show Alerts
            </h3>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">{noShowAlerts.length}</Badge>
          </div>
          <div className="space-y-2">
            {noShowAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No alerts</p>
            ) : (
              noShowAlerts.map(enr => (
                <Link key={enr.id} to={`/residents/${enr.resident_id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <GraduationCap className="w-4 h-4 text-destructive flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{classMap[enr.class_id]?.title || 'Class'}</p>
                      <p className="text-xs text-muted-foreground">{residentName(enr.resident_id)}</p>
                    </div>
                    <Badge className="text-[10px] bg-red-50 text-red-700 border-0">No Show</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* High barrier + missed appointments row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-amber-500" /> High-Barrier Residents
            </h3>
            <Badge variant="outline" className="text-xs">{highBarrierResidents.length}</Badge>
          </div>
          <div className="space-y-2">
            {highBarrierResidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No high-barrier residents</p>
            ) : (
              highBarrierResidents.slice(0, 5).map(r => (
                <Link key={r.id} to={`/residents/${r.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                      {r.first_name?.[0]}{r.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.preferred_name || r.first_name} {r.last_name}</p>
                      <p className="text-xs text-muted-foreground">{r.barriers?.length} barriers identified</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-destructive" /> Missed Appointments
            </h3>
            <Badge variant="destructive" className="text-xs">{missedApts.length}</Badge>
          </div>
          <div className="space-y-2">
            {missedApts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No missed appointments</p>
            ) : (
              missedApts.slice(0, 5).map(apt => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Calendar className="w-4 h-4 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">{residentName(apt.resident_id)} · {apt.date ? format(parseISO(apt.date), 'MMM d') : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}