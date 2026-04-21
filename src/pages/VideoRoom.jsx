import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Video, Clock, Users, PhoneOff, Save } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_BADGES = {
  staff_meeting: { label: 'Staff Meeting', color: '#64748B' },
  resident_session: { label: 'Resident Session', color: '#10B981' },
  employer_interview: { label: 'Employer Interview', color: '#8B5CF6' },
  partner_meeting: { label: 'Partner Meeting', color: '#14B8A6' },
  group_class: { label: 'Group Class', color: '#F59E0B' },
};

export default function VideoRoom() {
  const { roomName } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [joinUrl, setJoinUrl] = useState(null);
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  const { data: meetings = [] } = useQuery({
    queryKey: ['video-meeting-room', roomName],
    queryFn: () => base44.entities.VideoMeeting.filter({ room_name: roomName }),
  });
  const meeting = meetings[0];

  // Get token
  useEffect(() => {
    if (!roomName || !user) return;
    base44.functions.invoke('getMeetingToken', {
      room_name: roomName,
      display_name: user.full_name || 'Guest',
      is_owner: meeting?.host_id === user.id,
    }).then(res => {
      if (res.data?.token) {
        setToken(res.data.token);
        setJoinUrl(`https://pathways.daily.co/${roomName}?t=${res.data.token}`);
      }
    }).catch(() => {
      // Fallback: use room_url directly
      if (meeting?.room_url) setJoinUrl(meeting.room_url);
    });
  }, [roomName, user, meeting]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (meeting?.notes) setNotes(meeting.notes);
  }, [meeting]);

  const saveNotes = async () => {
    if (!meeting?.id) return;
    setSaving(true);
    await base44.entities.VideoMeeting.update(meeting.id, { notes });
    setSaving(false);
  };

  const endMeeting = async () => {
    if (meeting?.id) {
      await base44.functions.invoke('endMeeting', { meeting_id: meeting.id, notes });
    }
    navigate('/video-hub');
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  const typeMeta = TYPE_BADGES[meeting?.meeting_type] || TYPE_BADGES.staff_meeting;
  const isHost = meeting?.host_id === user?.id;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#0D1117' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="font-heading font-bold text-white text-sm">{meeting?.title || 'Video Meeting'}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: typeMeta.color }}>{typeMeta.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>
          {isHost && (
            <Button size="sm" onClick={endMeeting} className="bg-red-600 hover:bg-red-700 text-white">
              <PhoneOff className="w-4 h-4 mr-1" /> End Meeting
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video iframe */}
        <div className="flex-1 relative">
          {joinUrl ? (
            <iframe
              src={joinUrl}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              className="w-full h-full border-0"
              title="Video Meeting"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Loading meeting room...</p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-72 border-l flex flex-col" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          {/* Participants */}
          <div className="p-4 border-b" style={{ borderColor: '#30363D' }}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Participants ({(meeting?.attendees || []).length + 1})
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {meeting?.host_name?.[0]?.toUpperCase() || 'H'}
                </div>
                <span className="text-sm text-white">{meeting?.host_name || 'Host'} <span className="text-[10px] text-blue-400">(host)</span></span>
              </div>
              {(meeting?.attendees || []).map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-semibold">
                    {a.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <span className="text-sm text-slate-300">{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase">Meeting Notes</h3>
              <button onClick={saveNotes} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Save className="w-3 h-3" />{saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Type meeting notes here..."
              className="flex-1 rounded-lg p-3 text-sm text-white resize-none border"
              style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}