import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

const STATUS_COLORS = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  missed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rescheduled: 'bg-amber-50 text-amber-700',
};

const APT_TYPE_LABELS = {
  intake: 'Intake',
  case_review: 'Case Review',
  job_readiness: 'Job Readiness',
  employment: 'Employment',
  mental_health: 'Mental Health',
  legal: 'Legal',
  probation: 'Probation',
  exit_planning: 'Exit Planning',
  other: 'Other',
};

export default function MyAppointments() {
  const { user } = useOutletContext();

  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-appointments', myResident?.id],
    queryFn: () => base44.entities.Appointment.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: videoMeetings = [] } = useQuery({
    queryKey: ['my-video-meetings', myResident?.id],
    queryFn: () => base44.entities.VideoMeeting.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const isJoinable = (meeting) => {
    if (!meeting.scheduled_at) return false;
    const now = new Date();
    const scheduled = new Date(meeting.scheduled_at);
    const diffMs = scheduled - now;
    return diffMs <= 15 * 60 * 1000 && diffMs > -2 * 60 * 60 * 1000 && meeting.status !== 'completed' && meeting.status !== 'cancelled';
  };

  const residentQuerySettled = myResident !== undefined;

  if (!myResident && residentQuerySettled && !isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto">
        <PageHeader title="My Appointments" icon={Calendar} />
        <Card className="p-8 text-center text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Your resident profile isn't linked yet. Contact your case manager.</p>
        </Card>
      </div>
    );
  }

  const sorted = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
  const upcoming = sorted.filter(a => ['scheduled', 'confirmed'].includes(a.status));
  const past = sorted.filter(a => !['scheduled', 'confirmed'].includes(a.status));

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="My Appointments" subtitle="Your upcoming and past appointments" icon={Calendar} />

      {isLoading && (
        <div className="space-y-3">
          {[1,2].map(i => <Card key={i} className="p-5 h-20 animate-pulse bg-muted/30" />)}
        </div>
      )}

      {!isLoading && appointments.length === 0 && videoMeetings.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No appointments scheduled yet.</p>
          <p className="text-xs mt-1">Your case manager will schedule appointments for you.</p>
        </Card>
      )}

      {videoMeetings.filter(m => m.status !== 'completed' && m.status !== 'cancelled').length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2 text-blue-400">
            <Video className="w-4 h-4" /> Video Sessions
          </h3>
          <div className="space-y-3">
            {videoMeetings.filter(m => m.status !== 'completed' && m.status !== 'cancelled').map(meeting => (
              <Card key={meeting.id} className="p-4 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Video Session with {meeting.host_name}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                  {isJoinable(meeting) && meeting.room_url && (
                    <a href={meeting.room_url} target="_blank" rel="noreferrer">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#3B82F6', color: 'white' }}>
                        <Video className="w-3.5 h-3.5" /> Join Session
                      </button>
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcoming.map(apt => (
              <Card key={apt.id} className="p-4 border-l-4 border-l-primary/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{apt.title}</p>
                    {apt.appointment_type && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {APT_TYPE_LABELS[apt.appointment_type] || apt.appointment_type}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs flex items-center gap-1 text-foreground">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {apt.date}{apt.time && ` at ${apt.time}`}
                      </span>
                      {apt.location && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {apt.location}
                        </span>
                      )}
                    </div>
                    {apt.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{apt.notes}</p>
                    )}
                  </div>
                  <Badge className={`text-[10px] border-0 flex-shrink-0 ${STATUS_COLORS[apt.status] || ''}`}>
                    {apt.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 text-muted-foreground">Past Appointments</h3>
          <div className="space-y-2">
            {past.map(apt => (
              <Card key={apt.id} className="p-3 opacity-70">
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] border-0 flex-shrink-0 ${STATUS_COLORS[apt.status] || ''}`}>
                    {apt.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">{apt.date}{apt.time && ` at ${apt.time}`}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}