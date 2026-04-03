import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, BookOpen, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function ClassCompletionCard({ assignment, classInfo, onStart, onRetake }) {
  const isCompleted = assignment.status === 'completed' || assignment.status === 'passed';
  const isFailed = assignment.status === 'failed';
  const isNotStarted = assignment.status === 'assigned';
  const isInProgress = assignment.status === 'in_progress';

  // Calculate progress toward completion
  let completionPercent = 0;
  if (assignment.watched_video) completionPercent += 50;
  if (assignment.quiz_passed) completionPercent += 50;

  const getStatusBadge = () => {
    if (isCompleted) return <Badge className="bg-green-100 text-green-700">✓ Complete</Badge>;
    if (isFailed) return <Badge className="bg-red-100 text-red-700">Retake Needed</Badge>;
    if (isInProgress) return <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>;
    return <Badge variant="secondary">Not Started</Badge>;
  };

  return (
    <Card className={`p-4 transition-all ${isCompleted ? 'border-l-4 border-l-green-500' : ''}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2">{classInfo.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{classInfo.estimated_minutes} min</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress bar for in-progress classes */}
        {(isInProgress || (!isCompleted && completionPercent > 0)) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
            <div className="flex gap-1 text-xs text-muted-foreground">
              {assignment.watched_video ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" />Video</span>
              ) : (
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Video</span>
              )}
              {assignment.quiz_passed ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" />Quiz</span>
              ) : assignment.quiz_attempts > 0 ? (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-600" />Quiz ({assignment.quiz_score}%)</span>
              ) : (
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Quiz</span>
              )}
            </div>
          </div>
        )}

        {/* Quiz score display */}
        {assignment.quiz_score !== undefined && assignment.quiz_score !== null && (
          <div className="p-2 rounded-md bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Quiz Score</span>
              <span className={`font-bold ${assignment.quiz_passed ? 'text-green-600' : 'text-red-600'}`}>
                {assignment.quiz_score}%
              </span>
            </div>
            {assignment.quiz_attempts > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                Attempts: {assignment.quiz_attempts} | Best: {assignment.best_quiz_score}%
              </p>
            )}
          </div>
        )}

        {/* Completion date */}
        {isCompleted && assignment.completion_date && (
          <p className="text-xs text-muted-foreground">
            Completed {format(new Date(assignment.completion_date), 'MMM d, yyyy')}
          </p>
        )}

        {/* Reflection notes */}
        {assignment.reflection_notes && (
          <div className="p-2 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-1">Your Reflection:</p>
            <p className="text-xs text-blue-800 line-clamp-3">{assignment.reflection_notes}</p>
          </div>
        )}

        {/* CTA Button */}
        {!isCompleted && (
          <div className="flex gap-2 pt-2">
            {isNotStarted && (
              <Button size="sm" onClick={onStart} className="flex-1">
                Start Class
              </Button>
            )}
            {isInProgress && (
              <Button size="sm" onClick={onStart} className="flex-1">
                Continue
              </Button>
            )}
            {isFailed && (
              <Button size="sm" variant="outline" onClick={onRetake} className="flex-1">
                Retake Quiz
              </Button>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 pt-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Class Completed!</span>
          </div>
        )}
      </div>
    </Card>
  );
}