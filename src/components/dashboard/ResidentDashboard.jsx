import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import QuickAction from '@/components/shared/QuickAction';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  BookOpen, Briefcase, FileText, MessageSquare,
  Calendar, CheckCircle2, AlertTriangle, GraduationCap, Award,
  ChevronRight, Clock, Target, Zap
} from 'lucide-react';
import { format, parseISO, isAfter, isPast } from 'date-fns';

const APT_STATUS_COLORS = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  medium: 'bg-blue-50 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function ResidentDashboard({ user }) {
  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments', myResident?.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: myCertificates = [] } = useQuery({
    queryKey: ['my-certificates', myResident?.id],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks', myResident?.id],
    queryFn: () => base44.entities.ServiceTask.filter({ resident_id: myResident.id, is_resident_visible: true }),
    enabled: !!myResident?.id,
  });

  const { data: myAppointments = [] } = useQuery({
    queryKey: ['my-appointments', myResident?.id],
    queryFn: () => base44.entities.Appointment.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: myJobMatches = [] } = useQuery({
    queryKey: ['my-job-matches', myResident?.id],
    queryFn: () => base44.entities.JobMatch.filter({ resident_id: myResident.id, staff_approved: true }),
    enabled: !!myResident?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['my-messages'],
    queryFn: () => base44.entities.Message.filter({ to_user_id: user?.id, is_read: false }),
    enabled: !!user?.id,
  });

  const completedClasses = myEnrollments.filter(e => e.status === 'completed').length;
  const totalEnrollments = myEnrollments.length;
  const progressPct = totalEnrollments > 0 ? Math.round((completedClasses / totalEnrollments) * 100) : 0;

  const today = new Date();
  const upcomingAppointments = [...myAppointments]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .filter(a => ['scheduled', 'confirmed'].includes(a.status))
    .slice(0, 3);

  const openTasks = myTasks.filter(t => t.status !== 'completed');
  const overdueTasks = openTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)));
  const urgentTasks = openTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 3);

  const activeJobMatches = myJobMatches.filter(m =>
    !['not_selected', 'retained_90'].includes(m.status)
  ).slice(0, 3);

  const missingDocs = myResident?.missing_documents || [];

  // Build next steps
  const nextSteps = [];
  if (missingDocs.length > 0) {
    nextSteps.push({ icon: FileText, text: `Obtain missing document: ${missingDocs[0].replace(/_/g, ' ')}`, type: 'document', urgent: true });
  }
  const incompleteClasses = myEnrollments.filter(e => e.status !== 'completed' && e.status !== 'dropped');
  if (incompleteClasses.length > 0) {
    nextSteps.push({ icon: GraduationCap, text: `Continue your learning: ${incompleteClasses.length} class${incompleteClasses.length > 1 ? 'es' : ''} in progress`, type: 'learning', to: '/learning' });
  } else if (totalEnrollments === 0) {
    nextSteps.push({ icon: BookOpen, text: 'Browse available classes to get started', type: 'learning', to: '/learning' });
  }
  if (overdueTasks.length > 0) {
    nextSteps.push({ icon: AlertTriangle, text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention`, type: 'task', urgent: true, to: '/my-tasks' });
  }
  if (activeJobMatches.length > 0) {
    const latestMatch = activeJobMatches[0];
    nextSteps.push({ icon: Briefcase, text: `Job update: ${latestMatch.job_title} — ${latestMatch.status.replace(/_/g, ' ')}`, type: 'job', to: '/my-jobs' });
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-6 sm:p-8">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here's your progress and what's next for you today.
        </p>
        {myResident?.status && (
          <Badge className="mt-3 bg-primary/10 text-primary border-0 text-xs capitalize">
            Status: {myResident.status.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {/* Progress Summary */}
      {totalEnrollments > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Learning Progress
            </p>
            <span className="text-sm font-bold text-primary">{completedClasses}/{totalEnrollments}</span>
          </div>
          <Progress value={progressPct} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">
            {completedClasses} completed · {totalEnrollments - completedClasses} remaining · {myCertificates.length} certificate{myCertificates.length !== 1 ? 's' : ''} earned
          </p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Classes" value={totalEnrollments} subtitle="Enrolled" icon={BookOpen} />
        <StatCard title="Completed" value={completedClasses} subtitle="Courses" icon={CheckCircle2} />
        <StatCard title="Certificates" value={myCertificates.length} subtitle="Earned" icon={Award} />
        <StatCard title="Messages" value={messages.length} subtitle="Unread" icon={MessageSquare} />
      </div>

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" /> Your Next Steps
          </h3>
          <div className="space-y-2">
            {nextSteps.slice(0, 4).map((step, i) => {
              const Icon = step.icon;
              const content = (
                <div className={`flex items-start gap-3 p-3 rounded-lg ${step.urgent ? 'bg-amber-50 border border-amber-200' : 'bg-muted/40'}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${step.urgent ? 'text-amber-600' : 'text-primary'}`} />
                  <p className="text-sm flex-1">{step.text}</p>
                  {step.to && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </div>
              );
              return step.to ? (
                <Link key={i} to={step.to}>{content}</Link>
              ) : (
                <div key={i}>{content}</div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Upcoming Appointments
            </h3>
            <Link to="/my-appointments" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.map(apt => (
              <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{apt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {apt.date}{apt.time && ` at ${apt.time}`}{apt.location && ` · ${apt.location}`}
                  </p>
                </div>
                <Badge className={`text-[10px] border-0 ${APT_STATUS_COLORS[apt.status] || ''}`}>{apt.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Open Tasks */}
      {urgentTasks.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Action Needed
            </h3>
            <Link to="/my-tasks" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {urgentTasks.map(task => {
              const overdue = task.due_date && isPast(parseISO(task.due_date));
              return (
                <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${overdue ? 'border-red-200 bg-red-50/30' : 'border-border bg-muted/30'}`}>
                  <Clock className={`w-4 h-4 flex-shrink-0 mt-0.5 ${overdue ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.due_date && (
                      <p className={`text-xs mt-0.5 ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {overdue ? 'Overdue' : 'Due'} {task.due_date}
                      </p>
                    )}
                  </div>
                  <Badge className={`text-[10px] border-0 ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Job Progress Summary */}
      {activeJobMatches.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Job Progress
            </h3>
            <Link to="/my-jobs" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {activeJobMatches.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{m.job_title}</p>
                  <p className="text-xs text-muted-foreground">{m.employer_name}</p>
                </div>
                <Badge className="text-[10px] border-0 bg-blue-50 text-blue-700">
                  {m.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm px-1">Quick Actions</h3>
        <QuickAction icon={GraduationCap} label="My Learning Center" description={`${totalEnrollments} enrolled · ${myCertificates.length} certificates`} to="/learning" colorClass="bg-purple-50 text-purple-600" />
        <QuickAction icon={FileText} label="My Documents" description="Upload or view your documents" to="/documents" colorClass="bg-blue-50 text-blue-600" />
        <QuickAction icon={Briefcase} label="My Jobs" description="View job matches and progress" to="/my-jobs" colorClass="bg-amber-50 text-amber-600" />
        <QuickAction icon={Calendar} label="My Appointments" description="Upcoming and past appointments" to="/my-appointments" colorClass="bg-emerald-50 text-emerald-600" />
        <QuickAction icon={MessageSquare} label="Messages" description={`${messages.length} unread`} to="/messages" colorClass="bg-rose-50 text-rose-600" />
      </div>

      {/* Missing Documents Alert */}
      {missingDocs.length > 0 && (
        <Card className="p-5 border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-heading font-semibold text-sm">Missing Documents</p>
              <ul className="mt-1 space-y-0.5">
                {missingDocs.slice(0, 3).map((doc, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {doc.replace(/_/g, ' ')}</li>
                ))}
                {missingDocs.length > 3 && <li className="text-xs text-muted-foreground">...and {missingDocs.length - 3} more</li>}
              </ul>
              <Link to="/documents" className="text-xs text-primary hover:underline mt-1 inline-block">Upload documents →</Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}