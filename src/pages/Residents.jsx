import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Search, Plus, Filter, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { nextGlobalResidentId } from '@/lib/residentIdentity';
import { filterResidentsByAccess, getResidentPermissions } from '@/lib/rbac';
import ProgressStatusBadge from '@/components/shared/ProgressStatusBadge';
import ResidentCard from '@/components/shared/ResidentCard';

const statusColors = {
  pre_intake: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-50 text-blue-700',
  employed: 'bg-emerald-50 text-emerald-700',
  graduated: 'bg-purple-50 text-purple-700',
  exited: 'bg-amber-50 text-amber-700',
  inactive: 'bg-red-50 text-red-700',
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
  const [newResident, setNewResident] = useState({ first_name: '', last_name: '' });
  const [saving, setSaving] = useState(false);

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

  const handleAddResident = async () => {
    setSaving(true);
    const global_resident_id = nextGlobalResidentId(residents);
    await base44.entities.Resident.create({
      ...newResident,
      global_resident_id,
      organization_id: user?.organization_id || '',
      status: 'pre_intake',
    });
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    setShowAdd(false);
    setNewResident({ first_name: '', last_name: '' });
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
      <PageHeader
        title="Residents"
        subtitle={`${residents.length} total residents`}
        icon={Users}
        actions={
          canAdd && (
            <Button className="gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Resident
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
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
             <Link key={r.id} to={`/residents/${r.id}`}>
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Resident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input
                value={newResident.first_name}
                onChange={e => setNewResident(p => ({ ...p, first_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input
                value={newResident.last_name}
                onChange={e => setNewResident(p => ({ ...p, last_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              ID will be assigned: {nextGlobalResidentId(residents)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddResident} disabled={saving || !newResident.first_name || !newResident.last_name}>
              {saving ? 'Saving...' : 'Create Resident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}