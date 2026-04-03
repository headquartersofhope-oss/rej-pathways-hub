import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buildChecklist } from '@/lib/onboarding';
import {
  Bell, CheckCircle2, Loader2, Mail, BookOpen, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { format, isPast, addDays } from 'date-fns';

const TYPE_META = {
  new_task: { label: 'New Tasks', icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50' },
  upcoming_class: { label: 'Upcoming Classes', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  onboarding_digest: { label: 'Onboarding Digest', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
};

function buildTaskEmail(residentName, tasks) {
  const list = tasks.map(t => `• ${t.title}${t.due_date ? ` (due ${format(new Date(t.due_date), 'MMM d')})` : ''}`).join('\n');
  return {
    subject: `You have new tasks assigned — ${residentName}`,
    body: `Hi ${residentName},\n\nYou have the following tasks assigned to you:\n\n${list}\n\nPlease log in to your portal to review and take action.\n\nThank you,\nYour Care Team`,
  };
}

function buildClassEmail(residentName, sessions) {
  const list = sessions.map(s => `• ${s.class_title || 'Class'} — ${s.session_date ? format(new Date(s.session_date), 'EEE, MMM d') : 'TBD'}${s.start_time ? ` at ${s.start_time}` : ''}${s.location ? ` @ ${s.location}` : ''}`).join('\n');
  return {
    subject: `Upcoming class reminder — ${residentName}`,
    body: `Hi ${residentName},\n\nThis is a reminder about your upcoming class session(s):\n\n${list}\n\nPlease make sure to attend on time.\n\nThank you,\nYour Care Team`,
  };
}

function buildOnboardingEmail(residentName, incompleteSteps) {
  const list = incompleteSteps.map(s => `• ${s.label} — ${s.description}`).join('\n');
  return {
    subject: `Action needed: Complete your onboarding — ${residentName}`,
    body: `Hi ${residentName},\n\nYou still have onboarding steps to complete. Here's what's left:\n\n${list}\n\nPlease log in to your resident portal and complete these steps to get fully set up.\n\nThank you,\nYour Care Team`,
  };
}

// ─── Row for a single resident ──────────────────────────────────────────────
function ResidentNotifyRow({ resident, user, onSent }) {
  const [sending, setSending] = useState(null);
  const [sentTypes, setSentTypes] = useState([]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['notif-tasks', resident.id],
    queryFn: () => base44.entities.ServiceTask.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['notif-enrollments', resident.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['notif-sessions'],
    queryFn: () => base44.entities.ClassSession.list(),
  });

  const { data: onboardingList = [] } = useQuery({
    queryKey: ['notif-onboarding', resident.id],
    queryFn: () => base44.entities.Onboarding.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['notif-docs', resident.id],
    queryFn: () => base44.entities.Document.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['notif-assessment', resident.id],
    queryFn: () => base44.entities.IntakeAssessment.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const residentName = `${resident.first_name} ${resident.last_name}`;
  const email = resident.email;

  // Pending tasks (not completed, is_resident_visible)
  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.is_resident_visible !== false);

  // Upcoming sessions (within next 7 days)
  const mySessionIds = new Set(enrollments.map(e => e.session_id).filter(Boolean));
  const upcomingSessions = sessions.filter(s => {
    if (!mySessionIds.has(s.id)) return false;
    if (!s.session_date) return false;
    const d = new Date(s.session_date);
    return !isPast(d) && d <= addDays(new Date(), 7);
  });

  // Overdue onboarding steps
  const onboarding = onboardingList.find(o => o.is_active && !o.dismissed) || null;
  const checklist = onboarding
    ? buildChecklist(resident, documents, tasks, assessments[0] || null, onboarding.completed_steps || [])
    : [];
  const incompleteSteps = checklist.filter(s => !s.completed);

  const sendNotification = async (type) => {
    if (!email) return;
    setSending(type);
    let emailData;
    if (type === 'new_task') emailData = buildTaskEmail(residentName, pendingTasks);
    if (type === 'upcoming_class') emailData = buildClassEmail(residentName, upcomingSessions);
    if (type === 'onboarding_digest') emailData = buildOnboardingEmail(residentName, incompleteSteps);

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: emailData.subject,
      body: emailData.body,
    });

    await base44.entities.Notification.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      recipient_email: email,
      recipient_name: residentName,
      type,
      subject: emailData.subject,
      body: emailData.body,
      sent_by: user?.id,
      status: 'sent',
    });

    setSentTypes(prev => [...prev, type]);
    setSending(null);
    onSent?.();
  };

  const actions = [
    { type: 'new_task', count: pendingTasks.length, label: `${pendingTasks.length} open task${pendingTasks.length !== 1 ? 's' : ''}` },
    { type: 'upcoming_class', count: upcomingSessions.length, label: `${upcomingSessions.length} upcoming class${upcomingSessions.length !== 1 ? 'es' : ''}` },
    { type: 'onboarding_digest', count: incompleteSteps.length, label: `${incompleteSteps.length} onboarding step${incompleteSteps.length !== 1 ? 's' : ''} left` },
  ].filter(a => a.count > 0);

  if (!email) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{residentName}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">Nothing to send</span>
        ) : (
          actions.map(({ type, label }) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const alreadySent = sentTypes.includes(type);
            return (
              <Button
                key={type}
                size="sm"
                variant="outline"
                disabled={!!sending || alreadySent}
                onClick={() => sendNotification(type)}
                className={`gap-1.5 text-xs h-8 ${alreadySent ? 'opacity-50' : ''}`}
              >
                {sending === type ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : alreadySent ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Icon className={`w-3 h-3 ${meta.color}`} />
                )}
                {alreadySent ? 'Sent' : label}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function NotificationDispatcher({ user }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['notif-residents'],
    queryFn: () => base44.entities.Resident.filter({ status: 'active' }),
  });

  const { data: notifLog = [] } = useQuery({
    queryKey: ['notif-log'],
    queryFn: () => base44.entities.Notification.list('-created_date', 30),
  });

  const residentsWithEmail = residents.filter(r => r.email);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={key} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${meta.bg} ${meta.color} font-medium`}>
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
          <Mail className="w-3.5 h-3.5" />
          Sends via email
        </div>
      </div>

      {/* Resident list */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Active Residents</span>
            <Badge variant="outline" className="text-xs">{residentsWithEmail.length} with email</Badge>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading residents...
          </div>
        ) : residentsWithEmail.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No active residents with email addresses found.
          </div>
        ) : (
          <div>
            {residentsWithEmail.map(r => (
              <ResidentNotifyRow
                key={r.id}
                resident={r}
                user={user}
                onSent={() => queryClient.invalidateQueries({ queryKey: ['notif-log'] })}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Recent log */}
      {notifLog.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Recent Notifications Sent</p>
          <Card className="overflow-hidden">
            <div className="divide-y">
              {notifLog.slice(0, 10).map(n => {
                const meta = TYPE_META[n.type];
                const Icon = meta?.icon || Mail;
                return (
                  <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${meta?.color || 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.recipient_name || n.recipient_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {n.created_date ? format(new Date(n.created_date), 'MMM d, h:mm a') : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}