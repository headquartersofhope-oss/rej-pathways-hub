import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardList, Plus, AlertTriangle, CheckCircle2, FileText, BarChart3, User } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import ScoreSummary from '@/components/intake/ScoreSummary';
import BarrierMatrix from '@/components/intake/BarrierMatrix';
import ServicePlanView from '@/components/intake/ServicePlanView';
import ResidentProgressView from '@/components/intake/ResidentProgressView';
import { isStaff } from '@/lib/roles';
import { deriveIntakeStatus, INTAKE_STATUS_LABELS, INTAKE_STATUS_STYLES } from '@/lib/intakeStatus';

export default function IntakeModule() {
  const { residentId } = useParams();
  const { user } = useOutletContext();
  const isStaffUser = isStaff(user?.role);

  const validResidentId = !!residentId && residentId !== ':residentId';

  const { data: resident, isLoading: loadingResident } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => base44.entities.Resident.get(residentId),
    enabled: validResidentId,
  });

  const { data: assessment, isLoading: loadingAssessment, refetch: refetchAssessment } = useQuery({
    queryKey: ['assessment', residentId],
    queryFn: () => base44.entities.IntakeAssessment.filter({ resident_id: residentId }).then(r => r[0] || null),
    enabled: validResidentId,
  });

  const { data: barriers = [], isLoading: loadingBarriers, refetch: refetchBarriers } = useQuery({
    queryKey: ['barriers', residentId],
    queryFn: () => base44.entities.BarrierItem.filter({ resident_id: residentId }),
    enabled: validResidentId,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['service-tasks', residentId],
    queryFn: () => base44.entities.ServiceTask.filter({ resident_id: residentId }),
    enabled: validResidentId,
  });

  // Only show loading spinner while queries are actively fetching (not when disabled)
  const isLoading = validResidentId && (loadingResident || loadingAssessment || loadingBarriers || loadingTasks);
  const completedBarriers = barriers.filter(b => b.status === 'resolved').length;
  // Use canonical intake status from shared utility
  const intakeStatus = deriveIntakeStatus({ assessment, barriers, tasks, resident });
  const isCompleted = intakeStatus === 'completed';

  // Backfill: if intake is completed but Resident record is missing intake_date, write it back now
  useEffect(() => {
    if (!resident || !isCompleted || isLoading) return;
    const needsBackfill = !resident.intake_date || resident.status === 'pre_intake';
    if (!needsBackfill) return;
    const completedDate = assessment?.completed_at
      ? assessment.completed_at.split('T')[0]
      : (assessment?.created_date ? assessment.created_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    base44.entities.Resident.update(resident.id, {
      intake_date: resident.intake_date || completedDate,
      status: resident.status === 'pre_intake' ? 'active' : resident.status,
    });
  }, [resident, isCompleted, isLoading]);

  const handleExport = () => {
    const lines = [
      `INTAKE ASSESSMENT SUMMARY`,
      `Resident: ${resident?.first_name} ${resident?.last_name}`,
      `Date: ${assessment?.completed_at ? new Date(assessment.completed_at).toLocaleDateString() : 'In Progress'}`,
      `Status: ${assessment?.status?.toUpperCase() || 'NOT STARTED'}`,
      ``,
      `SCORES`,
      `Barrier Severity: ${assessment?.scores?.barrier_severity_score || 'N/A'}`,
      `Stability Score: ${assessment?.scores?.stability_score || 'N/A'}`,
      `Work Readiness: ${assessment?.scores?.work_readiness_score || 'N/A'}`,
      ``,
      `BARRIERS (${barriers.length})`,
      ...barriers.map(b => `  [${b.severity?.toUpperCase()}] ${b.title} — ${b.status}`),
      ``,
      `SERVICE TASKS (${tasks.length})`,
      ...tasks.map(t => `  [${t.status?.toUpperCase()}] ${t.title}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intake-summary-${resident?.last_name || residentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!residentId) {
    return <ResidentListView user={user} />;
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Intake & Barrier Assessment"
        subtitle={resident ? `${resident.first_name} ${resident.last_name}` : residentId}
        icon={ClipboardList}
        actions={
          <div className="flex gap-2">
            {isStaffUser && isCompleted && (
              <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>
            )}
            {isStaffUser && (
              <Link to={`/intake/${residentId}/form`}>
                <Button size="sm" className="gap-2">
                  {isCompleted ? 'Edit Assessment' : <><Plus className="w-4 h-4" /> Start Intake</>}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Status Banner */}
      {!isCompleted && (
        <Card className="p-4 mb-5 border-amber-200 bg-amber-50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm text-amber-800">Intake Not Completed</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {assessment?.status === 'in_progress' ? 'Assessment is in progress. Complete all steps to generate the service plan.' : 'No intake assessment has been started for this resident.'}
            </p>
          </div>
          {isStaffUser && (
            <Link to={`/intake/${residentId}/form`}>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                {assessment?.status === 'in_progress' ? 'Continue' : 'Start'}
              </Button>
            </Link>
          )}
        </Card>
      )}

      {isCompleted && (
        <div className="grid lg:grid-cols-3 gap-5 mb-5">
          <ScoreSummary scores={assessment?.scores} barrierCount={barriers.length} />
          <div className="lg:col-span-2 grid grid-cols-3 gap-3">
            {[
              { label: 'Total Barriers', value: barriers.length, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
              { label: 'In Progress', value: barriers.filter(b => b.status === 'in_progress' || b.status === 'active').length, icon: FileText, color: 'text-amber-600 bg-amber-50' },
              { label: 'Resolved', value: completedBarriers, icon: CheckCircle2, color: 'text-accent bg-accent/10' },
              { label: 'Open Tasks', value: tasks.filter(t => t.status !== 'completed').length, icon: ClipboardList, color: 'text-primary bg-primary/10' },
              { label: 'Completed Tasks', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: 'text-accent bg-accent/10' },
              { label: 'Staff Actions', value: tasks.filter(t => t.requires_staff_action && t.status !== 'completed').length, icon: User, color: 'text-purple-600 bg-purple-50' },
            ].map(m => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="p-4 text-center">
                  <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${m.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-heading text-xl font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Tabs */}
      {isStaffUser ? (
        <Tabs defaultValue="barriers">
          <TabsList className="mb-4">
            <TabsTrigger value="barriers">Barrier Matrix</TabsTrigger>
            <TabsTrigger value="tasks">Service Plan</TabsTrigger>
            <TabsTrigger value="resident">Resident View</TabsTrigger>
          </TabsList>
          <TabsContent value="barriers">
            <BarrierMatrix barriers={barriers} onUpdate={refetchBarriers} />
          </TabsContent>
          <TabsContent value="tasks">
            <ServicePlanView tasks={tasks} isResidentView={false} />
          </TabsContent>
          <TabsContent value="resident">
            <ResidentProgressView assessment={assessment} barriers={barriers} tasks={tasks} />
          </TabsContent>
        </Tabs>
      ) : (
        <ResidentProgressView assessment={assessment} barriers={barriers} tasks={tasks} />
      )}
    </div>
  );
}

// Sub-component: list of residents with their intake status
function ResidentListView({ user }) {
  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: () => base44.entities.IntakeAssessment.list(),
  });

  const getStatus = (resident) => {
    // Use canonical intake status: resident.intake_date is the most reliable signal after write-back
    if (resident.intake_date) return 'completed';
    const a = assessments.find(a => a.resident_id === resident.id);
    return deriveIntakeStatus({ assessment: a });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader title="Intake & Barrier Assessment" subtitle="Select a resident to view or start their intake" icon={ClipboardList} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {residents.map(r => {
          const status = getStatus(r);
          return (
            <Link key={r.id} to={`/intake/${r.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {r.first_name?.[0]}{r.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm">{r.preferred_name || r.first_name} {r.last_name}</p>
                    <Badge className={`text-[10px] mt-1 ${INTAKE_STATUS_STYLES[status]}`}>
                      {INTAKE_STATUS_LABELS[status]}
                    </Badge>
                    {r.intake_date && status === 'completed' && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.intake_date}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}