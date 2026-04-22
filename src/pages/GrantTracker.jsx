import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, Clock, AlertTriangle, Trophy, Search } from 'lucide-react';
import { differenceInDays, parseISO, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import GrantCard from '@/components/grants/GrantCard';
import GrantFormModal from '@/components/grants/GrantFormModal';
import GrantDetailModal from '@/components/grants/GrantDetailModal';

const PIPELINE_COLS = [
  { key: 'researching', label: 'Researching', color: 'border-slate-500/40 text-slate-400' },
  { key: 'drafting', label: 'Drafting', color: 'border-blue-500/40 text-blue-400' },
  { key: 'submitted', label: 'Submitted', color: 'border-amber-500/40 text-amber-400' },
  { key: 'under_review', label: 'Under Review', color: 'border-purple-500/40 text-purple-400' },
  { key: 'awarded', label: 'Awarded', color: 'border-emerald-500/40 text-emerald-400' },
  { key: 'reporting', label: 'Reporting', color: 'border-teal-500/40 text-teal-400' },
];

export default function GrantTracker() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editGrant, setEditGrant] = useState(null);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [search, setSearch] = useState('');

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ['grants'],
    queryFn: () => base44.entities.Grant.list('-created_date', 200),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['grants'] });
    setShowForm(false);
    setEditGrant(null);
    setSelectedGrant(null);
  };

  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const activeGrants = grants.filter(g => ['awarded', 'reporting'].includes(g.status));
  const activeTotal = activeGrants.reduce((s, g) => s + (g.grant_amount || 0), 0);
  const submittedCount = grants.filter(g => ['submitted', 'under_review'].includes(g.status)).length;
  const upcomingDeadlines = grants.filter(g => {
    if (!g.application_deadline) return false;
    const days = differenceInDays(parseISO(g.application_deadline), now);
    return days >= 0 && days <= 30;
  }).length;
  const awardedThisYear = grants
    .filter(g => g.status === 'awarded' && g.award_date && isWithinInterval(parseISO(g.award_date), { start: yearStart, end: yearEnd }))
    .reduce((s, g) => s + (g.grant_amount || 0), 0);

  const filtered = grants.filter(g =>
    !search || g.grant_name?.toLowerCase().includes(search.toLowerCase()) || g.funder_name?.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status) => filtered.filter(g => g.status === status);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Hero */}
      <div className="border-b border-[#30363D] bg-gradient-to-b from-[#161B22] to-[#0D1117]">
        <div className="max-w-full px-6 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <DollarSign className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Grant Pipeline
                </h1>
                <p className="text-slate-400 mt-1 text-sm">Track every funding opportunity from research to close</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Grant
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-full">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#161B22] border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Active Grants</span>
            </div>
            <div className="text-2xl font-bold text-white">{activeGrants.length}</div>
            <div className="text-sm text-emerald-400 font-semibold mt-1">${activeTotal.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">total active funding</div>
          </div>
          <div className="bg-[#161B22] border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Submitted</span>
            </div>
            <div className="text-2xl font-bold text-white">{submittedCount}</div>
            <div className="text-xs text-slate-500 mt-1">applications under review</div>
          </div>
          <div className="bg-[#161B22] border border-rose-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-slate-400">Due Within 30 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{upcomingDeadlines}</div>
            <div className="text-xs text-slate-500 mt-1">upcoming deadlines</div>
          </div>
          <div className="bg-[#161B22] border border-yellow-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-slate-400">Awarded This Year</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">${awardedThisYear.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">total awarded {new Date().getFullYear()}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search grants..."
            className="w-full bg-[#161B22] border border-[#30363D] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Kanban Pipeline */}
        {isLoading ? (
          <div className="text-slate-500 text-sm py-12 text-center">Loading grants...</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {PIPELINE_COLS.map(col => {
                const colGrants = byStatus(col.key);
                return (
                  <div key={col.key} className="w-72 shrink-0">
                    <div className={`flex items-center justify-between mb-3 pb-2 border-b ${col.color}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${col.color.split(' ')[1]}`}>{col.label}</span>
                      <span className="text-xs text-slate-500 bg-[#21262D] px-2 py-0.5 rounded-full">{colGrants.length}</span>
                    </div>
                    <div className="space-y-3">
                      {colGrants.map(g => (
                        <GrantCard
                          key={g.id}
                          grant={g}
                          onClick={() => setSelectedGrant(g)}
                        />
                      ))}
                      {colGrants.length === 0 && (
                        <div className="text-xs text-slate-600 text-center py-8 border border-dashed border-[#30363D] rounded-xl">
                          No grants
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showForm || editGrant) && (
        <GrantFormModal
          grant={editGrant}
          onClose={() => { setShowForm(false); setEditGrant(null); }}
          onSaved={refresh}
        />
      )}
      {selectedGrant && (
        <GrantDetailModal
          grant={selectedGrant}
          onClose={() => setSelectedGrant(null)}
          onEdit={() => { setEditGrant(selectedGrant); setSelectedGrant(null); }}
          onDeleted={refresh}
          onUpdated={(updated) => setSelectedGrant(updated)}
        />
      )}
    </div>
  );
}