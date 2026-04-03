import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildChecklist, computeProgress } from '@/lib/onboarding';

const categoryColors = {
  profile: 'text-blue-600',
  intake: 'text-purple-600',
  documents: 'text-amber-600',
  tasks: 'text-rose-600',
  learning: 'text-emerald-600',
  job_readiness: 'text-indigo-600',
};

const categoryLabels = {
  profile: 'Profile',
  intake: 'Intake',
  documents: 'Documents',
  tasks: 'Tasks',
  learning: 'Learning',
  job_readiness: 'Job Readiness',
};

export default function OnboardingChecklist({ user, resident, onboarding }) {
  const queryClient = useQueryClient();
  const [markingStep, setMarkingStep] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['my-docs', resident?.id],
    queryFn: () => base44.entities.Document.filter({ resident_id: resident.id }),
    enabled: !!resident?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', resident?.id],
    queryFn: () => base44.entities.ServiceTask.filter({ resident_id: resident.id }),
    enabled: !!resident?.id,
  });

  const { data: assessmentList = [] } = useQuery({
    queryKey: ['my-assessment', resident?.id],
    queryFn: () => base44.entities.IntakeAssessment.filter({ resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const assessment = assessmentList[0] || null;

  const manuallyCompleted = onboarding?.completed_steps || [];
  const checklist = buildChecklist(resident, documents, tasks, assessment, manuallyCompleted);
  const progress = computeProgress(checklist);
  const allDone = progress === 100;

  const handleMarkDone = async (stepId) => {
    if (manuallyCompleted.includes(stepId)) return;
    setMarkingStep(stepId);
    const updated = [...manuallyCompleted, stepId];
    await base44.entities.Onboarding.update(onboarding.id, {
      completed_steps: updated,
      ...(updated.length === checklist.length ? { completed_at: new Date().toISOString() } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['my-onboarding', user?.id] });
    setMarkingStep(null);
  };

  const handleDismiss = async () => {
    await base44.entities.Onboarding.update(onboarding.id, { dismissed: true });
    queryClient.invalidateQueries({ queryKey: ['my-onboarding', user?.id] });
  };

  const getStepLink = (step) => {
    if (!step.link) return null;
    if (typeof step.link === 'function') return step.link(resident?.id);
    return step.link;
  };

  return (
    <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <p className="font-heading font-bold text-sm text-foreground">
              {allDone ? 'Onboarding Complete! 🎉' : 'Your Getting Started Checklist'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allDone
                ? 'You've completed all setup steps. You're all set!'
                : `${checklist.filter(s => s.completed).length} of ${checklist.length} steps done`}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title="Dismiss onboarding"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-bold text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {checklist.map((step) => {
          const link = getStepLink(step);
          const isLoading = markingStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                step.completed
                  ? 'bg-muted/40 border-transparent opacity-70'
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              {/* Check icon */}
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className={`w-5 h-5 ${categoryColors[step.category] || 'text-muted-foreground'}`} />
                )}
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {step.label}
                </p>
                {!step.completed && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>

              {/* Category badge */}
              <Badge variant="outline" className={`text-[10px] flex-shrink-0 hidden sm:inline-flex ${categoryColors[step.category]}`}>
                {categoryLabels[step.category]}
              </Badge>

              {/* Action button */}
              {!step.completed && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {link ? (
                    <Link to={link}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1">
                        Go <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={isLoading}
                      onClick={() => handleMarkDone(step.id)}
                    >
                      {isLoading ? '...' : 'Done'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}