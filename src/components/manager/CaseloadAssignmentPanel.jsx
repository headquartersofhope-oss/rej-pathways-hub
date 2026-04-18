import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pre_intake: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-50 text-blue-700',
  housing_eligible: 'bg-green-50 text-green-700',
  housing_pending: 'bg-amber-50 text-amber-700',
  employed: 'bg-emerald-50 text-emerald-700',
};

export default function CaseloadAssignmentPanel() {
  const queryClient = useQueryClient();
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedResident, setSelectedResident] = useState(null);
  const [assigningTo, setAssigningTo] = useState('');

  // Fetch all residents
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-all'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Fetch all case managers
  const { data: caseManagers = [] } = useQuery({
    queryKey: ['case-managers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'case_manager');
    },
  });

  // Assign resident mutation
  const assignMutation = useMutation({
    mutationFn: async ({ residentId, caseManagerId, caseManagerName }) => {
      await base44.entities.Resident.update(residentId, {
        assigned_case_manager_id: caseManagerId,
        assigned_case_manager: caseManagerName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents-all'] });
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
      toast.success('Resident assigned successfully');
      setSelectedResident(null);
      setAssigningTo('');
    },
    onError: (err) => {
      toast.error(`Assignment failed: ${err.message}`);
    },
  });

  // Filter residents
  const filtered = residents.filter(r => {
    const matchName = `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchName.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchUnassigned = !selectedResident || r.id === selectedResident.id;
    return matchName && matchStatus && matchUnassigned;
  });

  const unassignedCount = residents.filter(r => !r.assigned_case_manager_id).length;

  const handleAssign = (resident, caseManagerId) => {
    const cm = caseManagers.find(c => c.id === caseManagerId);
    assignMutation.mutate({
      residentId: resident.id,
      caseManagerId,
      caseManagerName: cm?.full_name || cm?.email,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Caseload Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unassigned count */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-sm font-medium text-amber-900">{unassignedCount} unassigned resident(s)</span>
            <Badge variant="outline" className="text-amber-700 border-amber-300">{unassignedCount}</Badge>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="text-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pre_intake">Pre-Intake</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="housing_eligible">Housing Eligible</SelectItem>
                <SelectItem value="housing_pending">Housing Pending</SelectItem>
                <SelectItem value="employed">Employed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['residents-all'] })}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
          </div>

          {/* Residents list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No residents match criteria</p>
            ) : (
              filtered.map(resident => (
                <div key={resident.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {resident.first_name} {resident.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-xs ${STATUS_COLORS[resident.status] || ''}`}>
                          {(resident.status || 'active').replace(/_/g, ' ')}
                        </Badge>
                        {resident.assigned_case_manager ? (
                          <span className="text-xs text-muted-foreground">→ {resident.assigned_case_manager}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Unassigned</Badge>
                        )}
                      </div>
                    </div>
                    {selectedResident?.id === resident.id ? (
                      <div className="w-40 space-y-2">
                        <Select value={assigningTo} onValueChange={setAssigningTo}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select CM..." />
                          </SelectTrigger>
                          <SelectContent>
                            {caseManagers.map(cm => (
                              <SelectItem key={cm.id} value={cm.id}>
                                {cm.full_name || cm.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1.5">
                          <Button
                            size="xs"
                            disabled={!assigningTo || assignMutation.isPending}
                            onClick={() => handleAssign(resident, assigningTo)}
                            className="h-7 text-xs flex-1"
                          >
                            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setSelectedResident(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedResident(resident);
                          setAssigningTo('');
                        }}
                        className="gap-1.5"
                      >
                        <ChevronRight className="w-4 h-4" /> Assign
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}