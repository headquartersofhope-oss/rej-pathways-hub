import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import QuickAction from '@/components/shared/QuickAction';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Briefcase, FileText, MessageSquare,
  Calendar, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';

export default function ResidentDashboard({ user }) {
  const { data: messages = [] } = useQuery({
    queryKey: ['my-messages'],
    queryFn: () => base44.entities.Message.filter({ to_user_id: user?.id, is_read: false }),
    enabled: !!user?.id,
  });

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
        <StatCard title="Classes" value="3" subtitle="This week" icon={BookOpen} />
        <StatCard title="Messages" value={messages.length} subtitle="Unread" icon={MessageSquare} />
        <StatCard title="Tasks Due" value="2" subtitle="Today" icon={Clock} />
        <StatCard title="Documents" value="1" subtitle="Missing" icon={FileText} />
      </div>

      {/* Today's Schedule */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Today's Schedule</h3>
        <div className="space-y-3">
          {[
            { time: '9:00 AM', title: 'Resume Workshop', type: 'class', icon: BookOpen },
            { time: '11:00 AM', title: 'Meeting with Case Manager', type: 'appointment', icon: Calendar },
            { time: '2:00 PM', title: 'Job Search Lab', type: 'class', icon: Briefcase },
          ].map((event, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <event.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.time}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions - large tap targets */}
      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm px-1">Quick Actions</h3>
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