import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle, Clock, Home, Briefcase, CheckCircle2, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const STAT_CONFIGS = [
  { key: 'pending_intake', label: 'Pending Intakes', icon: Clock, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'housing_eligible', label: 'Housing Eligible', icon: Home, color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'housing_pending', label: 'Housing Pending', icon: Home, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'housed', label: 'Housed', icon: Home, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'job_ready', label: 'Job Ready', icon: Briefcase, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'employed', label: 'Employed', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default function ManagerCommandDashboard() {
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Fetch residents
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-all'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.ServiceTask.list(),
  });

  // Fetch intakes
  const { data: intakes = [] } = useQuery({
    queryKey: ['all-intakes'],
    queryFn: () => base44.entities.IntakeAssessment.list(),
  });

  // Fetch incidents
  const { data: incidents = [] } = useQuery({
    queryKey: ['all-incidents'],
    queryFn: () => base44.entities.Incident.list(),
  });

  // Calculate stats
  const stats = {
    pending_intake: residents.filter(r => r.status === 'pre_intake').length,
    housing_eligible: residents.filter(r => r.status === 'active' && intakes.some(i => i.resident_id === r.id && i.status === 'completed')).length,
    housing_pending: residents.filter(r => r.status === 'housing_pending').length,
    housed: residents.filter(r => r.status === 'active' && intakes.some(i => i.resident_id === r.id && i.status === 'completed')).length,
    job_ready: residents.filter(r => r.job_readiness_score >= 60).length,
    employed: residents.filter(r => r.status === 'employed').length,
    unassigned: residents.filter(r => !r.assigned_case_manager_id).length,
    overdue_tasks: tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed').length,
    open_incidents: incidents.filter(i => i.status === 'open').length,
  };

  const statusResidents = selectedStatus 
    ? residents.filter(r => {
        if (selectedStatus === 'housing_eligible') return r.status === 'active';
        if (selectedStatus === 'housing_pending') return r.status === 'housing_pending';
        if (selectedStatus === 'housed') return r.status === 'active';
        if (selectedStatus === 'job_ready') return r.job_readiness_score >= 60;
        if (selectedStatus === 'employed') return r.status === 'employed';
        if (selectedStatus === 'pending_intake') return r.status === 'pre_intake';
        return false;
      })
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Manager Command Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Critical status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Unassigned */}
            <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-900">Unassigned Residents</p>
                <Users className="w-4 h-4 text-red-600" />
              </div>
              <p className="font-heading text-3xl font-bold text-red-700">{stats.unassigned}</p>
              <p className="text-xs text-red-600 mt-1">Require immediate assignment</p>
            </div>

            {/* Overdue */}
            <div className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-amber-900">Overdue Tasks</p>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="font-heading text-3xl font-bold text-amber-700">{stats.overdue_tasks}</p>
              <p className="text-xs text-amber-600 mt-1">Require staff attention</p>
            </div>

            {/* Open Incidents */}
            <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-900">Open Incidents</p>
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <p className="font-heading text-3xl font-bold text-orange-700">{stats.open_incidents}</p>
              <p className="text-xs text-orange-600 mt-1">Under review</p>
            </div>
          </div>

          {/* Status overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STAT_CONFIGS.map(config => {
              const Icon = config.icon;
              const count = stats[config.key];
              return (
                <button
                  key={config.key}
                  onClick={() => setSelectedStatus(selectedStatus === config.key ? null : config.key)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedStatus === config.key
                      ? 'ring-2 ring-primary'
                      : config.color
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <p className="font-bold text-lg">{count}</p>
                  <p className="text-[10px] font-medium">{config.label}</p>
                </button>
              );
            })}
          </div>

          {/* Resident list for selected status */}
          {selectedStatus && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{STAT_CONFIGS.find(c => c.key === selectedStatus)?.label}</h3>
                <Button size="sm" variant="outline" onClick={() => setSelectedStatus(null)}>
                  Clear
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {statusResidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No residents in this status</p>
                ) : (
                  statusResidents.map(resident => (
                    <div key={resident.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span className="font-medium">{resident.first_name} {resident.last_name}</span>
                      <span className="text-muted-foreground">{resident.assigned_case_manager || 'Unassigned'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}