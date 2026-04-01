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
  Calendar, CheckCircle2, Clock, AlertTriangle, GraduationCap, Award
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

export default function ResidentDashboard({ user }) {
  const { data: messages = [] } = useQuery({
    queryKey: ['my-messages'],
    queryFn: () => base44.entities.Message.filter({ to_user_id: user?.id, is_read: false }),
    enabled: !!user?.id,
  });

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

  const { data: allSessions = [] } = useQuery({
    queryKey: ['class-sessions'],
    queryFn: () => base44.entities.ClassSession.list('-date', 100),
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 100),
  });

  const classMap = Object.fromEntries(allClasses.map(c => [c.id, c]));
  const myClassIds = new Set(myEnrollments.map(e => e.class_id));
  const today = new Date();
  const upcomingSessions = allSessions
    .filter(s => myClassIds.has(s.class_id) && s.status === 'scheduled' && s.date && isAfter(parseISO(s.date), today))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);
  const completedClasses = myEnrollments.filter(e => e.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-6 sm:p-8">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's happening today. You're doing great — keep going!
        </p>
      </div>

      {/* Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading font-semibold text-sm">Your Job Readiness</p>
          <Badge variant="secondary" className="text-xs">In Progress</Badge>
        </div>
        <Progress value={45} className="h-3 mb-2" />
        <p className="text-xs text-muted-foreground">45% complete — next step: Upload your resume</p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Classes" value={myEnrollments.length} subtitle="Enrolled" icon={BookOpen} />
        <StatCard title="Messages" value={messages.length} subtitle="Unread" icon={MessageSquare} />
        <StatCard title="Completed" value={completedClasses} subtitle="Courses" icon={CheckCircle2} />
        <StatCard title="Certificates" value={myCertificates.length} subtitle="Earned" icon={Award} />
      </div>

      {/* Upcoming Classes */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-sm">Upcoming Classes</h3>
          <Link to="/learning" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">No upcoming classes scheduled.</p>
          ) : (
            upcomingSessions.map(s => {
              const cls = classMap[s.class_id];
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cls?.title || 'Class'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(s.date), 'EEE, MMM d')}
                      {s.start_time && ` · ${s.start_time}`}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Quick Actions - large tap targets */}
      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm px-1">Quick Actions</h3>
        <QuickAction icon={GraduationCap} label="My Learning Center" description={`${myEnrollments.length} enrolled · ${myCertificates.length} certificates`} to="/learning" colorClass="bg-purple-50 text-purple-600" />
        <QuickAction icon={FileText} label="Upload a Document" description="ID, resume, or certificate" to="/documents" colorClass="bg-blue-50 text-blue-600" />
        <QuickAction icon={Briefcase} label="View Job Listings" description="See jobs matched to you" to="/module/job_matching" colorClass="bg-amber-50 text-amber-600" />
        <QuickAction icon={MessageSquare} label="Message Your Team" description={`${messages.length} unread`} to="/messages" colorClass="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Missing Documents Alert */}
      <Card className="p-5 border-destructive/20 bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-heading font-semibold text-sm">Missing Documents</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please upload your government-issued ID to continue your enrollment.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}