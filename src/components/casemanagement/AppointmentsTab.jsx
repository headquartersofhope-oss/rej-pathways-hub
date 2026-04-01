import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Plus, MapPin, Clock } from 'lucide-react';
import { isStaff } from '@/lib/roles';
import { format } from 'date-fns';

const APT_TYPES = ['intake', 'case_review', 'job_readiness', 'employment', 'mental_health', 'legal', 'probation', 'exit_planning', 'other'];
const APT_STATUSES = ['scheduled', 'confirmed', 'completed', 'missed', 'cancelled', 'rescheduled'];

const statusColors = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  missed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rescheduled: 'bg-amber-50 text-amber-700',
};

export default function AppointmentsTab({ resident, user }) {
  const queryClient = useQueryClient();
  const isStaffUser = isStaff(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    appointment_type: 'case_review',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: '',
    status: 'scheduled',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', resident.id],
    queryFn: () => base44.entities.Appointment.filter({ resident_id: resident.id }, '-date'),
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Appointment.create({
      ...form,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id || '',
      organization_id: resident.organization_id,
      staff_id: user?.id,
      staff_name: user?.full_name,
    });
    queryClient.invalidateQueries({ queryKey: ['appointments', resident.id] });
    setShowForm(false);
    setForm({ title: '', appointment_type: 'case_review', date: new Date().toISOString().split('T')[0], time: '10:00', location: '', status: 'scheduled', notes: '' });
    setSaving(false);
  };

  const handleStatusUpdate = async (apt, newStatus) => {
    await base44.entities.Appointment.update(apt.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['appointments', resident.id] });
  };

  const upcoming = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status));
  const past = appointments.filter(a => !['scheduled', 'confirmed'].includes(a.status));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isStaffUser && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Schedule Appointment
          </Button>
        )}
      </div>

      {upcoming.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Upcoming
          </h3>
          <div className="space-y-3">
            {upcoming.map(apt => (
              <div key={apt.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{apt.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {apt.date} {apt.time && `at ${apt.time}`}
                      </span>
                      {apt.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {apt.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColors[apt.status] || ''}`}>{apt.status}</Badge>
                    {isStaffUser && (
                      <Select value={apt.status} onValueChange={v => handleStatusUpdate(apt, v)}>
                        <SelectTrigger className="h-6 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APT_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                {apt.notes && <p className="text-xs text-muted-foreground mt-2">{apt.notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {past.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3">Past Appointments</h3>
          <div className="space-y-2">
            {past.map(apt => (
              <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Badge className={`text-[10px] ${statusColors[apt.status] || ''}`}>{apt.status}</Badge>
                <span className="flex-1 text-sm">{apt.title}</span>
                <span className="text-xs text-muted-foreground">{apt.date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {appointments.length === 0 && (
        <Card className="p-10 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No appointments scheduled yet.</p>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Case Plan Review" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.appointment_type} onValueChange={v => setForm(p => ({ ...p, appointment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Office, Zoom, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.date}>
              {saving ? 'Saving...' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}