import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertTriangle, FileText } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { isPast, parseISO, format } from 'date-fns';

const PRIORITY_COLORS = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  medium: 'bg-blue-50 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function MyTasks() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', myResident?.id],
    queryFn: () => base44.entities.ServiceTask.filter({ resident_id: myResident.id, is_resident_visible: true }),
    enabled: !!myResident?.id,
  });

  // Guard: if resident is loaded but not linked, show clear message
  if (!myResident && !isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto">
        <PageHeader title="My Tasks" icon={CheckCircle2} />
        <Card className="p-8 text-center text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Your resident profile isn't linked yet. Contact your case manager.</p>
        </Card>
      </div>
    );
  }

  const missingDocs = myResident?.missing_documents || [];

  const openTasks = tasks.filter(t => t.status !== 'completed').sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const handleMarkComplete = async (task) => {
    await base44.entities.ServiceTask.update(task.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ['my-tasks', myResident?.id] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="My Tasks" subtitle="Action items and next steps" icon={CheckCircle2} />

      {/* Missing doc reminders */}
      {missingDocs.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Documents Needed
          </p>
          <div className="space-y-1.5">
            {missingDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-amber-900">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                {doc.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-2">Please bring or upload these documents as soon as possible.</p>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <Card key={i} className="p-4 h-16 animate-pulse bg-muted/30" />)}
        </div>
      )}

      {!isLoading && openTasks.length === 0 && missingDocs.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">All caught up! No open tasks right now.</p>
        </Card>
      )}

      {openTasks.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3">Open Tasks ({openTasks.length})</h3>
          <div className="space-y-2">
            {openTasks.map(task => {
              const overdue = task.due_date && isPast(parseISO(task.due_date));
              return (
                <Card key={task.id} className={`p-4 ${overdue ? 'border-red-200 bg-red-50/20' : ''}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleMarkComplete(task)}
                      className="mt-0.5 flex-shrink-0 hover:opacity-70 transition-opacity"
                      title="Mark complete"
                    >
                      {task.status === 'in_progress'
                        ? <Clock className="w-5 h-5 text-amber-500" />
                        : <Circle className="w-5 h-5 text-muted-foreground" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={`text-[10px] border-0 ${PRIORITY_COLORS[task.priority] || ''}`}>
                          {task.priority}
                        </Badge>
                        {task.category && (
                          <span className="text-[10px] text-muted-foreground">{task.category}</span>
                        )}
                        {task.due_date && (
                          <span className={`text-[10px] ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {overdue ? '⚠ Overdue' : 'Due'} {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <details>
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground py-2">
            Completed tasks ({completedTasks.length})
          </summary>
          <div className="space-y-1.5 mt-2">
            {completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm line-through text-muted-foreground">{task.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}