import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Home, BedDouble, Car, DollarSign, AlertTriangle,
  TrendingUp, CheckCircle, ClipboardList, Briefcase, BarChart2,
  Calendar, FileText, Shield, ChevronRight, Plus, Activity
} from 'lucide-react';

function StatCard({ title, value, sub, icon: Icon, color, bg, to, alert }) {
  const content = (
    <Card className={`metric-card border ${alert ? 'border-red-500/30 bg-red-500/5' : 'border-border'} hover:shadow-lg transition-smooth group`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{title}</p>
            <p className={`font-heading text-3xl font-bold mt-2 ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
            {sub && <p className="text-xs mt-1.5" style={{ color: '#8B949E' }}>{sub}</p>}
          </div>
          <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-smooth`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {to && <div className="flex items-center gap-1 mt-4 text-xs font-semibold group-hover:gap-2 transition-smooth" style={{ color: '#F59E0B' }}>View Details <ChevronRight className="w-3 h-3" /></div>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function HOHAdminDashboard({ user }) {
  const { data: residents = [] } = useQuery({ queryKey: ['residents'], queryFn: () => base44.entities.Resident.list() });
  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: () => base44.entities.House.list() });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: () => base44.entities.Bed.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ['incidents'], queryFn: () => base44.entities.Incident.list('-created_date', 50) });
  const { data: grants = [] } = useQuery({ queryKey: ['grants'], queryFn: () => base44.entities.Grant.list() });
  const { data: transports = [] } = useQuery({ queryKey: ['transport-requests'], queryFn: () => base44.entities.TransportationRequest.list('-created_date', 100) });
  const { data: onboardingReqs = [] } = useQuery({ queryKey: ['onboarding-requests'], queryFn: () => base44.entities.OnboardingRequest.list('-created_date', 50) });
  const { data: payments = [] } = useQuery({ queryKey: ['fee-payments'], queryFn: () => base44.entities.FeePayment.list('-created_date', 100) });
  const { data: latestAudit = [] } = useQuery({ queryKey: ['audit-runs-latest'], queryFn: () => base44.entities.AuditRun.list('-created_date', 1) });

  // Derived
  const activeResidents = residents.filter(r => r.status === 'active' || r.status === 'employed');
  const thisWeekIntake = residents.filter(r => {
    const d = new Date(r.created_date); const w = new Date(); w.setDate(w.getDate()-7);
    return d >= w;
  }).length;
  const totalBeds = houses.reduce((s,h) => s + (h.total_beds||0), 0);
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const availableBeds = beds.filter(b => b.status === 'available').length;
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'under_review').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
  const pendingTransport = transports.filter(t => t.status === 'pending').length;
  const pendingOnboarding = onboardingReqs.filter(r => r.status === 'pending').length;
  const activeGrants = grants.filter(g => g.status === 'active').length;
  const reportingDueGrants = grants.filter(g => g.status === 'reporting_due').length;
  const pendingFees = payments.filter(p => p.status === 'pending' || p.status === 'late').length;
  const employed = residents.filter(r => r.status === 'employed').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds/totalBeds)*100) : 0;
  const today = new Date();
  const in30 = new Date(); in30.setDate(today.getDate()+30);
  const grantDeadlines = grants.filter(g => {
    const d = g.application_deadline || g.report_due_date;
    if (!d) return false;
    const dt = new Date(d);
    return dt >= today && dt <= in30;
  }).length;

  const auditStatus = latestAudit[0]?.overall_status;

  const quickLinks = [
    { label: 'Intake New Participant', to: '/intake', icon: Plus, color: 'bg-primary text-primary-foreground' },
    { label: 'Housing Operations', to: '/housing', icon: Home, color: 'bg-blue-600 text-white' },
    { label: 'Grant Tracker', to: '/grants', icon: DollarSign, color: 'bg-emerald-600 text-white' },
    { label: 'Transportation Hub', to: '/transportation', icon: Car, color: 'bg-amber-500 text-white' },
    { label: 'Case Management', to: '/case-management', icon: ClipboardList, color: 'bg-violet-600 text-white' },
    { label: 'Audit Center', to: '/admin/audit', icon: Shield, color: 'bg-slate-700 text-white' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
       <div className="border rounded-2xl p-8" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
         <div className="flex items-start justify-between">
           <div>
             <h1 className="font-heading text-3xl font-bold text-white">Pathways Command Center</h1>
             <p className="text-sm mt-2" style={{ color: '#8B949E' }}>Executive dashboard · {new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
           </div>
           <Link to="/intake">
             <Button className="gap-2 shadow-lg"><Plus className="w-4 h-4" />New Intake</Button>
           </Link>
         </div>
       </div>

      {/* Alerts bar */}
      {(criticalIncidents > 0 || pendingOnboarding > 0 || reportingDueGrants > 0 || grantDeadlines > 0) && (
        <div className="space-y-2">
          {criticalIncidents > 0 && (
            <Link to="/housing">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#F8717114', borderColor: '#F87171', color: '#F87171' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <strong>{criticalIncidents} critical incident(s)</strong> require immediate attention
                <ChevronRight className="w-4 h-4 ml-auto" />
              </div>
            </Link>
          )}
          {reportingDueGrants > 0 && (
            <Link to="/grants">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#FBBF2414', borderColor: '#FBBF24', color: '#FBBF24' }}>
                <FileText className="w-4 h-4 shrink-0" />
                <strong>{reportingDueGrants} grant report(s)</strong> are overdue
                <ChevronRight className="w-4 h-4 ml-auto" />
              </div>
            </Link>
          )}
          {grantDeadlines > 0 && (
            <Link to="/grants">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#FBBF2414', borderColor: '#FBBF24', color: '#FBBF24' }}>
                <Calendar className="w-4 h-4 shrink-0" />
                <strong>{grantDeadlines} grant deadline(s)</strong> approaching in 30 days
                <ChevronRight className="w-4 h-4 ml-auto" />
              </div>
            </Link>
          )}
          {pendingOnboarding > 0 && (
            <Link to="/admin/onboarding">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: '#60A5FA14', borderColor: '#60A5FA', color: '#60A5FA' }}>
                <Users className="w-4 h-4 shrink-0" />
                <strong>{pendingOnboarding} onboarding request(s)</strong> awaiting approval
                <ChevronRight className="w-4 h-4 ml-auto" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Primary KPIs - Hero Section */}
      <div>
        <h3 className="font-heading text-lg font-bold mb-4 text-white">Key Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="Active Participants" value={activeResidents.length} sub={`${thisWeekIntake} new this week`} icon={Users} color="text-blue-600" bg="bg-blue-100" to="/residents" />
          <StatCard title="Residents Housed" value={occupiedBeds} sub={`${occupancyRate}% occupancy`} icon={BedDouble} color="text-emerald-600" bg="bg-emerald-100" to="/housing" />
          <StatCard title="Available Beds" value={availableBeds} sub={`of ${totalBeds} total`} icon={Home} color="text-green-600" bg="bg-green-100" to="/housing" />
          <StatCard title="Employed" value={employed} sub="current placements" icon={Briefcase} color="text-amber-600" bg="bg-amber-100" to="/job-matching" />
          <StatCard title="Transport Pending" value={pendingTransport} sub="needs scheduling" icon={Car} color={pendingTransport>0?"text-orange-600":"text-slate-500"} bg={pendingTransport>0?"bg-orange-100":"bg-slate-100"} to="/transportation" alert={pendingTransport>3} />
          <StatCard title="Open Incidents" value={openIncidents} sub={criticalIncidents > 0 ? `${criticalIncidents} critical` : 'across all houses'} icon={AlertTriangle} color={openIncidents>0?"text-destructive":"text-slate-500"} bg={openIncidents>0?"bg-red-100":"bg-slate-100"} to="/housing" alert={criticalIncidents>0} />
          <StatCard title="Active Grants" value={activeGrants} sub={`${reportingDueGrants} reports due`} icon={DollarSign} color="text-violet-600" bg="bg-violet-100" to="/grants" alert={reportingDueGrants>0} />
          <StatCard title="Fees Pending" value={pendingFees} sub="payments outstanding" icon={TrendingUp} color={pendingFees>0?"text-warning":"text-slate-500"} bg={pendingFees>0?"bg-yellow-100":"bg-slate-100"} to="/housing" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Occupancy snapshot */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">House Occupancy Overview</CardTitle>
              <Link to="/housing"><Button variant="ghost" size="sm" className="text-xs h-7">Full View</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {houses.length === 0 ? (
              <div className="text-center py-6">
                <Home className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No houses configured yet.</p>
                <Link to="/housing"><Button size="sm" className="mt-3"><Plus className="w-3.5 h-3.5 mr-1.5" />Add House</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {houses.map(h => {
                  const houseBeds = beds.filter(b => b.house_id === h.id);
                  const hOcc = houseBeds.filter(b => b.status === 'occupied').length;
                  const hTotal = h.total_beds || houseBeds.length;
                  const pct = hTotal > 0 ? Math.round((hOcc/hTotal)*100) : 0;
                  const hIncidents = incidents.filter(i => i.house_id === h.id && i.status !== 'resolved').length;
                  return (
                    <div key={h.id}>
                      <div className="flex items-center justify-between mb-1">
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-white">{h.name}</span>
                           {hIncidents > 0 && <Badge className="text-[10px]" style={{ backgroundColor: '#F8717114', color: '#F87171', border: '1px solid #F87171' }}>{hIncidents} incident{hIncidents!==1?'s':''}</Badge>}
                           <Badge className="text-[10px]" style={{ backgroundColor: h.compliance_status === 'compliant' ? '#34D39914' : '#F8717114', color: h.compliance_status === 'compliant' ? '#34D399' : '#F87171', border: `1px solid ${h.compliance_status === 'compliant' ? '#34D399' : '#F87171'}` }}>{h.compliance_status?.replace(/_/g,' ')}</Badge>
                         </div>
                         <span className="text-xs" style={{ color: '#8B949E' }}>{hOcc}/{hTotal} beds · {pct}%</span>
                       </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`h-2 rounded-full ${pct>=90?'bg-red-500':pct>=70?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grant pipeline */}
        <Card>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Grant Pipeline</CardTitle>
              <Link to="/grants"><Button variant="ghost" size="sm" className="text-xs h-7">Manage</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {grants.length === 0 ? (
              <div className="text-center py-6">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No grants tracked yet.</p>
                <Link to="/grants"><Button size="sm" className="mt-3"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Grant</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {grants.slice(0,5).map(g => (
                  <div key={g.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      g.status==='active'?'bg-emerald-500':g.status==='reporting_due'?'bg-orange-500':
                      g.status==='submitted'?'bg-blue-500':g.status==='denied'?'bg-red-500':'bg-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{g.grant_name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.funder_name} · {g.status?.replace(/_/g,' ')}</p>
                    </div>
                    {g.amount_awarded && <span className="text-xs font-semibold text-emerald-700 shrink-0">${Number(g.amount_awarded).toLocaleString()}</span>}
                  </div>
                ))}
                {grants.length > 5 && <p className="text-xs text-muted-foreground text-center pt-1">+{grants.length-5} more grants</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 text-white">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((q) => (
            <Link key={q.to} to={q.to}>
              <Card className="hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.color} group-hover:scale-105 transition-transform`}>
                    <q.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium leading-tight">{q.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent incidents + system health */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Incidents</CardTitle>
              <Link to="/housing"><Button variant="ghost" size="sm" className="text-xs h-7">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent incidents.</p>
            ) : (
              <div className="space-y-2">
                {incidents.slice(0,5).map(inc => (
                  <div key={inc.id} className="flex items-start gap-2.5 py-1.5 border-b last:border-0" style={{ borderColor: '#30363D' }}>
                     <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                       inc.severity==='critical'?'bg-red-500':inc.severity==='high'?'bg-orange-500':
                       inc.severity==='medium'?'bg-yellow-400':'bg-slate-400'
                     }`} />
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-medium text-white">{inc.incident_type?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</p>
                       <p className="text-[10px]" style={{ color: '#8B949E' }}>{inc.house_name || 'N/A'} · {inc.incident_date}</p>
                     </div>
                     <Badge variant="outline" style={{fontSize:'10px', backgroundColor: inc.status==='resolved'?'#34D39914':inc.status==='open'?'#F8717114':'#FBBF2414', color: inc.status==='resolved'?'#34D399':inc.status==='open'?'#F87171':'#FBBF24', border: `1px solid ${inc.status==='resolved'?'#34D399':inc.status==='open'?'#F87171':'#FBBF24'}`}}>{inc.status}</Badge>
                   </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" />System Health</CardTitle>
              <Link to="/admin/audit"><Button variant="ghost" size="sm" className="text-xs h-7">Run Audit</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-3">
              {[
                { label: 'Participants', value: activeResidents.length, status: 'ok' },
                { label: 'Houses Active', value: houses.filter(h=>h.status==='active').length, status: 'ok' },
                { label: 'Bed Inventory', value: `${availableBeds} available`, status: availableBeds > 0 ? 'ok' : 'warn' },
                { label: 'Open Incidents', value: openIncidents, status: openIncidents===0?'ok':criticalIncidents>0?'critical':'warn' },
                { label: 'Grants Reporting', value: reportingDueGrants, status: reportingDueGrants===0?'ok':'warn' },
                { label: 'Last Audit', value: auditStatus || 'Never run', status: auditStatus==='passed'?'ok':auditStatus==='warning'?'warn':auditStatus?'critical':'warn' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                   <span className="text-xs" style={{ color: '#8B949E' }}>{item.label}</span>
                   <div className="flex items-center gap-1.5">
                     <span className="text-xs font-bold text-white">{item.value}</span>
                     <div className={`w-2 h-2 rounded-full ${item.status==='ok'?'bg-emerald-500':item.status==='warn'?'bg-yellow-400':'bg-red-500'}`} />
                   </div>
                 </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}