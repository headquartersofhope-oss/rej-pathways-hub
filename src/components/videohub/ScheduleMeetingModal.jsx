import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Video, Plus, Trash2 } from 'lucide-react';

const MEETING_TYPES = [
  { value: 'staff_meeting', label: 'Staff Meeting' },
  { value: 'resident_session', label: 'Resident Session' },
  { value: 'employer_interview', label: 'Employer Interview' },
  { value: 'partner_meeting', label: 'Partner Meeting' },
  { value: 'group_class', label: 'Group Class' },
];

export default function ScheduleMeetingModal({ onClose, user, onCreated }) {
  const [form, setForm] = useState({
    meeting_title: '',
    meeting_type: 'staff_meeting',
    scheduled_at: '',
    duration_minutes: 60,
    description: '',
    resident_id: '',
    employer_id: '',
  });
  const [attendees, setAttendees] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-list'],
    queryFn: () => base44.entities.Resident.list('-created_date', 100),
  });

  const { data: employers = [] } = useQuery({
    queryKey: ['employers-list'],
    queryFn: () => base44.entities.Employer.list('-created_date', 100),
  });

  const addAttendee = () => {
    if (!newEmail && !newName) return;
    setAttendees(prev => [...prev, { email: newEmail, name: newName, role: 'attendee' }]);
    setNewEmail('');
    setNewName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.meeting_title) { setError('Meeting title is required'); return; }
    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('createMeetingRoom', {
        ...form,
        host_user_id: user?.id,
        attendees,
      });
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create meeting');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#30363D' }}>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-400" />
            <h2 className="font-heading font-bold text-white">Schedule a Meeting</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Meeting Title *</label>
            <Input value={form.meeting_title} onChange={e => setForm(f => ({ ...f, meeting_title: e.target.value }))} placeholder="e.g. Weekly Case Review" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Meeting Type</label>
            <select value={form.meeting_type} onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value }))} className="w-full h-9 rounded-md border px-3 text-sm text-white" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {form.meeting_type === 'resident_session' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Resident</label>
              <select value={form.resident_id} onChange={e => setForm(f => ({ ...f, resident_id: e.target.value }))} className="w-full h-9 rounded-md border px-3 text-sm text-white" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
                <option value="">— Select resident —</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
              </select>
            </div>
          )}

          {form.meeting_type === 'employer_interview' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Employer</label>
              <select value={form.employer_id} onChange={e => setForm(f => ({ ...f, employer_id: e.target.value }))} className="w-full h-9 rounded-md border px-3 text-sm text-white" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
                <option value="">— Select employer —</option>
                {employers.map(emp => <option key={emp.id} value={emp.id}>{emp.company_name || emp.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date & Time</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="w-full h-9 rounded-md border px-3 text-sm text-white" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Duration (min)</label>
              <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))} min={15} max={480} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Description / Agenda</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Meeting agenda and notes..." className="w-full rounded-md border px-3 py-2 text-sm text-white resize-none" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }} />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Invite Attendees</label>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" />
              <Input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="flex-1" />
              <Button type="button" size="icon" variant="outline" onClick={addAttendee}><Plus className="w-4 h-4" /></Button>
            </div>
            {attendees.length > 0 && (
              <div className="space-y-1">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm rounded px-3 py-1.5" style={{ backgroundColor: '#21262D' }}>
                    <span className="text-white">{a.name} {a.email && <span className="text-slate-400">({a.email})</span>}</span>
                    <button type="button" onClick={() => setAttendees(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1" style={{ backgroundColor: '#3B82F6', color: 'white' }}>
              {loading ? 'Creating...' : 'Create Meeting'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}