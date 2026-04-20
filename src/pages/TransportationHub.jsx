import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Car, Plus, Clock, CheckCircle, AlertTriangle, Search, MapPin,
  Calendar, Users, Repeat, Edit, Trash2, User, Truck, LayoutGrid
} from 'lucide-react';

import RideRequestModal from '@/components/transportation/RideRequestModal';
import DriverFormModal from '@/components/transportation/DriverFormModal';
import VehicleFormModal from '@/components/transportation/VehicleFormModal';
import RecurringRideModal from '@/components/transportation/RecurringRideModal';
import DispatchBoard from '@/components/transportation/DispatchBoard';
import AIDispatchPanel from '@/components/transportation/AIDispatchPanel';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600',
  no_show: 'bg-red-100 text-red-800',
};

const VEHICLE_STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-orange-100 text-orange-800',
  out_of_service: 'bg-red-100 text-red-800',
};

const DRIVER_STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-600',
  on_leave: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
};

const TYPE_LABELS = {
  employment: 'Employment', medical: 'Medical', court: 'Court',
  housing_search: 'Housing Search', document_retrieval: 'Documents',
  program: 'Program', other: 'Other'
};

export default function TransportationHub() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState('dispatch');
  const [rideFilter, setRideFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [rideModal, setRideModal] = useState(null);
  const [driverModal, setDriverModal] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(null);
  const [recurringModal, setRecurringModal] = useState(null);

  // Data fetching
  const { data: requests = [] } = useQuery({ queryKey: ['transport-requests'], queryFn: () => base44.entities.TransportationRequest.list('-created_date', 500) });
  const { data: residents = [] } = useQuery({ queryKey: ['residents'], queryFn: () => base44.entities.Resident.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: recurringRides = [] } = useQuery({ queryKey: ['recurring-rides'], queryFn: () => base44.entities.RecurringRide.list() });

  // Mutations
  const saveRequest = useMutation({
    mutationFn: (data) => data.id ? base44.entities.TransportationRequest.update(data.id, data) : base44.entities.TransportationRequest.create(data),
    onSuccess: () => { qc.invalidateQueries(['transport-requests']); setRideModal(null); }
  });
  const saveDriver = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Driver.update(data.id, data) : base44.entities.Driver.create(data),
    onSuccess: () => { qc.invalidateQueries(['drivers']); setDriverModal(null); }
  });
  const saveVehicle = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Vehicle.update(data.id, data) : base44.entities.Vehicle.create(data),
    onSuccess: () => { qc.invalidateQueries(['vehicles']); setVehicleModal(null); }
  });
  const saveRecurring = useMutation({
    mutationFn: (data) => data.id ? base44.entities.RecurringRide.update(data.id, data) : base44.entities.RecurringRide.create(data),
    onSuccess: () => { qc.invalidateQueries(['recurring-rides']); setRecurringModal(null); }
  });

  // KPI calculations
  const today = new Date().toISOString().split('T')[0];
  const todayTrips = requests.filter(r => r.requested_date === today).length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const unassigned = requests.filter(r => (r.status === 'pending' || r.status === 'approved' || r.status === 'scheduled') && !r.assigned_driver).length;
  const completedThisMonth = requests.filter(r => r.status === 'completed' && r.requested_date?.startsWith(today.slice(0, 7))).length;
  const noShowCount = requests.filter(r => r.status === 'no_show').length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status === 'in_use').length;
  const activeRecurring = recurringRides.filter(r => r.status === 'active').length;

  // Vehicle compliance warnings
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const complianceAlerts = vehicles.filter(v =>
    (v.insurance_expiry && new Date(v.insurance_expiry) <= in30) ||
    (v.registration_expiry && new Date(v.registration_expiry) <= in30)
  ).length;

  // Filtered ride requests
  const filteredRequests = requests.filter(r => {
    const matchSearch = !search || r.resident_name?.toLowerCase().includes(search.toLowerCase()) || r.destination_address?.toLowerCase().includes(search.toLowerCase()) || r.assigned_driver?.toLowerCase().includes(search.toLowerCase());
    const matchTab = rideFilter === 'all' || r.status === rideFilter || (rideFilter === 'today' && r.requested_date === today) || (rideFilter === 'unassigned' && !r.assigned_driver && ['pending','approved','scheduled'].includes(r.status));
    return matchSearch && matchTab;
  });

  return (
     <div className="space-y-8">
       {/* Modals */}
      {rideModal !== null && (
        <RideRequestModal
          req={rideModal === 'new' ? null : rideModal}
          residents={residents} drivers={drivers} vehicles={vehicles}
          onClose={() => setRideModal(null)}
          onSave={(data) => saveRequest.mutate(rideModal === 'new' ? data : { ...data, id: rideModal.id })}
        />
      )}
      {driverModal !== null && (
        <DriverFormModal
          driver={driverModal === 'new' ? null : driverModal}
          vehicles={vehicles}
          onClose={() => setDriverModal(null)}
          onSave={(data) => saveDriver.mutate(driverModal === 'new' ? data : { ...data, id: driverModal.id })}
        />
      )}
      {vehicleModal !== null && (
        <VehicleFormModal
          vehicle={vehicleModal === 'new' ? null : vehicleModal}
          onClose={() => setVehicleModal(null)}
          onSave={(data) => saveVehicle.mutate(vehicleModal === 'new' ? data : { ...data, id: vehicleModal.id })}
        />
      )}
      {recurringModal !== null && (
        <RecurringRideModal
          ride={recurringModal === 'new' ? null : recurringModal}
          residents={residents} drivers={drivers} vehicles={vehicles}
          onClose={() => setRecurringModal(null)}
          onSave={(data) => saveRecurring.mutate(recurringModal === 'new' ? data : { ...data, id: recurringModal.id })}
        />
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border border-primary/10 rounded-2xl p-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold">Transportation Hub</h1>
            <p className="text-sm text-muted-foreground mt-2">{activeDrivers} drivers · {activeVehicles} vehicles · {activeRecurring} recurring rides</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="transition-smooth hover:shadow-sm" onClick={() => setVehicleModal('new')}><Truck className="w-4 h-4 mr-1.5" />Add Vehicle</Button>
            <Button variant="outline" size="sm" className="transition-smooth hover:shadow-sm" onClick={() => setDriverModal('new')}><User className="w-4 h-4 mr-1.5" />Add Driver</Button>
            <Button variant="outline" size="sm" className="transition-smooth hover:shadow-sm" onClick={() => setRecurringModal('new')}><Repeat className="w-4 h-4 mr-1.5" />Recurring Ride</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-smooth" onClick={() => setRideModal('new')}><Plus className="w-4 h-4 mr-1.5" />New Request</Button>
          </div>
        </div>
      </div>

      {/* KPIs - Metric Cards */}
      <div>
        <h3 className="font-heading text-lg font-bold mb-4 text-foreground">Fleet Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
          {[
            { label: 'Today', value: todayTrips, color: 'text-blue-600', bg: 'bg-blue-100', icon: Calendar },
            { label: 'Pending', value: pending, color: pending > 0 ? 'text-yellow-600' : 'text-slate-500', bg: pending > 0 ? 'bg-yellow-100' : 'bg-slate-100', icon: Clock },
            { label: 'Unassigned', value: unassigned, color: unassigned > 0 ? 'text-orange-600' : 'text-slate-500', bg: unassigned > 0 ? 'bg-orange-100' : 'bg-slate-100', icon: AlertTriangle },
            { label: 'This Month', value: completedThisMonth, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle },
            { label: 'No-Shows', value: noShowCount, color: noShowCount > 0 ? 'text-red-600' : 'text-slate-500', bg: noShowCount > 0 ? 'bg-red-100' : 'bg-slate-100', icon: AlertTriangle },
            { label: 'Drivers', value: activeDrivers, color: 'text-indigo-600', bg: 'bg-indigo-100', icon: Users },
            { label: 'Vehicles', value: activeVehicles, color: 'text-teal-600', bg: 'bg-teal-100', icon: Car },
            { label: 'Recurring', value: activeRecurring, color: 'text-purple-600', bg: 'bg-purple-100', icon: Repeat },
          ].map((s, i) => (
            <Card key={i} className="metric-card border hover:shadow-lg transition-smooth"><CardContent className="p-5">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
      </div>

      {/* Compliance warning */}
      {complianceAlerts > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2 text-sm text-orange-800">
          <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500" />
          <span><strong>{complianceAlerts} vehicle(s)</strong> have insurance or registration expiring within 30 days. Check Fleet tab.</span>
        </div>
      )}

      {/* Main tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="dispatch"><LayoutGrid className="w-3.5 h-3.5 mr-1.5" />Dispatch Board</TabsTrigger>
          <TabsTrigger value="rides"><Car className="w-3.5 h-3.5 mr-1.5" />All Rides</TabsTrigger>
          <TabsTrigger value="recurring"><Repeat className="w-3.5 h-3.5 mr-1.5" />Recurring Plans ({activeRecurring})</TabsTrigger>
          <TabsTrigger value="drivers"><Users className="w-3.5 h-3.5 mr-1.5" />Drivers ({activeDrivers})</TabsTrigger>
          <TabsTrigger value="fleet"><Truck className="w-3.5 h-3.5 mr-1.5" />Fleet ({activeVehicles})</TabsTrigger>
          <TabsTrigger value="ai">AI Dispatch</TabsTrigger>
        </TabsList>

        {/* DISPATCH BOARD */}
        <TabsContent value="dispatch" className="mt-4">
          <DispatchBoard
            requests={requests} drivers={drivers} vehicles={vehicles}
            onEdit={(r) => setRideModal(r)}
          />
        </TabsContent>

        {/* ALL RIDES */}
        <TabsContent value="rides" className="mt-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search participant, destination, driver..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {[['pending','Pending'],['today','Today'],['unassigned','Unassigned'],['scheduled','Scheduled'],['completed','Completed'],['no_show','No-Show'],['all','All']].map(([v, l]) => (
                <button key={v} onClick={() => setRideFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${rideFilter === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setRideModal('new')}><Plus className="w-4 h-4 mr-1.5" />New</Button>
          </div>
          {filteredRequests.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No rides match this filter.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(r => (
                <Card key={r.id} className={`metric-card border hover:shadow-lg transition-smooth ${r.incident_noted ? 'border-red-200 bg-red-50/30' : ''}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{r.resident_name || 'Unknown'}</p>
                        <Badge className={STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'} variant="outline">{r.status?.replace(/_/g,' ')}</Badge>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[r.request_type] || r.request_type}</Badge>
                        {r.return_trip_needed && <Badge variant="outline" className="text-[10px]">+Return</Badge>}
                        {r.incident_noted && <Badge className="bg-red-100 text-red-800" variant="outline">Incident</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {r.requested_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.requested_date} {r.requested_time || ''}</span>}
                        {r.destination_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.destination_address}</span>}
                        {r.assigned_driver && <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.assigned_driver}</span>}
                        {r.vehicle && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{r.vehicle}</span>}
                      </div>
                      {r.no_show_reason && <p className="text-xs text-red-700 mt-1">No-show: {r.no_show_reason}</p>}
                    </div>
                    <button onClick={() => setRideModal(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RECURRING PLANS */}
        <TabsContent value="recurring" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{recurringRides.length} plan(s) · {activeRecurring} active</p>
            <Button size="sm" onClick={() => setRecurringModal('new')}><Plus className="w-4 h-4 mr-1.5" />New Plan</Button>
          </div>
          {recurringRides.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Repeat className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">No recurring ride plans yet. Set up standing rides for regular commuters.</p>
              <Button size="sm" onClick={() => setRecurringModal('new')}><Plus className="w-4 h-4 mr-1.5" />New Plan</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {recurringRides.map(r => (
                <Card key={r.id} className={`metric-card border hover:shadow-lg transition-smooth ${r.status === 'paused' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <Repeat className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{r.resident_name}</p>
                        <Badge className={r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : r.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600'} variant="outline">{r.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[r.request_type] || r.request_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.pickup_time || 'No time'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.destination_address || 'No destination'}</span>
                        {r.assigned_driver_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.assigned_driver_name}</span>}
                      </div>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {r.recurrence_days?.map(d => (
                          <span key={d} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">{d.slice(0,3).toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setRecurringModal(r)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DRIVERS */}
        <TabsContent value="drivers" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{drivers.length} driver(s) · {activeDrivers} active</p>
            <Button size="sm" onClick={() => setDriverModal('new')}><Plus className="w-4 h-4 mr-1.5" />Add Driver</Button>
          </div>
          {drivers.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">No drivers on record. Add your first driver to begin dispatching.</p>
              <Button size="sm" onClick={() => setDriverModal('new')}><Plus className="w-4 h-4 mr-1.5" />Add Driver</Button>
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map(d => {
                const today_ = new Date().toISOString().split('T')[0];
                const licenseExpiring = d.license_expiry && d.license_expiry <= new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
                const todayRides = requests.filter(r => r.assigned_driver_id === d.id && r.requested_date === today).length;
                return (
                  <Card key={d.id} className={`metric-card border hover:shadow-lg transition-smooth ${licenseExpiring ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold">
                            {d.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{d.full_name}</p>
                            <p className="text-xs text-muted-foreground">{d.phone || d.email || '—'}</p>
                          </div>
                        </div>
                        <button onClick={() => setDriverModal(d)} className="text-muted-foreground hover:text-foreground">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-3">
                        <Badge className={DRIVER_STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-600'} variant="outline">{d.status?.replace(/_/g,' ')}</Badge>
                        {licenseExpiring && <Badge className="bg-orange-100 text-orange-800" variant="outline">License expiring</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {d.assigned_vehicle_name && <p className="flex items-center gap-1.5"><Car className="w-3 h-3" />{d.assigned_vehicle_name}</p>}
                        {d.shift_start && <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{d.shift_start} – {d.shift_end}</p>}
                        <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{todayRides} ride(s) today</p>
                        {d.availability_days?.length > 0 && (
                          <div className="flex gap-1 flex-wrap pt-1">
                            {d.availability_days.map(day => (
                              <span key={day} className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-medium">{day.slice(0,3).toUpperCase()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* FLEET */}
        <TabsContent value="fleet" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{vehicles.length} vehicle(s) · {activeVehicles} operational</p>
            <Button size="sm" onClick={() => setVehicleModal('new')}><Plus className="w-4 h-4 mr-1.5" />Add Vehicle</Button>
          </div>
          {vehicles.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">No vehicles in fleet. Add your first vehicle to start dispatching.</p>
              <Button size="sm" onClick={() => setVehicleModal('new')}><Plus className="w-4 h-4 mr-1.5" />Add Vehicle</Button>
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(v => {
                const in30_ = new Date(); in30_.setDate(in30_.getDate() + 30);
                const insuranceWarn = v.insurance_expiry && new Date(v.insurance_expiry) <= in30_;
                const regWarn = v.registration_expiry && new Date(v.registration_expiry) <= in30_;
                const todayRides = requests.filter(r => r.assigned_vehicle_id === v.id && r.requested_date === today).length;
                return (
                  <Card key={v.id} className={`metric-card border hover:shadow-lg transition-smooth ${(insuranceWarn || regWarn) ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Car className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{v.name}</p>
                            <p className="text-xs text-muted-foreground">{[v.year, v.make, v.model].filter(Boolean).join(' ') || '—'}</p>
                          </div>
                        </div>
                        <button onClick={() => setVehicleModal(v)} className="text-muted-foreground hover:text-foreground">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-3">
                        <Badge className={VEHICLE_STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'} variant="outline">{v.status?.replace(/_/g,' ')}</Badge>
                        <Badge variant="outline" className="text-[10px]">{v.capacity || '?'} seats</Badge>
                        {insuranceWarn && <Badge className="bg-orange-100 text-orange-800" variant="outline">Insurance ⚠️</Badge>}
                        {regWarn && <Badge className="bg-orange-100 text-orange-800" variant="outline">Reg ⚠️</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {v.license_plate && <p>Plate: {v.license_plate}</p>}
                        {v.insurance_expiry && <p className={insuranceWarn ? 'text-orange-600 font-medium' : ''}>Insurance: {v.insurance_expiry}</p>}
                        {v.registration_expiry && <p className={regWarn ? 'text-orange-600 font-medium' : ''}>Registration: {v.registration_expiry}</p>}
                        {v.mileage && <p>Mileage: {Number(v.mileage).toLocaleString()} mi</p>}
                        <p className="flex items-center gap-1"><Calendar className="w-3 h-3" />{todayRides} ride(s) today</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* AI DISPATCH */}
        <TabsContent value="ai" className="mt-4">
          <AIDispatchPanel
            requests={requests}
            drivers={drivers}
            vehicles={vehicles}
            recurringRides={recurringRides}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}