import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, Play } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function OnboardingWorkflow({ resident, tasks = [] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowGenerated, setWorkflowGenerated] = useState(
    tasks.some(t => t.category?.includes('onboarding') || ['intake', 'orientation', 'housing', 'planning'].includes(t.category))
  );

  // Calculate progress
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleGenerateWorkflow = async () => {
    if (!resident) return;

    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateOnboardingTasks', {
        resident_id: resident.id,
        global_resident_id: resident.global_resident_id,
        housing_status: resident.status,
        organization_id: resident.organization_id,
      });

      if (response.data?.success) {
        toast.success(`Generated ${response.data.tasks.length} onboarding tasks`);
        setWorkflowGenerated(true);
        // Force parent component to refetch tasks
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to generate onboarding workflow');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const statusBgColor = {
    pending: '#21262D',
    in_progress: '#1F4F6E',
    completed: '#0D3B1A',
    blocked: '#4A1B1B',
  };

  const statusIcon = {
    pending: '◦',
    in_progress: '⟳',
    completed: '✓',
    blocked: '⚠',
  };

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Onboarding Progress</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading font-bold text-2xl text-foreground">{progressPercent}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="p-2 rounded border" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
          <p className="font-semibold text-white">{tasks.filter(t => t.status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="p-2 rounded border" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
          <p className="font-semibold text-white">{tasks.filter(t => t.status === 'in_progress').length}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
        <div className="p-2 rounded border" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
          <p className="font-semibold text-white">{tasks.filter(t => t.status === 'completed').length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="p-2 rounded border" style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
          <p className="font-semibold text-white">{tasks.filter(t => t.status === 'blocked').length}</p>
          <p className="text-xs text-muted-foreground">Blocked</p>
        </div>
      </div>

      {/* Generate workflow button */}
      {!workflowGenerated && (
        <Button
          onClick={handleGenerateWorkflow}
          disabled={isGenerating}
          className="w-full gap-2"
          style={{ backgroundColor: '#F59E0B' }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Generate Onboarding Workflow
            </>
          )}
        </Button>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tasks.map(task => (
            <Card
              key={task.id}
              className="p-3 border"
              style={{
                backgroundColor: statusBgColor[task.status] || '#21262D',
                borderColor: '#30363D',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 text-lg text-amber-400">
                  {statusIcon[task.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground line-clamp-2">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.category && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {task.category}
                      </Badge>
                    )}
                    {task.priority && (
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          task.priority === 'urgent'
                            ? 'border-destructive/40 bg-destructive/10 text-destructive'
                            : task.priority === 'high'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : ''
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="p-4 rounded border text-center" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No onboarding tasks yet</p>
        </div>
      )}
    </div>
  );
}