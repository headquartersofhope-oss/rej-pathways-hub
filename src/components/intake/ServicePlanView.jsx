import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { User, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const PRIORITY_STYLES = {
  urgent: 'text-destructive border-destructive/30 bg-destructive/5',
  high: 'text-orange-700 border-orange-200 bg-orange-50',
  medium: 'text-amber-700 border-amber-200 bg-amber-50',
  low: 'text-slate-600 border-slate-200 bg-slate-50',
};

export default function ServicePlanView({ tasks, isResidentView = false }) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ServiceTask.update(id, { status, completed_at: status === 'completed' ? new Date().toISOString() : null }),
    onSuccess: () => qc.invalidateQueries(['service-tasks']),
  });

  const visibleTasks = isResidentView ? tasks.filter(t => t.is_resident_visible) : tasks;

  const pendingTasks = visibleTasks.filter(t => t.status !== 'completed');
  const completedTasks = visibleTasks.filter(t => t.status === 'completed');
  const staffTasks = !isResidentView ? visibleTasks.filter(t => t.requires_staff_action) : [];

  if (visibleTasks.length === 0) {
    return (
      <Card className="flex flex-col items-center py-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-accent mb-3" />
        <p className="font-heading font-semibold">No tasks yet</p>
        <p className="text-sm text-muted-foreground mt-1">Complete the intake to generate a service plan.</p>
      </Card>
    );
  }

  const TaskRow = ({ task }) => (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg transition-colors',
      task.status === 'completed' ? 'opacity-50' : 'hover:bg-muted/40'
    )}>
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={checked => updateMutation.mutate({ id: task.id, status: checked ? 'completed' : 'pending' })}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
        <div className="flex gap-1.5 mt-1 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px] border', PRIORITY_STYLES[task.priority])}>
            {task.priority}
          </Badge>
          {task.requires_staff_action && !isResidentView && (
            <Badge className="text-[10px] bg-primary/10 text-primary"><User className="w-2.5 h-2.5 mr-0.5" />Staff</Badge>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {!isResidentView && staffTasks.length > 0 && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h4 className="font-heading font-semibold text-sm">Staff Actions Required</h4>
            <Badge className="text-[10px]">{staffTasks.filter(t => t.status !== 'completed').length}</Badge>
          </div>
          <div className="space-y-1">
            {staffTasks.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </Card>
      )}

      {pendingTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-heading font-semibold text-sm">Open Tasks</h4>
            <Badge variant="secondary" className="text-[10px]">{pendingTasks.length}</Badge>
          </div>
          <div className="space-y-1">
            {pendingTasks.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </Card>
      )}

      {completedTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <h4 className="font-heading font-semibold text-sm text-muted-foreground">Completed</h4>
            <Badge variant="outline" className="text-[10px]">{completedTasks.length}</Badge>
          </div>
          <div className="space-y-1">
            {completedTasks.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </Card>
      )}
    </div>
  );
}