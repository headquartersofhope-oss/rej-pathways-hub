import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Home, Plus, Search, ChevronRight, Building2, Users } from 'lucide-react';
import ReferralStatusBadge from '@/components/housing/ReferralStatusBadge';
import ReferralForm from '@/components/housing/ReferralForm';
import ReferralDetail from '@/components/housing/ReferralDetail';
import AvailabilitySummary from '@/components/housing/AvailabilitySummary';

const PRIORITY_COLORS = {
  urgent: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-blue-600',
  low: 'text-gray-500',
};

export default function HousingReferrals() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isAdmin = role === 'admin';

  const [referrals, setReferrals] = useState([]);
  const [residents, setResidents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [tab, setTab] = useState('referrals');

  const fetchData = async () => {
    setLoading(true);
    const [r, res, prov] = await Promise.all([
      base44.entities.HousingReferral.list('-referral_date', 100),
      base44.entities.Resident.list('-created_date', 200),
      base44.entities.HousingProvider.filter({ is_active: true }),
    ]);
    setReferrals(r);
    setResidents(res);
    setProviders(prov);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = referrals.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.participant_name?.toLowerCase().includes(q) ||
      r.target_provider_name?.toLowerCase().includes(q) ||
      r.status?.includes(q)
    );
  });

  const filteredResidents = residents.filter(r => {
    if (!residentSearch) return true;
    const q = residentSearch.toLowerCase();
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q);
  }).slice(0, 10);

  const handleNewReferral = (resident) => {
    setSelectedResident(resident);
    setSelectedReferral(null);
    setShowForm(true);
    setResidentSearch('');
  };

  const handleSelectReferral = (r) => {
    setSelectedReferral(r);
    setShowForm(false);
    setSelectedResident(null);
  };

  const handleSaved = () => {
    setShowForm(false);
    setSelectedReferral(null);
    setSelectedResident(null);
    fetchData();
  };

  const handleEdit = () => {
    setShowForm(true);
  };

  const statusGroups = {
    active: referrals.filter(r => ['draft', 'ready_to_submit', 'submitted', 'received', 'under_review', 'more_information_requested'].includes(r.status)).length,
    decided: referrals.filter(r => ['approved', 'denied', 'waitlisted'].includes(r.status)).length,
    closed: referrals.filter(r => ['withdrawn', 'closed'].includes(r.status)).length,
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg">Housing Referrals</h1>
              <p className="text-xs text-muted-foreground">Referral-ready · Not housing operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>{statusGroups.active} active</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>{statusGroups.decided} decided</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — List */}
        <div className="w-full md:w-80 lg:w-96 border-r bg-card flex flex-col shrink-0">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
            <div className="px-4 pt-3">
              <TabsList className="w-full">
                <TabsTrigger value="referrals" className="flex-1 text-xs">
                  <Users className="w-3.5 h-3.5 mr-1" /> Referrals
                </TabsTrigger>
                <TabsTrigger value="availability" className="flex-1 text-xs">
                  <Building2 className="w-3.5 h-3.5 mr-1" /> Availability
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="referrals" className="flex-1 flex flex-col m-0 overflow-hidden">
              {/* Search + New */}
              <div className="px-3 pt-3 pb-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search referrals..." className="pl-8 h-8 text-sm" />
                </div>

                {/* Resident picker for new referral */}
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={residentSearch} onChange={e => setResidentSearch(e.target.value)} placeholder="Find resident to refer..." className="pl-8 h-8 text-sm" />
                  </div>
                  {residentSearch && filteredResidents.length > 0 && (
                    <div className="border rounded-lg overflow-hidden shadow-sm bg-card">
                      {filteredResidents.map(r => (
                        <button key={r.id} onClick={() => handleNewReferral(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0 flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{r.first_name} {r.last_name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{r.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Referral List */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No referrals yet.</p>
                    <p className="text-xs">Search for a resident above to create one.</p>
                  </div>
                ) : filtered.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectReferral(r)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${selectedReferral?.id === r.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{r.participant_name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ReferralStatusBadge status={r.status} />
                      {r.priority_level && (
                        <span className={`text-[10px] font-medium ${PRIORITY_COLORS[r.priority_level]}`}>
                          {r.priority_level.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {r.target_provider_name && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">→ {r.target_provider_name}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.referral_date}</p>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="availability" className="flex-1 overflow-y-auto m-0 px-3 py-3">
              <AvailabilitySummary />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel — Detail / Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <div className="max-w-2xl mx-auto">
              <h2 className="font-heading font-semibold text-base mb-4">
                {selectedReferral ? `Edit Referral — ${selectedReferral.participant_name}` : `New Referral — ${selectedResident?.first_name} ${selectedResident?.last_name}`}
              </h2>
              <ReferralForm
                referral={selectedReferral}
                resident={selectedResident || (selectedReferral ? residents.find(r => r.id === selectedReferral.resident_id) : null)}
                user={currentUser}
                providers={providers}
                onSaved={handleSaved}
                onCancel={() => { setShowForm(false); }}
              />
            </div>
          ) : selectedReferral ? (
            <div className="max-w-2xl mx-auto">
              <ReferralDetail
                referral={selectedReferral}
                onEdit={handleEdit}
                onRefresh={() => { fetchData(); setSelectedReferral(prev => referrals.find(r => r.id === prev?.id) || prev); }}
                isAdmin={isAdmin}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-base font-medium mb-1">Housing Referral Module</p>
              <p className="text-sm max-w-xs">Select a referral to view details, or search for a resident to create a new referral.</p>
              <p className="text-xs mt-4 text-muted-foreground/60">This module sends referrals to external housing providers.<br />Housing operations are managed separately.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}