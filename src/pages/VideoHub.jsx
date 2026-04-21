import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Users, Calendar, CheckCircle2, Activity, Plus, Clock, ExternalLink } from 'lucide-react';
import ScheduleMeetingModal from '@/components/videohub/ScheduleMeetingModal';
import { format, isToday } from 'date-fns';

const TYPE_BADGES = {
  staff_meeting: { label: 'Staff Meeting', color: 'bg-slate-600 text-white' },
  resident_session: { label: 'Resident Session', color: 'bg-emerald-700 text-white' },
  employer_interview: { label: 'Employer Interview', color: 'bg-purple-700 text-white' },
  partner_meeting: { label: 'Partner Meeting', color: 'bg-teal-700 text-white' },
  group_class: { label: 'Group Class', color: 'bg-amber-600 text-white' },
};

const STATUS_BADGE = {
  scheduled: 'bg-blue-900 text-blue-200',
  live: 'bg-red-700 text-white animate-pulse',
  completed: 'bg-slate-700 text-slate-300',
  cancelled: 'bg-gray-700 text-gray-400',
};

export default function VideoHub() {
  const { user } = useOutletContext();
  const [showSchedule, setShowSchedule] = useState(false);
  const [quickType, setQuickType] = useState(null);
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['video-meetings'],
    queryFn: () => base44.entities.VideoMeeting.list('-scheduled_at', 50),
  });

  const startInstantMutation = useMutation({
    mutationFn: async (type) => {
      const res = await base44.functions.invoke('createMeetingRoom', {
        meeting_title: TYPE_BADGES[type]?.label + ' — ' + new Date().toLocaleTimeString(),
        host_user_id: user?.id,
        scheduled_at: new Date().toISOString(),
        meeting_type: type,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video-meetings'] });
      if (data?.room_url) window.open(data.room_url, '_blank');
    },
  });

  const todayMeetings = meetings.filter(m => m.scheduled_at && isToday(new Date(m.scheduled_at)));
  const thisWeek = meetings.filter(m => {
    if (!m.scheduled_at) return false;
    const d = new Date(m.scheduled_at);
    const now = new Date();
    const weekOut = new Date(); weekOut.setDate(now.getDate() + 7);
    return d >= now && d <= weekOut;
  });
  const completed = meetings.filter(m => m.status === 'completed');
  const live = meetings.filter(m => m.status === 'live');
  const recent = [...meetings].slice(0, 20);

  const StatCard = ({ icon: IconComp, label, value, color }) => (
    <div className="rounded-xl border p-5 flex items-center gap-4" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
        <IconComp className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="rounded-2xl p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', border: '1px solid #1e3a5f' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="flex items-center gap-3 mb-2">
          <Video className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white font-heading">Pathways Video Hub</h1>
        </div>
        <p className="text-slate-400 text-lg">Connect in real time with your team, residents, employers, and partners</p>
        <Button className="mt-4" onClick={() => setShowSchedule(true)} style={{ backgroundColor: '#3B82F6', color: 'white' }}>
          <Plus className="w-4 h-4 mr-2" /> Schedule Meeting
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Meetings Today" value={todayMeetings.length} color="#3B82F6" />
        <StatCard icon={Clock} label="Scheduled This Week" value={thisWeek.length} color="#8B5CF6" />
        <StatCard icon={CheckCircle2} label="Completed Sessions" value={completed.length} color="#10B981" />
        <StatCard icon={Activity} label="Active Now" value={live.length} color="#EF4444" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          <h2 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" /> Today's Schedule
          </h2>
          {todayMeetings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No meetings scheduled today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMeetings.map(m => (
                <div key={m.id} className="rounded-lg p-3 border flex items-center justify-between gap-3" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_BADGES[m.meeting_type]?.color}`}>{TYPE_BADGES[m.meeting_type]?.label}</span>
                    </div>
                    <p className="text-sm font-medium text-white truncate">{m.title}</p>
                    <p className="text-xs text-slate-400">{m.scheduled_at ? format(new Date(m.scheduled_at), 'h:mm a') : ''} · {m.host_name}</p>
                  </div>
                  <a href={m.room_url} target="_blank" rel="noreferrer">
                    <Button size="sm" style={{ backgroundColor: '#3B82F6', color: 'white' }}>
                      {m.status === 'live' ? 'Join' : 'Start'}
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Start */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          <h2 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Quick Start
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'staff_meeting', label: 'Start Staff Meeting', color: '#3B82F6', icon: '👥' },
              { type: 'resident_session', label: 'Start Resident Session', color: '#10B981', icon: '🤝' },
              { type: 'employer_interview', label: 'Start Employer Interview', color: '#8B5CF6', icon: '💼' },
              { type: 'group_class', label: 'Schedule Class Session', color: '#F59E0B', icon: '🎓' },
            ].map(({ type, label, color, icon }) => (
              <button
                key={type}
                onClick={() => type === 'group_class' ? setShowSchedule(true) : startInstantMutation.mutate(type)}
                disabled={startInstantMutation.isPending}
                className="rounded-xl p-4 border text-left transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: color + '15', borderColor: color + '40' }}
              >
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-sm font-semibold" style={{ color }}>{label}</p>
                {startInstantMutation.isPending && startInstantMutation.variables === type && (
                  <p className="text-xs text-slate-400 mt-1">Creating room...</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Meetings Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#30363D' }}>
          <h2 className="font-heading font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" /> Recent Meetings
          </h2>
          <Link to="/video-hub/history">
            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">View All →</Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#0D1117' }}>
                <tr>
                  {['Title', 'Type', 'Host', 'Date', 'Attendees', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((m, i) => (
                  <tr key={m.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: '#30363D' }}>
                    <td className="px-4 py-3 text-sm text-white font-medium truncate max-w-48">{m.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_BADGES[m.meeting_type]?.color}`}>{TYPE_BADGES[m.meeting_type]?.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{m.host_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d, h:mm a') : '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 flex items-center gap-1"><Users className="w-3 h-3" />{(m.attendees || []).length}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.room_url && m.status !== 'completed' && m.status !== 'cancelled' && (
                        <a href={m.room_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 text-xs">
                            <ExternalLink className="w-3 h-3 mr-1" /> Join
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No meetings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSchedule && <ScheduleMeetingModal onClose={() => setShowSchedule(false)} user={user} onCreated={() => { queryClient.invalidateQueries({ queryKey: ['video-meetings'] }); setShowSchedule(false); }} />}
    </div>
  );
}