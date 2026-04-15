import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, User, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600',
  no_show: 'bg-red-100 text-red-800',
};

export default function DispatchBoard({ requests, drivers, vehicles, onEdit }) {
  const today = new Date().toISOString().split('T')[0];
  const todayRequests = requests.filter(r => r.requested_date === today);

  // Group by driver
  const byDriver = {};
  todayRequests.forEach(r => {
    const key = r.assigned_driver || 'unassigned';
    if (!byDriver[key]) byDriver[key] = { driver: r.assigned_driver, driverId: r.assigned_driver_id, rides: [] };
    byDriver[key].rides.push(r);
  });

  // Sort each driver's rides by time then pickup_order
  Object.values(byDriver).forEach(d => {
    d.rides.sort((a, b) => {
      if (a.pickup_order && b.pickup_order) return a.pickup_order - b.pickup_order;
      if (a.requested_time && b.requested_time) return a.requested_time.localeCompare(b.requested_time);
      return 0;
    });
  });

  const unassigned = todayRequests.filter(r => !r.assigned_driver);
  const noShows = todayRequests.filter(r => r.status === 'no_show');
  const incidents = todayRequests.filter(r => r.incident_noted);
  const completed = todayRequests.filter(r => r.status === 'completed').length;

  // Vehicle compliance warnings
  const today_ = new Date().toISOString().split('T')[0];
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const expiringVehicles = vehicles.filter(v =>
    (v.insurance_expiry && v.insurance_expiry <= in30.toISOString().split('T')[0]) ||
    (v.registration_expiry && v.registration_expiry <= in30.toISOString().split('T')[0])
  );

  return (
    <div className="space-y-4">
      {/* Today summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Rides", value: todayRequests.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Car },
          { label: 'Completed', value: completed, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
          { label: 'No-Shows', value: noShows.length, color: noShows.length > 0 ? 'text-red-600' : 'text-slate-400', bg: noShows.length > 0 ? 'bg-red-50' : 'bg-slate-50', icon: AlertTriangle },
          { label: 'Unassigned', value: unassigned.length, color: unassigned.length > 0 ? 'text-orange-600' : 'text-slate-400', bg: unassigned.length > 0 ? 'bg-orange-50' : 'bg-slate-50', icon: User },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-3">
            <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <p className={`font-heading text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Compliance alerts */}
      {expiringVehicles.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2 text-sm text-orange-800">
          <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500" />
          <span><strong>Vehicle compliance alert:</strong> {expiringVehicles.map(v => v.name).join(', ')} — insurance or registration expiring within 30 days.</span>
        </div>
      )}

      {/* Incident alerts */}
      {incidents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span><strong>{incidents.length} incident(s) flagged today.</strong> Review ride records for details.</span>
        </div>
      )}

      {todayRequests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">No rides scheduled for today.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Unassigned rides alert */}
          {unassigned.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {unassigned.length} Unassigned Ride(s) — Need Driver
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {unassigned.map(r => (
                  <button key={r.id} onClick={() => onEdit(r)}
                    className="w-full text-left flex items-center gap-3 p-2 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.resident_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{r.requested_time || 'No time'} &nbsp;
                        <MapPin className="w-3 h-3" />{r.destination_address || 'No destination'}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[r.status]} variant="outline">{r.status}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Driver lanes */}
          {Object.entries(byDriver).filter(([k]) => k !== 'unassigned').map(([key, { driver, rides }]) => {
            const driverRecord = drivers.find(d => d.id === rides[0]?.assigned_driver_id);
            const vehicleRecord = vehicles.find(v => v.id === rides[0]?.assigned_vehicle_id);
            const doneCount = rides.filter(r => r.status === 'completed').length;
            return (
              <Card key={key}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {driver?.charAt(0) || '?'}
                      </div>
                      {driver || 'Unknown Driver'}
                      {vehicleRecord && (
                        <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                          <Car className="w-3 h-3" />{vehicleRecord.name}
                        </span>
                      )}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">{doneCount}/{rides.length} done</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{ width: rides.length > 0 ? `${(doneCount/rides.length)*100}%` : '0%' }} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {rides.map((r, idx) => (
                    <button key={r.id} onClick={() => onEdit(r)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                        r.status === 'completed' ? 'bg-emerald-50 border-emerald-200 opacity-70' :
                        r.status === 'no_show' ? 'bg-red-50 border-red-200' :
                        r.status === 'in_progress' ? 'bg-purple-50 border-purple-200' : 'bg-muted/30 border-border'
                      }`}>
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                        {r.pickup_order || idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{r.resident_name}</p>
                          <Badge className={STATUS_COLORS[r.status]} variant="outline" >{r.status.replace(/_/g,' ')}</Badge>
                          {r.incident_noted && <Badge className="bg-red-100 text-red-800" variant="outline">Incident</Badge>}
                          {r.return_trip_needed && <Badge variant="outline" className="text-[10px]">+Return</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {r.requested_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.requested_time}</span>}
                          {r.destination_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.destination_address}</span>}
                        </p>
                        {r.no_show_reason && <p className="text-xs text-red-700 mt-0.5">No-show: {r.no_show_reason}</p>}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}