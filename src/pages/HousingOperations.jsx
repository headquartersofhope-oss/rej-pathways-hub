import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Home, Plus, BedDouble, Users, AlertTriangle, CheckCircle,
  DollarSign, ClipboardList, ChevronRight, Building2, Search, Edit, X, UserPlus, Wrench
} from 'lucide-react';
import HousingSystemHealth from '@/components/housing/HousingSystemHealth';

const STATUS_COLORS = {
  available: 'bg-emerald-100 text-emerald-800',
  occupied: 'bg-blue-100 text-blue-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-orange-100 text-orange-800',
  offline: 'bg-slate-100 text-slate-600',
};

const HOUSE_STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-600',
  under_renovation: 'bg-orange-100 text-orange-800',
  at_capacity: 'bg-red-100 text-red-800',
};

const COMPLIANCE_COLORS = {
  compliant: 'bg-emerald-100 text-emerald-800',
  at_risk: 'bg-yellow-100 text-yellow-800',
  non_compliant: 'bg-red-100 text-red-800',
  pending_inspection: 'bg-blue-100 text-blue-800',
};

function HouseFormModal({ house, onClose, onSave }) {
  const [form, setForm] = useState(house || {
    name: '', address: '', city: '', state: '', zip: '',
    program_type: 'transitional_housing', total_beds: 0,
    status: 'active', compliance_status: 'compliant',
    monthly_fee: '', weekly_fee: '', house_manager_name: '', notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{house ? 'Edit House' : 'Add New House'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">House Name *</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Hope House East" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">State</label>
              <Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Beds</label>
              <Input type="number" value={form.total_beds} onChange={e => setForm({...form, total_beds: parseInt(e.target.value)||0})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Weekly Fee ($)</label>
              <Input type="number" value={form.weekly_fee} onChange={e => setForm({...form, weekly_fee: parseFloat(e.target.value)||''})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Program Type</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.program_type} onChange={e => setForm({...form, program_type: e.target.value})}>
                {['transitional_housing','rapid_rehousing','sober_living','permanent_supportive','shelter','other'].map(t =>
                  <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {['active','inactive','under_renovation','at_capacity'].map(s =>
                  <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                )}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">House Manager Name</label>
              <Input value={form.house_manager_name} onChange={e => setForm({...form, house_manager_name: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Save House</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BedFormModal({ bed, houses, onClose, onSave }) {
  const [form, setForm] = useState(bed || {
    house_id: houses[0]?.id || '', room_number: '', bed_label: '',
    status: 'available', weekly_fee: '', notes: ''
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{bed ? 'Edit Bed' : 'Add New Bed'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">House *</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.house_id} onChange={e => setForm({...form, house_id: e.target.value})}>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Room #</label>
              <Input value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bed Label</label>
              <Input value={form.bed_label} onChange={e => setForm({...form, bed_label: e.target.value})} placeholder="Room 2A" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {['available','occupied','reserved','maintenance','offline'].map(s =>
                  <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Weekly Fee ($)</label>
              <Input type="number" value={form.weekly_fee} onChange={e => setForm({...form, weekly_fee: parseFloat(e.target.value)||''})} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={() => onSave(form)} className="flex-1">Save Bed</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentFormModal({ incident, houses, residents, onClose, onSave }) {
  const [form, setForm] = useState(incident || {
    house_id: houses[0]?.id || '', house_name: houses[0]?.name || '',
    resident_id: '', resident_name: '',
    incident_type: 'other', severity: 'medium',
    incident_date: new Date().toISOString().split('T')[0],
    description: '', action_taken: '', status: 'open',
    follow_up_required: false
  });

  const handleHouseChange = (id) => {
    const h = houses.find(x => x.id === id);
    setForm({...form, house_id: id, house_name: h?.name || ''});
  };
  const handleResidentChange = (id) => {
    const r = residents.find(x => x.id === id);
    setForm({...form, resident_id: id, resident_name: r ? `${r.first_name} ${r.last_name}` : ''});
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{incident ? 'Edit Incident' : 'Report Incident'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground">House</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.house_id} onChange={e => handleHouseChange(e.target.value)}>
              <option value="">Select house...</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Participant (optional)</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.resident_id} onChange={e => handleResidentChange(e.target.value)}>
              <option value="">Not resident-specific</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Incident Type *</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.incident_type} onChange={e => setForm({...form, incident_type: e.target.value})}>
                {['rule_violation','safety_concern','medical','conflict','property_damage','curfew_violation','substance_use','unauthorized_visitor','other'].map(t =>
                  <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Severity</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={form.incident_date} onChange={e => setForm({...form, incident_date: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {['open','under_review','resolved','escalated'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]"
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Action Taken</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={form.action_taken} onChange={e => setForm({...form, action_taken: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="followup" checked={form.follow_up_required} onChange={e => setForm({...form, follow_up_required: e.target.checked})} className="w-4 h-4" />
            <label htmlFor="followup" className="text-sm">Follow-up required</label>
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.description || !form.incident_date}>Save Incident</Button>
        </div>
      </div>
    </div>
  );
}

function PaymentFormModal({ payment, houses, residents, onClose, onSave }) {
  const [form, setForm] = useState(payment || {
    resident_id: '', resident_name: '', house_id: '', house_name: '',
    payment_type: 'weekly_fee', amount_due: '', amount_paid: '',
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash', status: 'pending', notes: ''
  });

  const handleResidentChange = (id) => {
    const r = residents.find(x => x.id === id);
    setForm({...form, resident_id: id, resident_name: r ? `${r.first_name} ${r.last_name}` : ''});
  };
  const handleHouseChange = (id) => {
    const h = houses.find(x => x.id === id);
    setForm({...form, house_id: id, house_name: h?.name || ''});
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{payment ? 'Edit Payment' : 'Record Payment'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Participant *</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.resident_id} onChange={e => handleResidentChange(e.target.value)}>
              <option value="">Select participant...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">House</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.house_id} onChange={e => handleHouseChange(e.target.value)}>
              <option value="">Select house...</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Type</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})}>
                {['weekly_fee','monthly_fee','deposit','other'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {['pending','paid','partial','late','waived','written_off'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1).replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount Due ($) *</label>
              <Input type="number" value={form.amount_due} onChange={e => setForm({...form, amount_due: parseFloat(e.target.value)||''})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount Paid ($)</label>
              <Input type="number" value={form.amount_paid} onChange={e => setForm({...form, amount_paid: parseFloat(e.target.value)||''})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Due Date *</label>
              <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                {['cash','check','money_order','eft','benefits','waived','other'].map(m => <option key={m} value={m}>{m.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.resident_id || !form.amount_due}>Save Payment</Button>
        </div>
      </div>
    </div>
  );
}

export default function HousingOperations() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [houseModal, setHouseModal] = useState(null);
  const [bedModal, setBedModal] = useState(null);
  const [incidentModal, setIncidentModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: () => base44.entities.House.list() });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: () => base44.entities.Bed.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ['incidents'], queryFn: () => base44.entities.Incident.list('-created_date', 100) });
  const { data: payments = [] } = useQuery({ queryKey: ['fee-payments'], queryFn: () => base44.entities.FeePayment.list('-created_date', 100) });
  const { data: residents = [] } = useQuery({ queryKey: ['residents'], queryFn: () => base44.entities.Resident.list() });

  const saveHouse = useMutation({
    mutationFn: (data) => data.id ? base44.entities.House.update(data.id, data) : base44.entities.House.create(data),
    onSuccess: () => { qc.invalidateQueries(['houses']); setHouseModal(null); }
  });

  const saveBed = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Bed.update(data.id, data) : base44.entities.Bed.create(data),
    onSuccess: () => { qc.invalidateQueries(['beds']); setBedModal(null); }
  });

  const saveIncident = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Incident.update(data.id, data) : base44.entities.Incident.create(data),
    onSuccess: () => { qc.invalidateQueries(['incidents']); setIncidentModal(null); }
  });

  const savePayment = useMutation({
    mutationFn: (data) => data.id ? base44.entities.FeePayment.update(data.id, data) : base44.entities.FeePayment.create(data),
    onSuccess: () => { qc.invalidateQueries(['fee-payments']); setPaymentModal(null); }
  });

  const totalBeds = houses.reduce((s, h) => s + (h.total_beds || 0), 0);
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const availableBeds = beds.filter(b => b.status === 'available').length;
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'under_review').length;
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'late').length;
  const nonCompliant = houses.filter(h => h.compliance_status === 'non_compliant').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const filteredHouses = houses.filter(h =>
    !search || h.name?.toLowerCase().includes(search.toLowerCase()) || h.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {houseModal !== null && (
        <HouseFormModal
          house={houseModal === 'new' ? null : houseModal}
          onClose={() => setHouseModal(null)}
          onSave={(data) => saveHouse.mutate(houseModal === 'new' ? data : { ...data, id: houseModal.id })}
        />
      )}
      {bedModal !== null && (
        <BedFormModal
          bed={bedModal === 'new' ? null : bedModal}
          houses={houses}
          onClose={() => setBedModal(null)}
          onSave={(data) => saveBed.mutate(bedModal === 'new' ? data : { ...data, id: bedModal.id })}
        />
      )}
      {incidentModal !== null && (
        <IncidentFormModal
          incident={incidentModal === 'new' ? null : incidentModal}
          houses={houses}
          residents={residents}
          onClose={() => setIncidentModal(null)}
          onSave={(data) => saveIncident.mutate(incidentModal === 'new' ? data : { ...data, id: incidentModal.id })}
        />
      )}
      {paymentModal !== null && (
        <PaymentFormModal
          payment={paymentModal === 'new' ? null : paymentModal}
          houses={houses}
          residents={residents}
          onClose={() => setPaymentModal(null)}
          onSave={(data) => savePayment.mutate(paymentModal === 'new' ? data : { ...data, id: paymentModal.id })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Housing Operations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage houses, beds, occupancy, compliance, and fees</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIncidentModal('new')}><AlertTriangle className="w-4 h-4 mr-1.5" />Report Incident</Button>
          <Button variant="outline" size="sm" onClick={() => setPaymentModal('new')}><DollarSign className="w-4 h-4 mr-1.5" />Record Payment</Button>
          <Button variant="outline" size="sm" onClick={() => setBedModal('new')}><BedDouble className="w-4 h-4 mr-1.5" />Add Bed</Button>
          <Button size="sm" onClick={() => setHouseModal('new')}><Plus className="w-4 h-4 mr-1.5" />Add House</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Houses', value: houses.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Beds', value: totalBeds, icon: BedDouble, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Occupied', value: occupiedBeds, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Available', value: availableBeds, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Open Incidents', value: openIncidents, icon: AlertTriangle, color: openIncidents > 0 ? 'text-red-600' : 'text-slate-400', bg: openIncidents > 0 ? 'bg-red-50' : 'bg-slate-50' },
          { label: 'Pending Fees', value: pendingPayments, icon: DollarSign, color: pendingPayments > 0 ? 'text-orange-600' : 'text-slate-400', bg: pendingPayments > 0 ? 'bg-orange-50' : 'bg-slate-50' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="font-heading text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Occupancy bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">System-Wide Occupancy</span>
            <span className="text-sm font-bold text-foreground">{occupancyRate}% — {occupiedBeds}/{totalBeds} beds</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${occupancyRate >= 90 ? 'bg-red-500' : occupancyRate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          {nonCompliant > 0 && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {nonCompliant} house(s) flagged non-compliant
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Houses</TabsTrigger>
          <TabsTrigger value="beds">Bed Inventory</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({openIncidents})</TabsTrigger>
          <TabsTrigger value="payments">Fee Payments</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        {/* Houses Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search houses..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {filteredHouses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No houses yet. Add your first house to get started.</p>
                <Button className="mt-4" onClick={() => setHouseModal('new')}><Plus className="w-4 h-4 mr-2" />Add House</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHouses.map(h => {
                const houseBeds = beds.filter(b => b.house_id === h.id);
                const houseOccupied = houseBeds.filter(b => b.status === 'occupied').length;
                const houseAvailable = houseBeds.filter(b => b.status === 'available').length;
                const houseIncidents = incidents.filter(i => i.house_id === h.id && (i.status === 'open' || i.status === 'under_review')).length;
                return (
                  <Card key={h.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Home className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{h.name}</p>
                            <p className="text-[11px] text-muted-foreground">{h.city}{h.state ? `, ${h.state}` : ''}</p>
                          </div>
                        </div>
                        <button onClick={() => setHouseModal(h)} className="text-muted-foreground hover:text-foreground">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-3">
                        <Badge className={HOUSE_STATUS_COLORS[h.status] || 'bg-slate-100 text-slate-600'} variant="outline">
                          {h.status?.replace(/_/g,' ')}
                        </Badge>
                        <Badge className={COMPLIANCE_COLORS[h.compliance_status] || 'bg-slate-100 text-slate-600'} variant="outline">
                          {h.compliance_status?.replace(/_/g,' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="font-bold text-base">{houseOccupied}</p>
                          <p className="text-muted-foreground">Occupied</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="font-bold text-base text-emerald-600">{houseAvailable}</p>
                          <p className="text-muted-foreground">Available</p>
                        </div>
                        <div className={`rounded-lg p-2 ${houseIncidents > 0 ? 'bg-red-50' : 'bg-muted/50'}`}>
                          <p className={`font-bold text-base ${houseIncidents > 0 ? 'text-red-600' : ''}`}>{houseIncidents}</p>
                          <p className="text-muted-foreground">Incidents</p>
                        </div>
                      </div>
                      {h.house_manager_name && (
                        <p className="text-[11px] text-muted-foreground mt-2">Manager: {h.house_manager_name}</p>
                      )}
                      {h.weekly_fee && (
                        <p className="text-[11px] text-muted-foreground">Fee: ${h.weekly_fee}/wk</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Beds Tab */}
        <TabsContent value="beds" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{beds.length} beds across {houses.length} houses</p>
            <Button size="sm" onClick={() => setBedModal('new')}><Plus className="w-4 h-4 mr-1.5" />Add Bed</Button>
          </div>
          {beds.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BedDouble className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No beds configured yet.</p>
                <Button className="mt-4" onClick={() => setBedModal('new')} disabled={houses.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />Add Bed
                </Button>
                {houses.length === 0 && <p className="text-xs text-muted-foreground mt-2">Add a house first.</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Bed</th>
                    <th className="text-left py-2 px-3">House</th>
                    <th className="text-left py-2 px-3">Room</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Resident</th>
                    <th className="text-left py-2 px-3">Move-In</th>
                    <th className="text-left py-2 px-3">Fee/wk</th>
                    <th className="text-left py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map(b => {
                    const house = houses.find(h => h.id === b.house_id);
                    return (
                      <tr key={b.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 font-medium">{b.bed_label || `Bed ${b.id?.slice(-4)}`}</td>
                        <td className="py-2 px-3">{house?.name || b.house_name || '—'}</td>
                        <td className="py-2 px-3">{b.room_number || '—'}</td>
                        <td className="py-2 px-3">
                          <Badge className={STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-600'} variant="outline">
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{b.resident_name || (b.status === 'occupied' ? '(linked)' : '—')}</td>
                        <td className="py-2 px-3">{b.move_in_date || '—'}</td>
                        <td className="py-2 px-3">{b.weekly_fee ? `$${b.weekly_fee}` : '—'}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => setBedModal(b)} className="text-muted-foreground hover:text-foreground">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{incidents.length} total · {openIncidents} open</p>
            <Button size="sm" onClick={() => setIncidentModal('new')}><Plus className="w-4 h-4 mr-1.5" />Report Incident</Button>
          </div>
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No incident reports on file.</p>
                <Button className="mt-4" size="sm" onClick={() => setIncidentModal('new')}><Plus className="w-4 h-4 mr-1.5" />Report Incident</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {incidents.map(inc => (
                <Card key={inc.id} className={inc.severity === 'critical' ? 'border-red-300' : inc.severity === 'high' ? 'border-orange-200' : ''}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      inc.severity === 'critical' ? 'bg-red-500' : inc.severity === 'high' ? 'bg-orange-500' :
                      inc.severity === 'medium' ? 'bg-yellow-400' : 'bg-slate-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm capitalize">{inc.incident_type?.replace(/_/g,' ')}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{inc.severity}</Badge>
                        <Badge className={inc.status === 'open' ? 'bg-red-100 text-red-800' : inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'} variant="outline">
                          {inc.status?.replace(/_/g,' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{inc.house_name || 'House N/A'} · {inc.resident_name || 'No resident linked'} · {inc.incident_date}</p>
                      <p className="text-xs mt-1">{inc.description}</p>
                      {inc.action_taken && <p className="text-xs mt-1 text-muted-foreground italic">Action: {inc.action_taken}</p>}
                    </div>
                    <button onClick={() => setIncidentModal(inc)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{payments.length} records · {pendingPayments} outstanding</p>
            <Button size="sm" onClick={() => setPaymentModal('new')}><Plus className="w-4 h-4 mr-1.5" />Record Payment</Button>
          </div>
          {payments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No payment records yet.</p>
                <Button className="mt-4" size="sm" onClick={() => setPaymentModal('new')}><Plus className="w-4 h-4 mr-1.5" />Record Payment</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Participant</th>
                    <th className="text-left py-2 px-3">House</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Due</th>
                    <th className="text-left py-2 px-3">Paid</th>
                    <th className="text-left py-2 px-3">Due Date</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-3">{p.resident_name || '—'}</td>
                      <td className="py-2 px-3">{p.house_name || '—'}</td>
                      <td className="py-2 px-3 capitalize">{p.payment_type?.replace(/_/g,' ')}</td>
                      <td className="py-2 px-3">${p.amount_due}</td>
                      <td className="py-2 px-3">{p.amount_paid ? `$${p.amount_paid}` : '—'}</td>
                      <td className="py-2 px-3">{p.due_date}</td>
                      <td className="py-2 px-3">
                        <Badge className={
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'late' ? 'bg-red-100 text-red-800' :
                          p.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          p.status === 'waived' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        } variant="outline">{p.status}</Badge>
                      </td>
                      <td className="py-2 px-3">
                        <button onClick={() => setPaymentModal(p)} className="text-muted-foreground hover:text-foreground">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        {/* System Health Tab */}
        <TabsContent value="health" className="mt-4">
          <div className="mb-4">
            <h3 className="font-heading font-semibold text-base">Housing System Health</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Run diagnostics to validate housing data integrity. Run Full Sync to repair mismatches between houses, beds, and placement records.
            </p>
          </div>
          <HousingSystemHealth />
        </TabsContent>
      </Tabs>
    </div>
  );
}