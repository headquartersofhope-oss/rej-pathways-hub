import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { BARRIER_CATEGORIES } from '@/lib/intakeBarriers';

export default function ResidentProgressView({ assessment, barriers, tasks }) {
  if (!assessment) {
    return (
      <Card className="flex flex-col items-center py-12 text-center px-6">
        <FileText className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="font-heading font-semibold">No intake assessment yet</p>
        <p className="text-sm text-muted-foreground mt-1">Your case manager will complete your intake assessment with you.</p>
      </Card>
    );
  }

  const scores = assessment.scores || {};
  const completedTasks = tasks.filter(t => t.is_resident_visible && t.status === 'completed');
  const openTasks = tasks.filter(t => t.is_resident_visible && t.status !== 'completed');
  const criticalBarriers = barriers.filter(b => b.severity === 'critical' && b.status !== 'resolved');
  const missingDocs = barriers.filter(b => b.category === 'identification_documents' && b.status !== 'resolved');

  const progress = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.filter(t => t.is_resident_visible).length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5">
        <h3 className="font-heading font-semibold text-sm mb-3">Your Reentry Progress</h3>
        <Progress value={progress} className="h-3 mb-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedTasks.length} tasks done</span>
          <span className="font-medium text-primary">{progress}% complete</span>
        </div>
      </Card>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="font-heading text-2xl font-bold text-primary">{scores.work_readiness_score || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Work Readiness</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-heading text-2xl font-bold text-accent">{scores.stability_score || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Stability Score</p>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalBarriers.length > 0 && (
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h4 className="font-heading font-semibold text-sm">Action Required</h4>
          </div>
          <div className="space-y-2">
            {criticalBarriers.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                <span>{b.title}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Missing Documents Checklist */}
      {missingDocs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-600" />
            <h4 className="font-heading font-semibold text-sm">Missing Documents</h4>
          </div>
          <div className="space-y-2">
            {missingDocs.map(b => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded border-2 border-amber-400 flex-shrink-0" />
                <span>{b.title.replace('Missing ', '')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Next Steps */}
      {openTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-heading font-semibold text-sm">Your Next Steps</h4>
          </div>
          <div className="space-y-2">
            {openTasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-start gap-2 text-sm">
                <div className="w-4 h-4 rounded border-2 border-primary/40 flex-shrink-0 mt-0.5" />
                <span>{t.title}</span>
              </div>
            ))}
            {openTasks.length > 5 && (
              <p className="text-xs text-muted-foreground pl-6">+{openTasks.length - 5} more tasks</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}