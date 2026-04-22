import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Download, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const STATUS_CONFIG = {
  placed: { label: 'New Placement', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', dot: 'bg-rose-500' },
  active_30_days: { label: '30 Days ✓', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-400' },
  active_60_days: { label: '60 Days ✓', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', dot: 'bg-blue-400' },
  active_90_days: { label: '90 Days ✓', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-400' },
  separated: { label: 'Separated', color: 'bg-slate-500/20 text-slate-400 border-slate-500/40', dot: 'bg-slate-500' },
};

function MilestoneBar({ placement }) {
  const days = placement.placement_date ? differenceInDays(new Date(), parseISO(placement.placement_date)) : 0;
  const milestones = [
    { days: 0, label: 'Day 1', reached: days >= 0 },
    { days: 30, label: '30d', reached: days >= 30 },
    { days: 60, label: '60d', reached: days >= 60 },
    { days: 90, label: '90d', reached: days >= 90 },
  ];
  return (
    <div className="flex items-center gap-1">
      {milestones.map((m, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${m.reached ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#21262D] border-[#30363D] text-slate-600'}`}>
            {m.reached ? '✓' : ''}
          </div>
          {i < milestones.length - 1 && <div className={`w-4 h-0.5 ${days >= m.days && days >= milestones[i+1].days ? 'bg-emerald-500' : 'bg-[#30363D]'}`} />}
        </div>
      ))}
      <span className="text-[10px] text-slate-500 ml-1">{days}d</span>
    </div>
  );
}

export default function PlacementTracker() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ['job-placements'],
    queryFn: () => base44.entities.JobPlacement.list('-placement_date', 300),
  });

  const handleStatusUpdate = async (placement, newStatus) => {
    await base44.entities.JobPlacement.update(placement.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ['job-placements'] });
  };

  const handleExport = () => {
    const rows = placements.map(p => [
      p.client_name, p.employer_name, p.job_title, p.pay_rate, p.placement_date,
      STATUS_CONFIG[p.status]?.label || p.status, p.case_manager_name
    ]);
    const header = ['Client', 'Employer', 'Job Title', 'Pay Rate', 'Placement Date', 'Status', 'Case Manager'];
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'placements.csv'; a.click();
  };

  const filtered = placements.filter(p => {
    const matchSearch = !search || p.client_name?.toLowerCase().includes(search.toLowerCase()) || p.employer_name?.toLowerCase().includes(search.toLowerCase()) || p.job_title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = placements.filter(p => p.status !== 'separated').length;
  const milestone90 = placements.filter(p => p.status === 'active_90_days').length;
  const separatedCount = placements.filter(p => p.status === 'separated').length;

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="border-b border-[#30363D] bg-gradient-to-b from-[#161B22] to-[#0D1117]">
        <div className="px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <TrendingUp className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Placement Tracker</h1>
              <p className="text-slate-400 mt-1 text-sm">Retention milestones for funder reporting</p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2 border-[#30363D] text-slate-300 hover:text-white">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
            <div className="text-xs text-slate-500 mb-1">Total Placements</div>
            <div className="text-2xl font-bold text-white">{placements.length}</div>
          </div>
          <div className="bg-[#161B22] border border-emerald-500/20 rounded-xl p-5">
            <div className="text-xs text-slate-500 mb-1">Currently Active</div>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          </div>
          <div className="bg-[#161B22] border border-blue-500/20 rounded-xl p-5">
            <div className="text-xs text-slate-500 mb-1">90-Day Retained</div>
            <div className="text-2xl font-bold text-blue-400">{milestone90}</div>
          </div>
          <div className="bg-[#161B22] border border-rose-500/20 rounded-xl p-5">
            <div className="text-xs text-slate-500 mb-1">Separated</div>
            <div className="text-2xl font-bold text-rose-400">{separatedCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search placements..."
              className="bg-[#161B22] border border-[#30363D] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 w-64"
            />
          </div>
          {['all', 'placed', 'active_30_days', 'active_60_days', 'active_90_days', 'separated'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                filterStatus === s ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-[#30363D] text-slate-400 hover:border-emerald-500/30'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-slate-500 text-center py-16">Loading placements...</div>
        ) : (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#30363D] bg-[#21262D]">
                    {['Client', 'Employer', 'Job Title', 'Pay Rate', 'Placed', 'Milestones', 'Status', 'Case Manager', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-500">No placements found</td></tr>
                  ) : filtered.map(p => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.placed;
                    const initials = p.client_name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || 'CL';
                    const empInitials = p.employer_name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || 'EM';
                    return (
                      <tr key={p.id} className="hover:bg-[#21262D] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.client_photo_url ? (
                              <img src={p.client_photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
                            )}
                            <span className="text-sm text-white whitespace-nowrap">{p.client_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.employer_logo_url ? (
                              <img src={p.employer_logo_url} className="w-7 h-7 rounded object-cover" alt="" />
                            ) : (
                              <div className="w-7 h-7 rounded bg-blue-700 flex items-center justify-center text-[9px] font-bold text-white">{empInitials}</div>
                            )}
                            <span className="text-sm text-slate-300 whitespace-nowrap">{p.employer_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white whitespace-nowrap">{p.job_title}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-semibold whitespace-nowrap">{p.pay_rate || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {p.placement_date ? format(parseISO(p.placement_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <MilestoneBar placement={p} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{p.case_manager_name || '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            onChange={e => handleStatusUpdate(p, e.target.value)}
                            className="bg-[#21262D] border border-[#30363D] text-white rounded text-xs px-2 py-1 focus:outline-none"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}