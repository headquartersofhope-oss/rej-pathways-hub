import React, { useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { writeBackIntakeCompletion } from '@/pages/intake/IntakeModule';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react';
import { deriveIntakeStatus } from '@/lib/intakeStatus';
import { canAccessResident, getResidentPermissions, isAdmin } from '@/lib/rbac';
import ResidentOverviewTab from '@/components/resident/ResidentOverviewTab';
import CaseManagementTab from '@/components/casemanagement/CaseManagementTab';
import TasksTab from '@/components/casemanagement/TasksTab';
import AppointmentsTab from '@/components/casemanagement/AppointmentsTab';
import DocumentsTab from '@/components/casemanagement/DocumentsTab';
import ResidentLearningTab from '@/components/learning/ResidentLearningTab';
import JobReadinessTab from '@/components/jobreadiness/JobReadinessTab';

const statusColors = {
  pre_intake: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-50 text-blue-700',
  employed: 'bg-emerald-50 text-emerald-700',
  graduated: 'bg-purple-50 text-purple-700',
  exited: 'bg-amber-50 text-amber-700',
  inactive: 'bg-red-50 text-red-700',
};

const riskColors = {
  low: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
};

export default function ResidentProfile() {
  const { residentId } = useParams();
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: resident } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => base44.entities.Resident.get(residentId),
    enabled: !!residentId,
  });

  const { data: assessment } = useQuery({
    queryKey: ['assessment', residentId],
    queryFn: async () => {
      const list = await base44.entities.IntakeAssessment.filter({ resident_id: residentId });
      return list[0] || null;
    },
    enabled: !!residentId,
  });

  const { data: barriers = [] } = useQuery({
    queryKey: ['barriers', residentId],
    queryFn: () => base44.entities.BarrierItem.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['service-tasks', residentId],
    queryFn: () => base44.entities.ServiceTask.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  // Backfill: if intake data exists but resident record not yet updated, write it back and refresh
  useEffect(() => {
    if (!resident || !assessment) return;
    writeBackIntakeCompletion(resident, { assessment, barriers, tasks }).then(updated => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
        queryClient.invalidateQueries({ queryKey: ['residents'] });
      }
    });
  }, [resident?.id, assessment?.id, barriers.length, tasks.length]);

  if (!resident) {
    return (
      <div className="p-6 pt-14 lg:pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Access control gate — block unauthorized URL access
  if (user && !canAccessResident(user, resident)) {
    return (
      <div className="p-6 pt-14 lg:pt-6 max-w-md mx-auto mt-16 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="font-heading font-bold text-xl mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-sm mb-5">
          You don't have permission to view this resident's profile. Only the assigned case manager or an administrator can access this record.
        </p>
        <Link to="/residents">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Residents</Button>
        </Link>
      </div>
    );
  }

  const perms = getResidentPermissions(user, resident);

  const openTasks = tasks.filter(t => t.status !== 'completed').length;
  const activeBarriersCount = barriers.length > 0
    ? barriers.filter(b => b.status !== 'resolved').length
    : (resident.barriers?.length || 0);

  const intakeStatus = deriveIntakeStatus({ assessment, barriers, tasks, resident });
  const intakeLabel = intakeStatus === 'completed' ? 'View Intake'
    : intakeStatus === 'in_progress' ? 'Continue Intake'
    : 'Start Intake';

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="mb-5">
        <Link to="/residents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Residents
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {resident.first_name?.[0]}{resident.last_name?.[0]}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {resident.preferred_name || resident.first_name} {resident.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-xs ${statusColors[resident.status] || ''}`}>
                  {(resident.status || 'active').replace(/_/g, ' ')}
                </Badge>
                {resident.risk_level && (
                  <Badge className={`text-xs ${riskColors[resident.risk_level] || ''}`}>
                    {resident.risk_level} risk
                  </Badge>
                )}
                {resident.population && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {resident.population.replace(/_/g, ' ')}
                  </Badge>
                )}
                {resident.global_resident_id && (
                  <span className="text-xs font-mono text-muted-foreground">{resident.global_resident_id}</span>
                )}
              </div>
            </div>
          </div>
          {perms.canManageIntake && (
            <div className="sm:ml-auto flex gap-2">
              <Link to={intakeStatus === 'not_started' ? `/intake/${residentId}/form` : `/intake/${residentId}`}>
                <Button variant={intakeStatus === 'completed' ? 'outline' : 'default'} size="sm" className="gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> {intakeLabel}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-lg">{resident.job_readiness_score || 0}%</p>
            <p className="text-[10px] text-muted-foreground">Job Readiness</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-lg">{activeBarriersCount}</p>
            <p className="text-[10px] text-muted-foreground">Active Barriers</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-lg">{openTasks}</p>
            <p className="text-[10px] text-muted-foreground">Open Tasks</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center hidden sm:block">
            {intakeStatus === 'completed'
              ? <p className="font-heading font-bold text-lg text-emerald-600">✓</p>
              : <p className="font-heading font-bold text-lg text-muted-foreground">—</p>}
            <p className="text-[10px] text-muted-foreground">Intake Done</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center hidden sm:block">
            <p className="font-heading font-bold text-lg capitalize">{resident.population?.replace(/_/g, ' ').split(' ')[0] || '—'}</p>
            <p className="text-[10px] text-muted-foreground">Population</p>
          </div>
        </div>

        {/* High risk banner */}
        {resident.risk_level === 'high' && (
          <Card className="mt-4 p-3 border-red-200 bg-red-50 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">High-risk resident — requires priority attention</p>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="case">Case Management</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="job-readiness">Job Readiness</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ResidentOverviewTab
            resident={resident}
            assessment={assessment}
            barriers={barriers}
            residentId={residentId}
            canEdit={perms.canEditProfile}
          />
        </TabsContent>

        <TabsContent value="case">
          <CaseManagementTab resident={resident} user={user} barriers={barriers} perms={perms} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab resident={resident} user={user} tasks={tasks} barriers={barriers} perms={perms} />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsTab resident={resident} user={user} perms={perms} />
        </TabsContent>

        <TabsContent value="learning">
          <ResidentLearningTab resident={resident} user={user} perms={perms} />
        </TabsContent>

        <TabsContent value="job-readiness">
          <JobReadinessTab resident={resident} user={user} barriers={barriers} tasks={tasks} perms={perms} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab resident={resident} user={user} perms={perms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}