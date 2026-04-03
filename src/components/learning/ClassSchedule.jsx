import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, MapPin, Clock, ClipboardList } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusColors = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

const emptyForm = { class_id: '', date: '', start_time: '', end_time: '', location: '', notes: '', status: 'scheduled' };

export default function ClassSchedule({ user, onTakeAttendance }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['class-sessions'],
    queryFn: () => base44.entities.ClassSession.list('-date', 100),
  });

  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));

  const openCreate = () => { setEditSession(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s) => { setEditSession(s); setForm({ ...emptyForm, ...s }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, organization_id: user?.organization_id };
    if (editSession) {
      await base44.entities.ClassSession.update(editSession.id, data);
    } else {
      await base44.entities.ClassSession.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
    setSaving(false);
    setShowForm(false);
  };

  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div className="flex justify-end mb-5">
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> Schedule Session
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No sessions scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(session => {
            const cls = classMap[session.class_id];
            return (
              <Card key={session.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow">
                <div
                  className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 cursor-pointer"
                  onClick={() => openEdit(session)}
                >
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(session)}>
                  <p className="font-semibold text-sm">{cls?.title || 'Unknown Class'}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{session.date ? format(parseISO(session.date), 'EEE, MMM d yyyy') : '—'}</span>
                    {(session.start_time || session.end_time) && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.start_time}{session.end_time ? ` – ${session.end_time}` : ''}</span>
                    )}
                    {session.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onTakeAttendance && session.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); onTakeAttendance(session); }}
                    >
                      <ClipboardList className="w-3 h-3" /> Attendance
                    </Button>
                  )}
                  <Badge className={`text-[10px] border-0 ${statusColors[session.status] || ''}`}>{session.status}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSession ? 'Edit Session' : 'Schedule Session'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Class *</Label>
              <Select value={form.class_id} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.is_active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Room or address" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.class_id || !form.date}>
                {saving ? 'Saving…' : editSession ? 'Save Changes' : 'Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}