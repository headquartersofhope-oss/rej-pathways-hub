import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Search, ChevronDown, ChevronUp, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_BADGES = {
  staff_meeting: { label: 'Staff Meeting', color: 'bg-slate-600 text-white' },
  resident_session: { label: 'Resident Session', color: 'bg-emerald-700 text-white' },
  employer_interview: { label: 'Employer Interview', color: 'bg-purple-700 text-white' },
  partner_meeting: { label: 'Partner Meeting', color: 'bg-teal-700 text-white' },
  group_class: { label: 'Group Class', color: 'bg-amber-600 text-white' },
};

export default function VideoHistory() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['video-meetings-all'],
    queryFn: () => base44.entities.VideoMeeting.list('-scheduled_at', 200),
  });

  const filtered = meetings.filter(m => {
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.host_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || m.meeting_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Video className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white font-heading">Meeting History</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search meetings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-md border px-3 text-sm text-white" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
          <option value="all">All Types</option>
          <option value="staff_meeting">Staff Meeting</option>
          <option value="resident_session">Resident Session</option>
          <option value="employer_interview">Employer Interview</option>
          <option value="partner_meeting">Partner Meeting</option>
          <option value="group_class">Group Class</option>
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
              <button
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_BADGES[m.meeting_type]?.color}`}>{TYPE_BADGES[m.meeting_type]?.label}</span>
                  <span className="text-white font-medium truncate">{m.title}</span>
                  <span className="text-slate-400 text-xs flex-shrink-0">{m.host_name}</span>
                  <span className="text-slate-500 text-xs flex-shrink-0">{m.scheduled_at ? format(new Date(m.scheduled_at), 'MMM d, yyyy h:mm a') : '—'}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" />{(m.attendees || []).length}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{m.duration_minutes || 60}m</span>
                  {expanded === m.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {expanded === m.id && (
                <div className="px-5 pb-4 border-t" style={{ borderColor: '#30363D' }}>
                  <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Attendees</p>
                      {m.attendees?.length > 0 ? (
                        <div className="space-y-1">
                          {m.attendees.map((a, i) => (
                            <div key={i} className="text-sm text-slate-300">{a.name} {a.email && <span className="text-slate-500">({a.email})</span>}</div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-slate-500">No recorded attendees</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Notes</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{m.notes || 'No notes recorded'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No meetings found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}