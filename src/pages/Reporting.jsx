import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Home, DollarSign, Car } from 'lucide-react';
import { calculateCoreMetrics, exportMetricsToCSV } from '@/lib/reportingMetrics';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { base44 } from '@/api/base44Client';

const CHART_COLORS = ['#1e3a5f', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Reporting() {
  const [dateRange, setDateRange] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: () => base44.entities.House.list() });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: () => base44.entities.Bed.list() });
  const { data: grants = [] } = useQuery({ queryKey: ['grants'], queryFn: () => base44.entities.Grant.list() });
  const { data: transports = [] } = useQuery({ queryKey: ['transport-all'], queryFn: () => base44.entities.TransportationRequest.list('-created_date', 500) });
  const { data: incidents = [] } = useQuery({ queryKey: ['incidents'], queryFn: () => base44.entities.Incident.list('-created_date', 200) });
  const { data: payments = [] } = useQuery({ queryKey: ['fee-payments'], queryFn: () => base44.entities.FeePayment.list('-created_date', 500) });

  // Housing metrics
  const totalBeds = houses.reduce((s, h) => s + (h.total_beds || 0), 0);
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const availableBeds = beds.filter(b => b.status === 'available').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const nonCompliantHouses = houses.filter(h => h.compliance_status === 'non_compliant').length;
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'under_review').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;

  // Grant metrics
  const activeGrants = grants.filter(g => g.status === 'active').length;
  const totalAwarded = grants.filter(g => ['active','awarded'].includes(g.status)).reduce((s, g) => s + (Number(g.amount_awarded) || 0), 0);
  const totalPipeline = grants.filter(g => ['prospect','in_progress','submitted'].includes(g.status)).reduce((s, g) => s + (Number(g.amount_requested) || 0), 0);
  const today = new Date();
  const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const deadlinesSoon = grants.filter(g => { const d = g.application_deadline || g.report_due_date; if (!d) return false; const dt = new Date(d); return dt >= today && dt <= in30; }).length;

  // Transport metrics
  const completedTrips = transports.filter(t => t.status === 'completed').length;
  const pendingTrips = transports.filter(t => t.status === 'pending').length;
  const thisMonthTrips = transports.filter(t => t.requested_date?.startsWith(new Date().toISOString().slice(0,7))).length;
  const transportByType = Object.entries(
    transports.reduce((acc, t) => { acc[t.request_type] = (acc[t.request_type]||0)+1; return acc; }, {})
  ).map(([name, count]) => ({name: name.replace(/_/g,' '), count})).sort((a,b) => b.count-a.count);

  // Fee collection
  const totalDue = payments.reduce((s, p) => s + (Number(p.amount_due) || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
  const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

  // Fetch metrics
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await calculateCoreMetrics(dateRange);
        setMetrics(data);
      } catch (err) {
        console.error('Error calculating metrics:', err);
      }
      setLoading(false);
    };

    fetch();
  }, [dateRange]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  const handleExport = () => {
    exportMetricsToCSV(metrics);
  };

  // Prepare barrier chart data
  const barrierChartData = metrics.barriers.mostCommon;

  // Prepare retention chart data
  const retentionData = [
    { name: '30 Days', value: metrics.employment.retention30Days },
    { name: '60 Days', value: metrics.employment.retention60Days },
    { name: '90 Days', value: metrics.employment.retention90Days },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Reporting & Outcomes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-platform metrics — participants, housing, grants, transportation, employment, and learning</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Date Range:</span>
          <Select value={dateRange || 'all'} onValueChange={(v) => setDateRange(v === 'all' ? null : v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Core Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full justify-start flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="housing">Housing</TabsTrigger>
          <TabsTrigger value="grants">Grants</TabsTrigger>
          <TabsTrigger value="transportation">Transportation</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="barriers">Barriers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Participants"
              value={metrics.residents.totalResidents}
              icon={TrendingUp}
            />
            <StatCard
              title="Active Participants"
              value={metrics.residents.activeResidents}
              icon={TrendingUp}
            />
            <StatCard
              title="Completed Intake"
              value={metrics.residents.completedIntake}
              icon={TrendingUp}
            />
            <StatCard
              title="Avg Job Readiness"
              value={`${metrics.residents.averageJobReadiness}%`}
              icon={TrendingUp}
            />
          </div>

          {/* Program Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Program Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><p className="text-2xl font-bold">{metrics.program.placementRate}%</p><p className="text-xs text-muted-foreground">Placement Rate</p></div>
                <div><p className="text-2xl font-bold">{metrics.program.completionRate}%</p><p className="text-xs text-muted-foreground">Program Completion</p></div>
                <div><p className="text-2xl font-bold">{occupancyRate}%</p><p className="text-xs text-muted-foreground">Housing Occupancy</p></div>
                <div><p className={`text-2xl font-bold ${activeGrants > 0 ? 'text-emerald-600' : 'text-foreground'}`}>{activeGrants}</p><p className="text-xs text-muted-foreground">Active Grants</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Employer Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Jobs Posted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.employers.jobsPosted}</p>
                <p className="text-xs text-muted-foreground mt-1">{metrics.employers.activeEmployers} active employers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Placements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.employers.candidatesHired}</p>
                <p className="text-xs text-muted-foreground mt-1">{metrics.employers.matchesCreated} total matches</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Housing Tab */}
        <TabsContent value="housing" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold">{occupancyRate}%</p><p className="text-xs text-muted-foreground mt-1">Occupancy Rate</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold">{occupiedBeds}/{totalBeds}</p><p className="text-xs text-muted-foreground mt-1">Beds Occupied</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className={`font-heading text-2xl font-bold ${openIncidents > 0 ? 'text-red-600' : 'text-foreground'}`}>{openIncidents}</p><p className="text-xs text-muted-foreground mt-1">Open Incidents</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className={`font-heading text-2xl font-bold ${nonCompliantHouses > 0 ? 'text-orange-600' : 'text-foreground'}`}>{nonCompliantHouses}</p><p className="text-xs text-muted-foreground mt-1">Non-Compliant Houses</p></CardContent></Card>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Occupancy by House</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {houses.map(h => {
                    const houseBeds = beds.filter(b => b.house_id === h.id);
                    const occ = houseBeds.filter(b => b.status === 'occupied').length;
                    const total = h.total_beds || houseBeds.length;
                    const pct = total > 0 ? Math.round((occ/total)*100) : 0;
                    return (
                      <div key={h.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{h.name}</span>
                          <span className="text-muted-foreground">{occ}/{total} · {pct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className={`h-2 rounded-full ${pct>=90?'bg-red-500':pct>=70?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    );
                  })}
                  {houses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No houses configured</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Fee Collection</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Billed</span>
                    <span className="font-semibold">${totalDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Collected</span>
                    <span className="font-semibold text-emerald-600">${totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Collection Rate</span>
                    <span className={`font-bold ${collectionRate >= 80 ? 'text-emerald-600' : collectionRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{collectionRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full ${collectionRate>=80?'bg-emerald-500':collectionRate>=60?'bg-amber-500':'bg-red-500'}`} style={{width:`${Math.min(collectionRate,100)}%`}} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Incidents Resolved</span>
                    <span className="font-semibold">{resolvedIncidents} / {incidents.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Grants Tab */}
        <TabsContent value="grants" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold">{grants.length}</p><p className="text-xs text-muted-foreground mt-1">Total Grants</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold text-emerald-600">{activeGrants}</p><p className="text-xs text-muted-foreground mt-1">Active Grants</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold">${(totalAwarded/1000).toFixed(0)}k</p><p className="text-xs text-muted-foreground mt-1">Awarded Funding</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className={`font-heading text-2xl font-bold ${deadlinesSoon>0?'text-orange-600':'text-foreground'}`}>{deadlinesSoon}</p><p className="text-xs text-muted-foreground mt-1">Deadlines in 30 Days</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Grant Pipeline by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={
                  ['prospect','in_progress','submitted','awarded','active','reporting_due','closed','denied'].map(s => ({
                    name: s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),
                    count: grants.filter(g => g.status === s).length
                  })).filter(d => d.count > 0)
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{fontSize:11}} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Grant Details</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2">Grant</th><th className="text-left py-2 px-2">Funder</th><th className="text-left py-2 px-2">Status</th><th className="text-right py-2 px-2">Awarded</th>
                  </tr></thead>
                  <tbody>{grants.map(g => (
                    <tr key={g.id} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-2 font-medium">{g.grant_name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{g.funder_name}</td>
                      <td className="py-2 px-2 capitalize">{g.status?.replace(/_/g,' ')}</td>
                      <td className="py-2 px-2 text-right text-emerald-700 font-medium">{g.amount_awarded ? `$${Number(g.amount_awarded).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transportation Tab */}
        <TabsContent value="transportation" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold">{transports.length}</p><p className="text-xs text-muted-foreground mt-1">Total Requests</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold text-emerald-600">{completedTrips}</p><p className="text-xs text-muted-foreground mt-1">Completed Trips</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className={`font-heading text-2xl font-bold ${pendingTrips>0?'text-amber-600':'text-foreground'}`}>{pendingTrips}</p><p className="text-xs text-muted-foreground mt-1">Pending</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="font-heading text-2xl font-bold">{thisMonthTrips}</p><p className="text-xs text-muted-foreground mt-1">This Month</p></CardContent></Card>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Trips by Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={transportByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize:11}} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {['pending','approved','scheduled','completed','cancelled','no_show'].map(s => {
                    const count = transports.filter(t => t.status === s).length;
                    const pct = transports.length > 0 ? Math.round((count/transports.length)*100) : 0;
                    return (
                      <div key={s}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{s.replace(/_/g,' ')}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-primary" style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Classes Assigned"
              value={metrics.learning.classesAssigned}
              icon={TrendingUp}
            />
            <StatCard
              title="Classes Completed"
              value={metrics.learning.classesCompleted}
              icon={TrendingUp}
            />
            <StatCard
              title="Completion Rate"
              value={`${metrics.learning.completionRate}%`}
              icon={TrendingUp}
            />
            <StatCard
              title="Certificates Issued"
              value={metrics.learning.certificatesIssued}
              icon={TrendingUp}
            />
          </div>

          {/* Completion trends placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Assigned', value: metrics.learning.classesAssigned },
                    { name: 'Completed', value: metrics.learning.classesCompleted },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              title="Participants Placed"
              value={metrics.employment.residentsPlaced}
              icon={TrendingUp}
            />
            <StatCard
              title="Currently Employed"
              value={metrics.employment.activeEmployed}
              icon={TrendingUp}
            />

            {metrics.employment.averageTimeToEmployment && (
              <StatCard
                title="Avg Time to Employment"
                value={`${metrics.employment.averageTimeToEmployment} days`}
                icon={TrendingUp}
              />
            )}
          </div>

          {/* Retention Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Retention Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={retentionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barriers Tab */}
        <TabsContent value="barriers" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Total Barriers"
              value={metrics.barriers.totalBarriers}
              icon={TrendingUp}
            />
            <StatCard
              title="Resolved"
              value={metrics.barriers.resolvedBarriers}
              icon={TrendingUp}
            />
            <StatCard
              title="Resolution Rate"
              value={`${metrics.barriers.resolutionRate}%`}
              icon={TrendingUp}
            />
          </div>

          {/* Most Common Barriers */}
          {barrierChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Common Barriers</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={barrierChartData}
                    layout="vertical"
                    margin={{ left: 200 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={190} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}