import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PremiumPageHeader from '@/components/premium/PremiumPageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Search, Plus, Filter, ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
// nextGlobalResidentId replaced by backend generateResidentId to prevent race conditions
import { filterResidentsByAccess, getResidentPermissions } from '@/lib/rbac';
import ProgressStatusBadge from '@/components/shared/ProgressStatusBadge';
import ResidentCard from '@/components/shared/ResidentCard';

const statusColors = {
  pre_intake: 'bg-slate-900/10 text-slate-300 border-l-4 border-slate-500',
  active: 'bg-green-900/10 text-green-400 border-l-4 border-green-500',
  housing_eligible: 'bg-blue-900/10 text-blue-400 border-l-4 border-blue-500',
  housing_pending: 'bg-amber-900/10 text-amber-400 border-l-4 border-amber-500',
  employed: 'bg-purple-900/10 text-purple-400 border-l-4 border-purple-500',
  graduated: 'bg-cyan-900/10 text-cyan-400 border-l-4 border-cyan-500',
  exited: 'bg-red-900/10 text-red-400 border-l-4 border-red-500',
  inactive: 'bg-gray-900/10 text-gray-400 border-l-4 border-gray-500',
};

const riskColors = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

export default function Residents() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newResident, setNewResident] = useState({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [overrideMode, setOverrideMode] = useState(false);

  const { data: allResidents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.filter(
      user?.organization_id ? { organization_id: user.organization_id } : {}
    ),
  });

  // Apply caseload filter based on role
  const residents = filterResidentsByAccess(allResidents, user);
  const canAdd = !user || getResidentPermissions(user, {}).canAddResident;
  const isPO = user?.role === 'probation_officer';

  const checkForDuplicates = async () => {
    if (!newResident.first_name || !newResident.last_name) return;
    setDuplicateChecking(true);
    setDuplicateWarning(null);
    try {
      const res = await base44.functions.invoke('detectDuplicateResident', {
        mode: 'check',
        candidate: {
          first_name: newResident.first_name,
          last_name: newResident.last_name,
          date_of_birth: newResident.date_of_birth || undefined,
          phone: newResident.phone || undefined,
          email: newResident.email || undefined,
        },
      });
      if (res.data?.is_duplicate) {
        setDuplicateWarning(res.data);
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      // non-blocking
    } finally {
      setDuplicateChecking(false);
    }
  };

  const handleAddResident = async () => {
    // Block high-confidence duplicates unless override with justification
    if (duplicateWarning?.confidence === 'high' && !overrideMode) {
      setOverrideMode(true);
      return;
    }
    if (overrideMode && overrideJustification.trim().length < 5) return;

    setSaving(true);
    const { data } = await base44.functions.invoke('generateResidentId', {});
    const global_resident_id = data.global_resident_id;
    await base44.entities.Resident.create({
      ...newResident,
      global_resident_id,
      organization_id: user?.organization_id || '',
      status: 'pre_intake',
    });

    // Log override if applicable
    if (overrideMode && overrideJustification) {
      try {
        await base44.functions.invoke('systemAuditWrite', {
          action: 'duplicate_override',
          entity_type: 'Resident',
          entity_id: global_resident_id,
          details: `Duplicate override by ${user?.email}. Justification: ${overrideJustification}. Top match: ${duplicateWarning?.matches?.[0]?.global_resident_id}`,
          severity: 'warning',
        });
      } catch (e) { /* non-blocking */ }
    }

    queryClient.invalidateQueries({ queryKey: ['residents'] });
    setShowAdd(false);
    setNewResident({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '' });
    setDuplicateWarning(null);
    setOverrideMode(false);
    setOverrideJustification('');
    setSaving(false);
  };

  const filtered = residents.filter(r => {
    const matchesSearch = !search ||
      `${r.first_name} ${r.last_name} ${r.preferred_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <PremiumPageHeader
          title="Participants"
          subtitle={`${allResidents.length} total participants`}
          icon={Users}
        />
        {canAdd && (
          <Button className="gap-2 mt-1" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Participant
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search participants by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pre_intake">Pre-Intake</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="employed">Employed</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resident Cards */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-muted rounded mb-3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No residents found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {filtered.map((r) => (
             <Link key={r.id} to={`/residents/${r.id}`} className="block" style={{ pointerEvents: 'auto' }}>
               <ResidentCard
                 resident={r}
                 variant="summary"
                 showJobReadiness={true}
                 showPopulation={true}
                 showRisk={true}
                 statusColors={statusColors}
               />
             </Link>
           ))}
         </div>
      )}

      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) { setDuplicateWarning(null); setOverrideMode(false); setOverrideJustification(''); setNewResident({ first_name: '', last_name: '', date_of_birth: '', phone: '', email: '' }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Participant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={newResident.first_name} onChange={e => setNewResident(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={newResident.last_name} onChange={e => setNewResident(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth <span className="text-muted-foreground text-xs">(helps detect duplicates)</span></Label>
              <Input type="date" value={newResident.date_of_birth} onChange={e => setNewResident(p => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={newResident.phone} onChange={e => setNewResident(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newResident.email} onChange={e => setNewResident(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
              </div>
            </div>

            {/* Duplicate check button */}
            {newResident.first_name && newResident.last_name && !duplicateWarning && !overrideMode && (
              <Button variant="outline" size="sm" onClick={checkForDuplicates} disabled={duplicateChecking} className="w-full gap-2">
                {duplicateChecking ? <Search className="w-3.5 h-3.5 animate-pulse" /> : <Search className="w-3.5 h-3.5" />}
                {duplicateChecking ? 'Checking for duplicates...' : 'Check for Duplicates'}
              </Button>
            )}

            {/* No duplicates found */}
            {duplicateWarning !== null && !duplicateWarning.is_duplicate && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> No duplicate records found.
              </div>
            )}

            {/* Duplicate warning */}
            {duplicateWarning?.is_duplicate && !overrideMode && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {duplicateWarning.confidence === 'high' ? 'High-confidence duplicate detected' : 'Possible duplicate detected'}
                </div>
                <div className="space-y-1">
                  {duplicateWarning.matches?.slice(0, 3).map(m => (
                    <div key={m.resident_id} className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1">
                      <span className="font-medium">{m.name}</span> · {m.global_resident_id} · {m.status?.replace(/_/g,' ')} · matched: {m.matching_fields.join(', ')}
                    </div>
                  ))}
                </div>
                {duplicateWarning.confidence === 'high'
                  ? <p className="text-xs text-amber-800">⚠️ Creation blocked. Click "Override" to proceed with justification — this will be audit logged.</p>
                  : <p className="text-xs text-amber-700">Review the matches above. You may still create this record if this is a different individual.</p>
                }
              </div>
            )}

            {/* Override justification */}
            {overrideMode && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Override Required — Provide Justification
                </p>
                <textarea
                  className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                  rows={2}
                  value={overrideJustification}
                  onChange={e => setOverrideJustification(e.target.value)}
                  placeholder="Explain why this is NOT a duplicate (required, min 5 chars)..."
                />
                <p className="text-xs text-red-700">This override will be logged in the system audit trail.</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground font-mono">ID will be auto-assigned on creation</p>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            {duplicateWarning?.confidence === 'high' && !overrideMode ? (
              <Button variant="destructive" onClick={() => setOverrideMode(true)}>Override Duplicate Block</Button>
            ) : (
              <Button
                onClick={handleAddResident}
                disabled={saving || !newResident.first_name || !newResident.last_name || (overrideMode && overrideJustification.trim().length < 5)}
              >
                {saving ? 'Saving...' : overrideMode ? 'Create (Override)' : 'Create Participant'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}