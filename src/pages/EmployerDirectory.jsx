import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Star, Briefcase, MapPin, Building2, Award } from 'lucide-react';
import EmployerFormDialog from '@/components/employers/EmployerFormDialog';
import EmployerDetailPanel from '@/components/employers/EmployerDetailPanel';

function StarRating({ rating }) {
  const r = Math.round(rating || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= r ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
      ))}
    </div>
  );
}

function EmployerCard({ employer, onClick }) {
  const initials = employer.company_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'CO';
  const isSecondChance = employer.is_second_chance_employer || employer.second_chance_friendly;
  return (
    <div
      onClick={onClick}
      className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 flex flex-col gap-4"
    >
      <div className="flex items-start gap-3">
        {employer.company_logo_url || employer.logo_url ? (
          <img src={employer.company_logo_url || employer.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#30363D]" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{employer.company_name}</h3>
            {isSecondChance && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                <Award className="w-3 h-3" /> 2nd Chance
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{employer.industry || 'General'}</span>
          </div>
        </div>
      </div>

      {(employer.headquarters_city || employer.city) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3 h-3" />
          <span>{employer.headquarters_city || employer.city}{employer.headquarters_state || employer.state ? `, ${employer.headquarters_state || employer.state}` : ''}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#30363D]">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Briefcase className="w-3 h-3 text-blue-400" />
          <span className="text-blue-400 font-semibold">{employer.active_job_listings || employer.open_positions || 0}</span>
          <span>open jobs</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StarRating rating={employer.reliability_rating} />
          <span className="text-[10px] text-slate-600">{employer.total_placements || 0} placements</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {employer.status === 'active' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Active Partner</span>}
        {employer.status === 'pending_review' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Pending Review</span>}
        {employer.transportation_accessible && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30">Bus Accessible</span>}
      </div>
    </div>
  );
}

export default function EmployerDirectory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterSecondChance, setFilterSecondChance] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState(null);

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ['employers-dir'],
    queryFn: () => base44.entities.Employer.list('-created_date', 200),
  });

  const { data: jobListings = [] } = useQuery({
    queryKey: ['job-listings-counts'],
    queryFn: () => base44.entities.JobListing.list('-created_date', 500),
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['employers-dir'] }); setShowForm(false); };

  const filtered = employers.filter(e => {
    const matchSearch = !search || e.company_name?.toLowerCase().includes(search.toLowerCase()) || e.industry?.toLowerCase().includes(search.toLowerCase());
    const matchSC = !filterSecondChance || e.is_second_chance_employer || e.second_chance_friendly;
    return matchSearch && matchSC;
  });

  const activeCount = employers.filter(e => e.status === 'active').length;
  const scCount = employers.filter(e => e.is_second_chance_employer || e.second_chance_friendly).length;
  const totalPlacements = employers.reduce((s, e) => s + (e.total_placements || 0), 0);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="border-b border-[#30363D] bg-gradient-to-b from-[#161B22] to-[#0D1117]">
        <div className="px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <Building2 className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Employer Directory</h1>
              <p className="text-slate-400 mt-1 text-sm">Second-Chance hiring partners & workforce network</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2">
            <Plus className="w-4 h-4" /> Add Employer
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Partners', value: employers.length, color: 'text-white' },
            { label: 'Active Partners', value: activeCount, color: 'text-emerald-400' },
            { label: 'Second Chance', value: scCount, color: 'text-amber-400' },
            { label: 'Total Placements', value: totalPlacements, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employers..."
              className="bg-[#161B22] border border-[#30363D] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 w-64"
            />
          </div>
          <button
            onClick={() => setFilterSecondChance(!filterSecondChance)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterSecondChance ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-[#30363D] text-slate-400 hover:border-amber-500/30'}`}
          >
            <Award className="w-3 h-3" /> Second Chance Only
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-slate-500 text-sm text-center py-16">Loading employers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No employers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(e => (
              <EmployerCard key={e.id} employer={e} onClick={() => setSelectedEmployer(e)} />
            ))}
          </div>
        )}
      </div>

      {showForm && <EmployerFormDialog onClose={() => setShowForm(false)} onSaved={refresh} />}
      {selectedEmployer && (
        <EmployerDetailPanel
          employer={selectedEmployer}
          jobListings={jobListings.filter(j => j.employer_id === selectedEmployer.id)}
          onClose={() => setSelectedEmployer(null)}
          onEdit={(e) => { setSelectedEmployer(null); setShowForm(true); }}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['employers-dir'] })}
        />
      )}
    </div>
  );
}