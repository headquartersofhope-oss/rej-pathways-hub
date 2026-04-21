import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';

export default function LiveMeetingIndicator({ userId }) {
  const { data: meetings = [] } = useQuery({
    queryKey: ['live-meetings', userId],
    queryFn: () => base44.entities.VideoMeeting.filter({ status: 'live' }),
    refetchInterval: 30000,
  });

  const myLive = meetings.find(m => m.host_id === userId || (m.attendees || []).some(a => a.user_id === userId));
  if (!myLive) return null;

  return (
    <Link to={`/video-hub/room/${myLive.room_name}`} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: '#7F1D1D22', border: '1px solid #EF444444' }}>
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <Video className="w-3.5 h-3.5 text-red-400" />
      <span className="text-red-400">Join Now</span>
    </Link>
  );
}