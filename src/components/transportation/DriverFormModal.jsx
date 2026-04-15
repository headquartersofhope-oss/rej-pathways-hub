import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function DriverFormModal({ driver, vehicles, onClose, onSave }) {
  const [form, setForm] = useState(driver || {
    full_name: '', phone: '', email: '', license_number: '', license_expiry: '',
    status: 'active', availability_days: ['monday','tuesday','wednesday','thursday','friday'],
    shift_start: '08:00', shift_end: '17:00',
    assigned_vehicle_id: '', assigned_vehicle_name: '', notes: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      availability_days: f.availability_days?.includes(day)
        ? f.availability_days.filter(d => d !== day)
        : [...(f.availability_days || []), day]
    }));
  };
  const handleVehicle = (id) => {
    const v = vehicles.find(x => x.id === id);
    setForm(f => ({ ...f, assigned_vehicle_id: id, assigned_vehicle_name: v?.name || '' }));
  };

  const sel = 'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{driver ? 'Edit Driver' : 'Add Driver'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
              <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">License #</label>
              <Input value={form.license_number} onChange={e => set('license_number', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">License Expiry</label>
              <Input type="date" value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className={sel} value={form.status} onChange={e => set('status', e.target.value)}>
                {['active','inactive','on_leave','suspended'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Primary Vehicle</label>
              <select className={sel} value={form.assigned_vehicle_id} onChange={e => handleVehicle(e.target.value)}>
                <option value="">None</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Shift Start</label>
              <Input type="time" value={form.shift_start} onChange={e => set('shift_start', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Shift End</label>
              <Input type="time" value={form.shift_end} onChange={e => set('shift_end', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Available Days</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    form.availability_days?.includes(day)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}>
                  {day.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.full_name}>Save Driver</Button>
        </div>
      </div>
    </div>
  );
}