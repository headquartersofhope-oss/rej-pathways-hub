import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { writeBackIntakeCompletion } from '@/pages/intake/IntakeModule';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ClipboardList, AlertTriangle, User, Pencil, Check, X } from 'lucide-react';
import { isStaff } from '@/lib/roles';
import { deriveIntakeStatus } from '@/lib/intakeStatus';
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
  const [editingCaseManager, setEditingCaseManager] = useState(false);
  const [caseManagerInput, setCaseManagerInput] = useState('');

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

  const openTasks = tasks.filter(t => t.status !== 'completed').length;
  // Use BarrierItem records; fall back to resident.barriers array count
  const activeBarriers = barriers.length > 0
    ? barriers.filter(b => b.status !== 'resolved').length
    : (resident.barriers?.length || 0);

  const handleSaveCaseManager = async () => {
    await base44.entities.Resident.update(resident.id, { assigned_case_manager: caseManagerInput });
    queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
    setEditingCaseManager(false);
  };

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
                {resident.global_resident_id && (
                  <span className="text-xs font-mono text-muted-foreground">{resident.global_resident_id}</span>
                )}
              </div>
            </div>
          </div>
          <div className="sm:ml-auto flex gap-2">
            {(() => {
              const intakeStatus = deriveIntakeStatus({ assessment, barriers, tasks, resident });
              const label = intakeStatus === 'completed'
                ? 'View Intake'
                : intakeStatus === 'in_progress'
                ? 'Continue Intake'
                : 'Start Intake';
              const variant = intakeStatus === 'completed' ? 'outline' : 'default';
              return (
                <Link to={intakeStatus === 'not_started' ? `/intake/${residentId}/form` : `/intake/${residentId}`}>
                  <Button variant={variant} size="sm" className="gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> {label}
                  </Button>
                </Link>
              );
            })()}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-lg">{resident.job_readiness_score || 0}%</p>
            <p className="text-[10px] text-muted-foreground">Job Readiness</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-lg">{activeBarriers}</p>
            <p className="text-[10px] text-muted-foreground">Active Barriers</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="font-heading font-bold text-lg">{openTasks}</p>
            <p className="text-[10px] text-muted-foreground">Open Tasks</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center hidden sm:block">
            {(() => {
              const status = deriveIntakeStatus({ assessment, barriers, tasks, resident });
              return status === 'completed'
                ? <p className="font-heading font-bold text-lg text-emerald-600">✓</p>
                : <p className="font-heading font-bold text-lg text-muted-foreground">—</p>;
            })()}
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
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Personal Info
              </h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['Name', `${resident.first_name} ${resident.last_name}`],
                  ['Preferred Name', resident.preferred_name || '—'],
                  ['Email', resident.email || '—'],
                  ['Phone', resident.phone || '—'],
                  ['Date of Birth', resident.date_of_birth || '—'],
                  ['Population', resident.population?.replace(/_/g, ' ') || '—'],
                  ['Intake Date', resident.intake_date || (assessment?.completed_at ? assessment.completed_at.split('T')[0] : '—')],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-muted-foreground w-32 flex-shrink-0">{label}</dt>
                    <dd className="font-medium capitalize">{value}</dd>
                  </div>
                ))}
                {/* Editable case manager */}
                <div className="flex gap-2 items-center">
                  <dt className="text-muted-foreground w-32 flex-shrink-0">Case Manager</dt>
                  {editingCaseManager ? (
                    <dd className="flex items-center gap-1 flex-1">
                      <input
                        className="border rounded px-2 py-0.5 text-sm flex-1 min-w-0"
                        value={caseManagerInput}
                        onChange={e => setCaseManagerInput(e.target.value)}
                        placeholder="Enter name or ID"
                        autoFocus
                      />
                      <button onClick={handleSaveCaseManager} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingCaseManager(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                    </dd>
                  ) : (
                    <dd className="font-medium flex items-center gap-1.5">
                      {resident.assigned_case_manager || '—'}
                      <button onClick={() => { setCaseManagerInput(resident.assigned_case_manager || ''); setEditingCaseManager(true); }} className="p-0.5 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </dd>
                  )}
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Barriers & Goals
              </h3>
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Job Readiness</p>
                <Progress value={resident.job_readiness_score || 0} className="h-2 mb-1" />
                <p className="text-xs font-medium">{resident.job_readiness_score || 0}%</p>
              </div>
              {(barriers.length > 0 || resident.barriers?.length > 0) && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2">Active Barriers</p>
                  <div className="flex flex-wrap gap-1">
                    {barriers.length > 0
                      ? barriers.filter(b => b.status !== 'resolved').slice(0, 6).map(b => (
                          <Badge key={b.id} variant="outline" className="text-[10px]">{b.title}</Badge>
                        ))
                      : (resident.barriers || []).slice(0, 6).map((b, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{b.replace(/_/g, ' ')}</Badge>
                        ))
                    }
                  </div>
                </div>
              )}
              {resident.goals?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Goals</p>
                  <ul className="space-y-1">
                    {resident.goals.map((g, i) => (
                      <li key={i} className="text-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {resident.missing_documents?.length > 0 && (
                <div className="mt-3 p-2 bg-destructive/5 rounded-lg">
                  <p className="text-xs font-medium text-destructive mb-1">Missing Documents</p>
                  <div className="flex flex-wrap gap-1">
                    {resident.missing_documents.map((d, i) => (
                      <Badge key={i} className="text-[10px] bg-destructive/10 text-destructive border-0">{d.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="case">
          <CaseManagementTab resident={resident} user={user} barriers={barriers} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab resident={resident} user={user} tasks={tasks} barriers={barriers} />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsTab resident={resident} user={user} />
        </TabsContent>

        <TabsContent value="learning">
          <ResidentLearningTab resident={resident} user={user} />
        </TabsContent>

        <TabsContent value="job-readiness">
          <JobReadinessTab resident={resident} user={user} barriers={barriers} tasks={tasks} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab resident={resident} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}