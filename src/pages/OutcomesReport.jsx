import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart2, TrendingUp, Users, CheckCircle2, Briefcase, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const MILESTONES = [
  { id: '30_days', label: '30 Days' },
  { id: '60_days', label: '60 Days' },
  { id: '90_days', label: '90 Days' },
  { id: '6_months', label: '6 Months' },
  { id: '1_year', label: '1 Year' },
  { id: '2_years', label: '2 Years' },
];

const COLORS = ['#2e5da8', '#4caf7d', '#f5a623', '#e05c3a', '#9b59b6', '#1abc9c'];

const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 100));

function StatCard({ label, value, sub, icon: IconComp, color = 'text-primary' }) {
  const Icon = IconComp;
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-muted ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-heading font-bold text-2xl">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  );
}

export default function OutcomesReport() {
  const { user } = useOutletContext();
  const [milestoneFilter, setMilestoneFilter] = useState('all');
  const [populationFilter, setPopulationFilter] = useState('all');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['all-outcome-records'],
    queryFn: () => base44.entities.OutcomeRecord.list('-follow_up_date', 500),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-for-outcomes'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  // Apply filters
  const filtered = records.filter(r => {
    const res = residentMap[r.resident_id];
    if (milestoneFilter !== 'all' && r.milestone !== milestoneFilter) return false;
    if (populationFilter !== 'all' && res?.population !== populationFilter) return false;
    return true;
  });

  // Summary stats
  const totalRecords = filtered.length;
  const placed = filtered.filter(r => r.successfully_placed).length;
  const employed = filtered.filter(r => ['employed_full_time', 'employed_part_time', 'self_employed'].includes(r.employment_status)).length;
  const stableHoused = filtered.filter(r => r.housing_stability === 'stable_housed').length;
  const recidivism = filtered.filter(r => r.recidivism_flag).length;
  const uniqueResidents = new Set(filtered.map(r => r.resident_id)).size;

  // Chart: placement rate per milestone
  const milestoneChartData = MILESTONES.map(m => {
    const mRecords = records.filter(r => r.milestone === m.id &&
      (populationFilter === 'all' || residentMap[r.resident_id]?.population === populationFilter));
    const mPlaced = mRecords.filter(r => r.successfully_placed).length;
    const mEmployed = mRecords.filter(r => ['employed_full_time','employed_part_time','self_employed'].includes(r.employment_status)).length;
    return {
      name: m.label,
      Placed: pct(mPlaced, mRecords.length),
      Employed: pct(mEmployed, mRecords.length),
      Total: mRecords.length,
    };
  });

  // Pie: employment distribution (latest records per resident)
  const latestByResident = {};
  records.forEach(r => {
    if (!latestByResident[r.resident_id] || r.follow_up_date > latestByResident[r.resident_id].follow_up_date) {
      latestByResident[r.resident_id] = r;
    }
  });
  const empCounts = {};
  Object.values(latestByResident).forEach(r => {
    empCounts[r.employment_status] = (empCounts[r.employment_status] || 0) + 1;
  });
  const empPieData = Object.entries(empCounts).map(([k, v]) => ({
    name: k.replace(/_/g, ' '),
    value: v,
  }));

  // Table: residents with outcome records
  const residentSummaries = Object.entries(
    records.reduce((acc, r) => {
      if (!acc[r.resident_id]) acc[r.resident_id] = { resident_id: r.resident_id, records: [] };
      acc[r.resident_id].records.push(r);
      return acc;
    }, {})
  ).map(([rid, { records: rs }]) => {
    const res = residentMap[rid];
    const latest = rs.sort((a, b) => (b.follow_up_date || '').localeCompare(a.follow_up_date || ''))[0];
    return { res, latest, count: rs.length };
  }).filter(({ res }) => {
    if (populationFilter !== 'all' && res?.population !== populationFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Outcomes & Grant Analytics"
        subtitle="Long-term resident follow-up and program outcome reporting"
        icon={BarChart2}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Milestones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Milestones</SelectItem>
            {MILESTONES.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={populationFilter} onValueChange={setPopulationFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Populations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Populations</SelectItem>
            <SelectItem value="justice_impacted">Justice Impacted</SelectItem>
            <SelectItem value="homeless_veteran">Homeless Veteran</SelectItem>
            <SelectItem value="foster_youth">Foster Youth</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Residents Tracked" value={uniqueResidents} icon={Users} />
        <StatCard label="Follow-Ups Logged" value={totalRecords} icon={TrendingUp} />
        <StatCard label="Successfully Placed" value={`${placed} (${pct(placed, totalRecords)}%)`} icon={CheckCircle2} color="text-emerald-600" sub="across all checkpoints" />
        <StatCard label="Employed" value={`${employed} (${pct(employed, totalRecords)}%)`} icon={Briefcase} color="text-blue-600" />
        <StatCard label="Stable Housing" value={`${stableHoused} (${pct(stableHoused, totalRecords)}%)`} icon={Home} color="text-teal-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Milestone bar chart */}
        <Card className="p-4 lg:col-span-2">
          <p className="font-heading font-semibold text-sm mb-3">Placement & Employment Rate by Milestone (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={milestoneChartData} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Placed" fill="#2e5da8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Employed" fill="#4caf7d" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Employment pie */}
        <Card className="p-4">
          <p className="font-heading font-semibold text-sm mb-3">Employment Distribution (Latest)</p>
          {empPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={empPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${Math.round(percent * 100)}%`}>
                  {empPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No data yet</div>
          )}
        </Card>
      </div>

      {/* Resident table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Resident Outcomes</span>
          <Badge variant="outline" className="text-xs">{residentSummaries.length} residents</Badge>
          {recidivism > 0 && (
            <Badge className="bg-red-50 text-red-700 border-red-200 text-xs ml-auto">
              {recidivism} recidivism flag{recidivism !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : residentSummaries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No outcome records found. Start tracking residents from their profile page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resident</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Latest Checkpoint</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Employment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Housing</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Placed</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Check-ins</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {residentSummaries.map(({ res, latest, count }) => (
                  <tr key={latest.resident_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/residents/${latest.resident_id}`} className="font-medium hover:text-primary transition-colors">
                        {res ? `${res.first_name} ${res.last_name}` : latest.global_resident_id}
                      </Link>
                      {res?.population && (
                        <p className="text-[10px] text-muted-foreground capitalize">{res.population.replace(/_/g, ' ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {MILESTONES.find(m => m.id === latest.milestone)?.label || latest.milestone}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs capitalize">{latest.employment_status?.replace(/_/g, ' ') || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs capitalize">{latest.housing_stability?.replace(/_/g, ' ') || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {latest.successfully_placed
                        ? <Badge className="bg-emerald-50 text-emerald-700 text-xs">Yes</Badge>
                        : <Badge variant="outline" className="text-xs">No</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}