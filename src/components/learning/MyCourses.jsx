import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Award, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

const categoryLabels = {
  work_readiness: 'Work Readiness',
  soft_skills: 'Soft Skills',
  interview_preparation: 'Interview Prep',
  resume_preparation: 'Resume Prep',
  digital_literacy: 'Digital Literacy',
  financial_literacy: 'Financial Literacy',
  workplace_communication: 'Workplace Comm.',
  conflict_management: 'Conflict Mgmt',
  recovery_support_education: 'Recovery Support',
  certifications: 'Certifications',
  trade_intro: 'Trade Intro',
};

const statusConfig = {
  enrolled: { color: 'bg-blue-50 text-blue-700', label: 'Enrolled' },
  in_progress: { color: 'bg-amber-50 text-amber-700', label: 'In Progress' },
  completed: { color: 'bg-emerald-50 text-emerald-700', label: 'Completed ✓' },
  dropped: { color: 'bg-slate-100 text-slate-600', label: 'Dropped' },
  no_show: { color: 'bg-red-50 text-red-700', label: 'No Show' },
};

export default function MyCourses({ user }) {
  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments', myResident?.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['my-certificates', myResident?.id],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['class-sessions'],
    queryFn: () => base44.entities.ClassSession.list('-date', 100),
  });

  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
  const myClassIds = new Set(enrollments.map(e => e.class_id));

  const completedCount = enrollments.filter(e => e.status === 'completed').length;
  const inProgressCount = enrollments.filter(e => e.status === 'in_progress' || e.status === 'enrolled').length;
  const progressPct = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

  // Upcoming sessions for my enrolled classes
  const today = new Date();
  const upcomingSessions = sessions
    .filter(s => myClassIds.has(s.class_id) && s.status === 'scheduled' && s.date && isAfter(parseISO(s.date), today))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  if (!myResident) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No resident profile linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading font-semibold text-sm">Your Learning Progress</p>
          <span className="text-sm font-bold text-primary">{completedCount}/{enrollments.length} completed</span>
        </div>
        <Progress value={progressPct} className="h-3 mb-2" />
        <p className="text-xs text-muted-foreground">
          {completedCount} course{completedCount !== 1 ? 's' : ''} completed · {inProgressCount} active · {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} earned
        </p>
      </Card>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Upcoming Classes
          </h3>
          <div className="space-y-2">
            {upcomingSessions.map(s => {
              const cls = classMap[s.class_id];
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cls?.title || 'Class'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(s.date), 'EEE, MMM d')}
                      {s.start_time && ` · ${s.start_time}`}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* My Enrollments */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3">My Courses</h3>
        {enrollments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No courses enrolled yet. Your instructor will assign courses to you.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {enrollments.map(enr => {
              const cls = classMap[enr.class_id];
              if (!cls) return null;
              const conf = statusConfig[enr.status] || statusConfig.enrolled;
              return (
                <Card key={enr.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    {enr.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <GraduationCap className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{cls.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {categoryLabels[cls.category] || cls.category}
                      {cls.instructor_name && ` · ${cls.instructor_name}`}
                    </p>
                    {enr.completion_date && (
                      <p className="text-xs text-emerald-600 mt-0.5">Completed {enr.completion_date}</p>
                    )}
                  </div>
                  <Badge className={`text-[10px] border-0 flex-shrink-0 ${conf.color}`}>{conf.label}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-600" /> My Certificates
          </h3>
          <div className="space-y-3">
            {certificates.map(cert => (
              <Card key={cert.id} className="p-4 flex items-center gap-4 border-yellow-200 bg-yellow-50/30">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{cert.certificate_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Issued {cert.issued_date}{cert.issued_by_name && ` by ${cert.issued_by_name}`}</p>
                </div>
                <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">Earned ✓</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}