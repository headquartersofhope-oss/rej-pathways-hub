import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Briefcase, MapPin, Bus, Award, Filter, DollarSign, Clock, Users } from 'lucide-react';
import JobListingFormDialog from '@/components/employment/JobListingFormDialog';
import MatchClientModal from '@/components/employment/MatchClientModal';

const JOB_TYPE_LABELS = { full_time: 'Full Time', part_time: 'Part Time', temporary: 'Temporary', contract: 'Contract', seasonal: 'Seasonal' };

function JobCard({ job, onMatchClient }) {
  const initials = job.employer_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'CO';
  const spotsLeft = (job.positions_available || 1) - (job.positions_filled || 0);
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col gap-4 hover:border-blue-500/30 transition-all">
      <div className="flex items-start gap-3">
        {job.employer_logo_url ? (
          <img src={job.employer_logo_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#30363D]" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{job.job_title || job.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{job.employer_name}</p>
        </div>
        {job.second_chance_friendly && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 flex items-center gap-1">
            <Award className="w-3 h-3" /> 2nd Chance
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <DollarSign className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">{job.pay_rate || (job.wage_min ? `$${job.wage_min}${job.wage_max ? `-$${job.wage_max}` : '+'}/${job.wage_type === 'salary' ? 'yr' : 'hr'}` : 'Negotiable')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3 h-3 text-blue-400" />
          <span>{JOB_TYPE_LABELS[job.job_type || job.schedule_type] || 'Full Time'}</span>
        </div>
        {job.location && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{job.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Users className="w-3 h-3 text-purple-400" />
          <span className="text-purple-400 font-semibold">{spotsLeft}</span>
          <span>spots left</span>
        </div>
      </div>

      {job.shift_details && <p className="text-xs text-slate-500">{job.shift_details}</p>}

      <div className="flex flex-wrap gap-1.5">
        {job.transportation_accessible && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center gap-1">
            <Bus className="w-3 h-3" /> Bus Route
          </span>
        )}
        {job.background_check_required && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
            BGC Required
          </span>
        )}
        {job.drug_test_required && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Drug Test
          </span>
        )}
      </div>

      <Button
        onClick={() => onMatchClient(job)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold gap-2"
      >
        <Users className="w-4 h-4" /> Match Client
      </Button>
    </div>
  );
}

export default function JobBoard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTransport, setFilterTransport] = useState(false);
  const [filterSecondChance, setFilterSecondChance] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [matchJob, setMatchJob] = useState(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['job-listings-board'],
    queryFn: () => base44.entities.JobListing.list('-created_date', 300),
  });

  const { data: employers = [] } = useQuery({
    queryKey: ['employers-list'],
    queryFn: () => base44.entities.Employer.list('-created_date', 200),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['job-listings-board'] });

  const activeJobs = jobs.filter(j => j.status === 'active');

  const filtered = activeJobs.filter(j => {
    const matchSearch = !search || (j.job_title || j.title)?.toLowerCase().includes(search.toLowerCase()) || j.employer_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || (j.job_type || j.schedule_type) === filterType;
    const matchTransport = !filterTransport || j.transportation_accessible;
    const matchSC = !filterSecondChance || j.second_chance_friendly;
    return matchSearch && matchType && matchTransport && matchSC;
  });

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="border-b border-[#30363D] bg-gradient-to-b from-[#161B22] to-[#0D1117]">
        <div className="px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <Briefcase className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Second-Chance Job Board</h1>
              <p className="text-slate-400 mt-1 text-sm">{activeJobs.length} active opportunities from {employers.filter(e => e.status === 'active').length} hiring partners</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2">
            <Plus className="w-4 h-4" /> Post Job
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-[#161B22] border border-[#30363D] rounded-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="bg-[#21262D] border border-[#30363D] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 w-56"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="temporary">Temporary</option>
            <option value="contract">Contract</option>
            <option value="seasonal">Seasonal</option>
          </select>
          <button
            onClick={() => setFilterTransport(!filterTransport)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterTransport ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'border-[#30363D] text-slate-400 hover:border-teal-500/30'}`}
          >
            <Bus className="w-3.5 h-3.5" /> Bus Accessible
          </button>
          <button
            onClick={() => setFilterSecondChance(!filterSecondChance)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterSecondChance ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-[#30363D] text-slate-400 hover:border-amber-500/30'}`}
          >
            <Award className="w-3.5 h-3.5" /> Second Chance
          </button>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} results</span>
        </div>

        {isLoading ? (
          <div className="text-slate-500 text-center py-16">Loading jobs...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No jobs found matching filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} onMatchClient={setMatchJob} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <JobListingFormDialog
          employers={employers}
          onClose={() => setShowForm(false)}
          onSaved={refresh}
        />
      )}
      {matchJob && (
        <MatchClientModal
          job={matchJob}
          onClose={() => setMatchJob(null)}
          onPlaced={refresh}
        />
      )}
    </div>
  );
}