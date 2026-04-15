import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const TYPE_LABELS = {
  employment: 'Employment', medical: 'Medical', court: 'Court',
  housing_search: 'Housing Search', document_retrieval: 'Documents', program: 'Program', other: 'Other'
};

export default function RecurringRideModal({ ride, residents, drivers, vehicles, onClose, onSave }) {
  const [form, setForm] = useState(ride || {
    resident_id: '', resident_name: '', request_type: 'employment',
    pickup_address: '', destination_address: '', pickup_time: '',
    return_trip_needed: false, return_time: '',
    recurrence_days: ['monday','tuesday','wednesday','thursday','friday'],
    assigned_driver_id: '', assigned_driver_name: '',
    assigned_vehicle_id: '', assigned_vehicle_name: '',
    status: 'active', start_date: '', end_date: '', notes: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDay = (day) => setForm(f => ({
    ...f,
    recurrence_days: f.recurrence_days?.includes(day)
      ? f.recurrence_days.filter(d => d !== day)
      : [...(f.recurrence_days || []), day]
  }));
  const handleResident = (id) => {
    const r = residents.find(x => x.id === id);
    setForm(f => ({ ...f, resident_id: id, resident_name: r ? `${r.first_name} ${r.last_name}` : '' }));
  };
  const handleDriver = (id) => {
    const d = drivers.find(x => x.id === id);
    setForm(f => ({ ...f, assigned_driver_id: id, assigned_driver_name: d?.full_name || '' }));
  };
  const handleVehicle = (id) => {
    const v = vehicles.find(x => x.id === id);
    setForm(f => ({ ...f, assigned_vehicle_id: id, assigned_vehicle_name: v?.name || '' }));
  };

  const sel = 'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{ride ? 'Edit Recurring Ride' : 'New Recurring Ride Plan'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Participant *</label>
            <select className={sel} value={form.resident_id} onChange={e => handleResident(e.target.value)}>
              <option value="">Select participant...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Trip Type</label>
              <select className={sel} value={form.request_type} onChange={e => set('request_type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className={sel} value={form.status} onChange={e => set('status', e.target.value)}>
                {['active','paused','cancelled'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pickup Address</label>
            <Input value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination *</label>
            <Input value={form.destination_address} onChange={e => set('destination_address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pickup Time *</label>
              <Input type="time" value={form.pickup_time} onChange={e => set('pickup_time', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.return_trip_needed} onChange={e => set('return_trip_needed', e.target.checked)} className="w-4 h-4" />
            <label className="text-sm">Return trip needed</label>
          </div>
          {form.return_trip_needed && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Return Time</label>
              <Input type="time" value={form.return_time} onChange={e => set('return_time', e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Recurrence Days *</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    form.recurrence_days?.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}>
                  {day.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Driver</label>
              <select className={sel} value={form.assigned_driver_id} onChange={e => handleDriver(e.target.value)}>
                <option value="">Unassigned</option>
                {drivers.filter(d => d.status === 'active').map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Vehicle</label>
              <select className={sel} value={form.assigned_vehicle_id} onChange={e => handleVehicle(e.target.value)}>
                <option value="">Unassigned</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">End Date (optional)</label>
            <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)}
            disabled={!form.resident_id || !form.pickup_time || !form.recurrence_days?.length}>
            Save Plan
          </Button>
        </div>
      </div>
    </div>
  );
}