import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const STATUS_OPTIONS = ['pending','approved','scheduled','in_progress','completed','cancelled','no_show'];
const TYPE_LABELS = {
  employment: 'Employment', medical: 'Medical', court: 'Court',
  housing_search: 'Housing Search', document_retrieval: 'Documents',
  program: 'Program', other: 'Other'
};

export default function RideRequestModal({ req, residents, drivers, vehicles, onClose, onSave }) {
  const [form, setForm] = useState(req || {
    resident_id: '', resident_name: '',
    request_type: 'employment', pickup_address: '', destination_address: '',
    requested_date: '', requested_time: '', return_trip_needed: false, return_time: '',
    status: 'pending', assigned_driver_id: '', assigned_driver: '',
    assigned_vehicle_id: '', vehicle: '', cost: '', funding_source: '', notes: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleResident = (id) => {
    const r = residents.find(x => x.id === id);
    setForm(f => ({ ...f, resident_id: id, resident_name: r ? `${r.first_name} ${r.last_name}` : '' }));
  };
  const handleDriver = (id) => {
    const d = drivers.find(x => x.id === id);
    setForm(f => ({ ...f, assigned_driver_id: id, assigned_driver: d?.full_name || '' }));
  };
  const handleVehicle = (id) => {
    const v = vehicles.find(x => x.id === id);
    setForm(f => ({ ...f, assigned_vehicle_id: id, vehicle: v?.name || '' }));
  };

  const sel = (cls = '') => `w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm ${cls}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{req ? 'Edit Ride Request' : 'New Ride Request'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Participant */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Participant *</label>
            <select className={sel()} value={form.resident_id} onChange={e => handleResident(e.target.value)}>
              <option value="">Select participant...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>

          {/* Trip type + status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Trip Type *</label>
              <select className={sel()} value={form.request_type} onChange={e => set('request_type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className={sel()} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>

          {/* Addresses */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pickup Address</label>
            <Input value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} placeholder="123 Main St" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination *</label>
            <Input value={form.destination_address} onChange={e => set('destination_address', e.target.value)} placeholder="456 Oak Ave" />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={form.requested_date} onChange={e => set('requested_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pickup Time</label>
              <Input type="time" value={form.requested_time} onChange={e => set('requested_time', e.target.value)} />
            </div>
          </div>

          {/* Return trip */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="return" checked={form.return_trip_needed} onChange={e => set('return_trip_needed', e.target.checked)} className="w-4 h-4" />
            <label htmlFor="return" className="text-sm">Return trip needed</label>
          </div>
          {form.return_trip_needed && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Return Time</label>
              <Input type="time" value={form.return_time} onChange={e => set('return_time', e.target.value)} />
            </div>
          )}

          {/* Driver + Vehicle assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Assign Driver</label>
              <select className={sel()} value={form.assigned_driver_id} onChange={e => handleDriver(e.target.value)}>
                <option value="">Unassigned</option>
                {drivers.filter(d => d.status === 'active').map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Assign Vehicle</label>
              <select className={sel()} value={form.assigned_vehicle_id} onChange={e => handleVehicle(e.target.value)}>
                <option value="">Unassigned</option>
                {vehicles.filter(v => v.status === 'active' || v.status === 'in_use').map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.capacity} seats)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Route order */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pickup Order (route sequence)</label>
            <Input type="number" min="1" value={form.pickup_order || ''} onChange={e => set('pickup_order', parseInt(e.target.value) || '')} placeholder="1" />
          </div>

          {/* Cost + Funding */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cost ($)</label>
              <Input type="number" value={form.cost || ''} onChange={e => set('cost', parseFloat(e.target.value) || '')} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Funding Source</label>
              <Input value={form.funding_source || ''} onChange={e => set('funding_source', e.target.value)} placeholder="Grant, general, etc." />
            </div>
          </div>

          {/* No-show handling */}
          {form.status === 'no_show' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">No-Show Reason</label>
              <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                value={form.no_show_reason || ''} onChange={e => set('no_show_reason', e.target.value)} />
            </div>
          )}

          {/* Incident */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="incident" checked={form.incident_noted || false} onChange={e => set('incident_noted', e.target.checked)} className="w-4 h-4" />
            <label htmlFor="incident" className="text-sm text-red-700 font-medium">Incident occurred on this trip</label>
          </div>
          {form.incident_noted && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Incident Description</label>
              <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                value={form.incident_description || ''} onChange={e => set('incident_description', e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)}
            disabled={!form.resident_id || !form.requested_date}>
            Save Ride
          </Button>
        </div>
      </div>
    </div>
  );
}