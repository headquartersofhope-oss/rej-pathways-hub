import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Car, Plus, Clock, CheckCircle, AlertTriangle, X, Edit, Search, MapPin, Calendar } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600',
  no_show: 'bg-red-100 text-red-800',
};

const TYPE_LABELS = {
  employment: 'Employment', medical: 'Medical', court: 'Court',
  housing_search: 'Housing Search', document_retrieval: 'Documents',
  program: 'Program', other: 'Other'
};

function RequestModal({ req, residents, onClose, onSave }) {
  const [form, setForm] = useState(req || {
    resident_id: residents[0]?.id || '', resident_name: '',
    request_type: 'employment', pickup_address: '', destination_address: '',
    requested_date: '', requested_time: '', return_trip_needed: false,
    status: 'pending', notes: ''
  });

  const handleResidentChange = (id) => {
    const r = residents.find(x => x.id === id);
    setForm({...form, resident_id: id, resident_name: r ? `${r.first_name} ${r.last_name}` : ''});
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{req ? 'Edit Request' : 'New Transportation Request'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Participant *</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.resident_id} onChange={e => handleResidentChange(e.target.value)}>
              <option value="">Select participant...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Trip Type *</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.request_type} onChange={e => setForm({...form, request_type: e.target.value})}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pickup Address</label>
            <Input value={form.pickup_address} onChange={e => setForm({...form, pickup_address: e.target.value})} placeholder="123 Main St" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination *</label>
            <Input value={form.destination_address} onChange={e => setForm({...form, destination_address: e.target.value})} placeholder="456 Oak Ave" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={form.requested_date} onChange={e => setForm({...form, requested_date: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input type="time" value={form.requested_time} onChange={e => setForm({...form, requested_time: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="return" checked={form.return_trip_needed} onChange={e => setForm({...form, return_trip_needed: e.target.checked})} className="w-4 h-4" />
            <label htmlFor="return" className="text-sm">Return trip needed</label>
          </div>
          {form.return_trip_needed && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Return Time</label>
              <Input type="time" value={form.return_time} onChange={e => setForm({...form, return_time: e.target.value})} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)}>Save Request</Button>
        </div>
      </div>
    </div>
  );
}

export default function TransportationHub() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const { data: requests = [] } = useQuery({ queryKey: ['transport-requests'], queryFn: () => base44.entities.TransportationRequest.list('-created_date', 200) });
  const { data: residents = [] } = useQuery({ queryKey: ['residents'], queryFn: () => base44.entities.Resident.list() });

  const saveRequest = useMutation({
    mutationFn: (data) => data.id ? base44.entities.TransportationRequest.update(data.id, data) : base44.entities.TransportationRequest.create(data),
    onSuccess: () => { qc.invalidateQueries(['transport-requests']); setModal(null); }
  });

  const pending = requests.filter(r => r.status === 'pending').length;
  const scheduled = requests.filter(r => r.status === 'scheduled').length;
  const today = new Date().toISOString().split('T')[0];
  const todayTrips = requests.filter(r => r.requested_date === today).length;
  const completedThisMonth = requests.filter(r => {
    const m = r.requested_date?.slice(0,7);
    return r.status === 'completed' && m === today.slice(0,7);
  }).length;

  const filtered = requests.filter(r => {
    const matchSearch = !search || r.resident_name?.toLowerCase().includes(search.toLowerCase()) || r.destination_address?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || r.status === tab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      {modal !== null && (
        <RequestModal
          req={modal === 'new' ? null : modal}
          residents={residents}
          onClose={() => setModal(null)}
          onSave={(data) => saveRequest.mutate(modal === 'new' ? data : {...data, id: modal.id})}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Transportation Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Coordinate participant transportation requests and scheduling</p>
        </div>
        <Button onClick={() => setModal('new')}><Plus className="w-4 h-4 mr-2" />New Request</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Requests', value: pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Scheduled Today', value: todayTrips, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Confirmed / Scheduled', value: scheduled, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Completed This Month', value: completedThisMonth, icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or destination..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[['pending','Pending'],['approved','Approved'],['scheduled','Scheduled'],['completed','Completed'],['all','All']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Requests list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-4">No transportation requests found.</p>
            <Button onClick={() => setModal('new')}><Plus className="w-4 h-4 mr-2" />New Request</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${STATUS_COLORS[r.status]?.split(' ')[0] || 'bg-slate-50'}`}>
                  <Car className={`w-4 h-4 ${STATUS_COLORS[r.status]?.split(' ')[1] || 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{r.resident_name || 'Unknown Participant'}</p>
                    <Badge className={STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'} variant="outline">{r.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[r.request_type] || r.request_type}</Badge>
                    {r.return_trip_needed && <Badge variant="outline" className="text-[10px]">Return trip</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {r.requested_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.requested_date} {r.requested_time || ''}</span>}
                    {r.destination_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.destination_address}</span>}
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{r.notes}</p>}
                </div>
                <button onClick={() => setModal(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}