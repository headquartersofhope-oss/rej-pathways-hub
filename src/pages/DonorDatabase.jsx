import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Search, Heart, Users, TrendingUp, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import DonorFormModal from '@/components/donors/DonorFormModal';
import DonorDetailModal from '@/components/donors/DonorDetailModal';

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  lapsed: 'bg-red-500/20 text-red-400 border-red-500/30',
  prospect: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  major_donor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  recurring: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

const TYPE_COLORS = {
  individual: 'text-blue-400',
  corporation: 'text-purple-400',
  foundation: 'text-amber-400',
  government: 'text-teal-400',
  organization: 'text-emerald-400',
};

function DonorCard({ donor, onClick }) {
  const initials = donor.donor_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'D';
  return (
    <div
      onClick={onClick}
      className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 cursor-pointer hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-900 font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{donor.donor_name}</div>
          <div className={`text-xs capitalize mt-0.5 ${TYPE_COLORS[donor.donor_type] || 'text-slate-400'}`}>{donor.donor_type}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[donor.status] || STATUS_COLORS.prospect}`}>
          {donor.status?.replace('_', ' ')}
        </span>
      </div>

      <div className="text-2xl font-bold text-amber-400 mb-1">
        ${(donor.total_given || 0).toLocaleString()}
      </div>
      <div className="text-xs text-slate-500">lifetime giving</div>

      {donor.last_gift_date && (
        <div className="mt-3 pt-3 border-t border-[#30363D] text-xs text-slate-500">
          Last gift: {format(parseISO(donor.last_gift_date), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
}

export default function DonorDatabase() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editDonor, setEditDonor] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ['donors'],
    queryFn: () => base44.entities.Donor.list('-total_given', 200),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['donors'] });
    setShowForm(false);
    setEditDonor(null);
    setSelectedDonor(null);
  };

  const totalRaised = donors.reduce((s, d) => s + (d.total_given || 0), 0);
  const majorDonors = donors.filter(d => d.status === 'major_donor').length;
  const activeDonors = donors.filter(d => d.status === 'active' || d.status === 'recurring').length;

  const filtered = donors.filter(d => {
    const matchSearch = !search || d.donor_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const STATUSES = ['all', 'active', 'recurring', 'major_donor', 'prospect', 'lapsed'];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Hero */}
      <div className="border-b border-[#30363D] bg-gradient-to-b from-[#161B22] to-[#0D1117]">
        <div className="max-w-full px-6 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Heart className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Donor Database
                </h1>
                <p className="text-slate-400 mt-1 text-sm">Manage relationships with your foundation's supporters</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Donor
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#161B22] border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Total Raised</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">${totalRaised.toLocaleString()}</div>
          </div>
          <div className="bg-[#161B22] border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Total Donors</span>
            </div>
            <div className="text-2xl font-bold text-white">{donors.length}</div>
          </div>
          <div className="bg-[#161B22] border border-teal-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-slate-400">Active / Recurring</span>
            </div>
            <div className="text-2xl font-bold text-white">{activeDonors}</div>
          </div>
          <div className="bg-[#161B22] border border-yellow-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-slate-400">Major Donors</span>
            </div>
            <div className="text-2xl font-bold text-white">{majorDonors}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search donors..."
              className="bg-[#161B22] border border-[#30363D] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 w-56"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                  filterStatus === s
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'border-[#30363D] text-slate-400 hover:border-amber-500/30 hover:text-amber-400'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-slate-500 text-sm py-12 text-center">Loading donors...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Heart className="w-10 h-10 text-slate-700 mb-4" />
            <div className="text-slate-400 font-semibold mb-1">No donors found</div>
            <p className="text-slate-600 text-sm">Add your first donor to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(donor => (
              <DonorCard key={donor.id} donor={donor} onClick={() => setSelectedDonor(donor)} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showForm || editDonor) && (
        <DonorFormModal
          donor={editDonor}
          onClose={() => { setShowForm(false); setEditDonor(null); }}
          onSaved={refresh}
        />
      )}
      {selectedDonor && (
        <DonorDetailModal
          donor={selectedDonor}
          onClose={() => setSelectedDonor(null)}
          onEdit={() => { setEditDonor(selectedDonor); setSelectedDonor(null); }}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}