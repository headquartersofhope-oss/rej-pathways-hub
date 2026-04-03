import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertCircle, Trophy } from 'lucide-react';

export default function LearningProgressTracker({ residentId }) {
  const { data: assignments = [] } = useQuery({
    queryKey: ['learning-assignments', residentId],
    queryFn: () => base44.entities.LearningAssignment.list(),
  });

  const residentAssignments = assignments.filter(a => a.resident_id === residentId);
  
  const stats = {
    total: residentAssignments.length,
    completed: residentAssignments.filter(a => a.status === 'completed' || a.status === 'passed').length,
    inProgress: residentAssignments.filter(a => a.status === 'in_progress').length,
    assigned: residentAssignments.filter(a => a.status === 'assigned').length,
    certificates: residentAssignments.filter(a => a.certificate_earned).length,
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const byStatus = residentAssignments.reduce((acc, a) => {
    const category = a.assignment_reason || 'other';
    if (!acc[category]) acc[category] = { count: 0, status: [] };
    acc[category].count++;
    acc[category].status.push(a.status);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card className="p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Learning Progress</h3>
            <span className="text-sm font-bold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">{stats.certificates}</p>
            <p className="text-xs text-muted-foreground">Certificates</p>
          </div>
        </div>
      </Card>

      {/* By Assignment Reason */}
      {Object.entries(byStatus).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Learning Areas</h3>
          <div className="space-y-3">
            {Object.entries(byStatus).map(([reason, data]) => {
              const completed = data.status.filter(s => s === 'completed' || s === 'passed').length;
              const percent = Math.round((completed / data.count) * 100);
              
              const labels = {
                'low_digital_literacy': 'Digital Skills',
                'no_resume': 'Resume Building',
                'low_job_readiness': 'Job Readiness',
                'low_interview_readiness': 'Interview Prep',
                'housing_barrier': 'Housing Support',
                'financial_barriers': 'Financial Literacy',
                'missing_documents': 'Documentation',
                'population_support': 'Life Skills Support',
                'stability_support': 'Wellness & Stability',
                'orientation_required': 'Program Orientation',
                'foundational_skill': 'AI Literacy',
              };

              return (
                <div key={reason} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{labels[reason] || reason}</span>
                    <span className="text-xs text-muted-foreground">{completed}/{data.count}</span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upcoming Requirements */}
      {stats.assigned > stats.inProgress && stats.assigned > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Classes Ready to Start</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.assigned - stats.inProgress - stats.completed} class{stats.assigned - stats.inProgress - stats.completed !== 1 ? 'es' : ''} waiting to begin
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Achievements */}
      {stats.certificates > 0 && (
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Certificates Earned</p>
              <p className="text-xs text-muted-foreground mt-1">
                Congratulations! You've earned {stats.certificates} certificate{stats.certificates !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {stats.total === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">No learning classes assigned yet.</p>
          <p className="text-xs mt-1">Staff will recommend classes based on your profile.</p>
        </Card>
      )}
    </div>
  );
}