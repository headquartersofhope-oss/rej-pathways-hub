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
  DollarSign, ClipboardList, ChevronRight, Building2, Search, Edit, X
} from 'lucide-react';

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

export default function HousingOperations() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [houseModal, setHouseModal] = useState(null); // null | 'new' | house object
  const [bedModal, setBedModal] = useState(null);

  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: () => base44.entities.House.list() });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: () => base44.entities.Bed.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ['incidents'], queryFn: () => base44.entities.Incident.list('-created_date', 50) });
  const { data: payments = [] } = useQuery({ queryKey: ['fee-payments'], queryFn: () => base44.entities.FeePayment.list('-created_date', 100) });

  const saveHouse = useMutation({
    mutationFn: (data) => data.id ? base44.entities.House.update(data.id, data) : base44.entities.House.create(data),
    onSuccess: () => { qc.invalidateQueries(['houses']); setHouseModal(null); }
  });

  const saveBed = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Bed.update(data.id, data) : base44.entities.Bed.create(data),
    onSuccess: () => { qc.invalidateQueries(['beds']); setBedModal(null); }
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Housing Operations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage houses, beds, occupancy, compliance, and fees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBedModal('new')}><BedDouble className="w-4 h-4 mr-2" />Add Bed</Button>
          <Button onClick={() => setHouseModal('new')}><Plus className="w-4 h-4 mr-2" />Add House</Button>
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
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No incident reports on file.</p>
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
                        <p className="font-medium text-sm">{inc.incident_type?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</p>
                        <Badge variant="outline" className="text-[10px]">{inc.severity}</Badge>
                        <Badge className={inc.status === 'open' ? 'bg-red-100 text-red-800' : inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'} variant="outline">
                          {inc.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{inc.house_name || 'House N/A'} · {inc.resident_name || 'No resident linked'} · {inc.incident_date}</p>
                      <p className="text-xs mt-1">{inc.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No payment records yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Resident</th>
                    <th className="text-left py-2 px-3">House</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Amount Due</th>
                    <th className="text-left py-2 px-3">Amount Paid</th>
                    <th className="text-left py-2 px-3">Due Date</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-3">{p.resident_name || '—'}</td>
                      <td className="py-2 px-3">{p.house_name || '—'}</td>
                      <td className="py-2 px-3">{p.payment_type?.replace(/_/g,' ')}</td>
                      <td className="py-2 px-3">${p.amount_due}</td>
                      <td className="py-2 px-3">{p.amount_paid ? `$${p.amount_paid}` : '—'}</td>
                      <td className="py-2 px-3">{p.due_date}</td>
                      <td className="py-2 px-3">
                        <Badge className={
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'late' ? 'bg-red-100 text-red-800' :
                          p.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-600'
                        } variant="outline">{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}