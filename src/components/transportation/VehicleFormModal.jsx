import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, AlertTriangle } from 'lucide-react';

export default function VehicleFormModal({ vehicle, onClose, onSave }) {
  const [form, setForm] = useState(vehicle || {
    name: '', make: '', model: '', year: '', color: '', license_plate: '',
    capacity: 7, status: 'active', fuel_type: 'gasoline',
    insurance_expiry: '', registration_expiry: '', last_inspection_date: '',
    next_inspection_date: '', mileage: '', notes: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Flag compliance warnings
  const today = new Date().toISOString().split('T')[0];
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const expiringDate = in30.toISOString().split('T')[0];
  const insuranceWarn = form.insurance_expiry && form.insurance_expiry <= expiringDate;
  const regWarn = form.registration_expiry && form.registration_expiry <= expiringDate;

  const sel = 'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {(insuranceWarn || regWarn) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2 text-xs text-orange-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500" />
              {insuranceWarn && <span>Insurance expiring soon. </span>}
              {regWarn && <span>Registration expiring soon.</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Vehicle Name / Nickname *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Van 1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Make</label>
              <Input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Ford" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Transit" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Input value={form.year} onChange={e => set('year', e.target.value)} placeholder="2022" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <Input value={form.color} onChange={e => set('color', e.target.value)} placeholder="White" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">License Plate</label>
              <Input value={form.license_plate} onChange={e => set('license_plate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Capacity (seats)</label>
              <Input type="number" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value) || 7)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className={sel} value={form.status} onChange={e => set('status', e.target.value)}>
                {['active','in_use','maintenance','out_of_service'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fuel Type</label>
              <select className={sel} value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
                {['gasoline','diesel','electric','hybrid'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mileage</label>
              <Input type="number" value={form.mileage || ''} onChange={e => set('mileage', parseInt(e.target.value) || '')} />
            </div>
            <div>
              <label className={`text-xs font-medium ${insuranceWarn ? 'text-orange-600' : 'text-muted-foreground'}`}>Insurance Expiry</label>
              <Input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} className={insuranceWarn ? 'border-orange-400' : ''} />
            </div>
            <div>
              <label className={`text-xs font-medium ${regWarn ? 'text-orange-600' : 'text-muted-foreground'}`}>Registration Expiry</label>
              <Input type="date" value={form.registration_expiry} onChange={e => set('registration_expiry', e.target.value)} className={regWarn ? 'border-orange-400' : ''} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Last Inspection</label>
              <Input type="date" value={form.last_inspection_date} onChange={e => set('last_inspection_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Next Inspection</label>
              <Input type="date" value={form.next_inspection_date} onChange={e => set('next_inspection_date', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.name}>Save Vehicle</Button>
        </div>
      </div>
    </div>
  );
}