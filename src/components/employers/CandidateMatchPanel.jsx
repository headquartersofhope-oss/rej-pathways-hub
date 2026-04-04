import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  recommended: 'bg-blue-50 border-blue-200',
  applied: 'bg-amber-50 border-amber-200',
  interview_requested: 'bg-purple-50 border-purple-200',
  interview_scheduled: 'bg-indigo-50 border-indigo-200',
  hired: 'bg-green-50 border-green-200',
  not_selected: 'bg-red-50 border-red-200',
};

const STATUS_BADGES = {
  recommended: { label: 'Recommended', variant: 'default' },
  applied: { label: 'Applied', variant: 'secondary' },
  interview_requested: { label: 'Interview Requested', variant: 'secondary' },
  interview_scheduled: { label: 'Interview Scheduled', variant: 'secondary' },
  hired: { label: 'Hired', variant: 'default' },
  not_selected: { label: 'Not Selected', variant: 'destructive' },
};

export default function CandidateMatchPanel({ title, candidates, onSelectCandidate, selectedCandidateId }) {
  return (
    <Card className="p-4">
      <h4 className="font-medium text-sm mb-3">{title} ({candidates.length})</h4>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">No candidates</p>
        ) : (
          candidates.map(candidate => {
            const badge = STATUS_BADGES[candidate.status] || {};
            const isSelected = selectedCandidateId === candidate.id;
            return (
              <button
                key={candidate.id}
                onClick={() => onSelectCandidate(candidate)}
                className={cn(
                  'w-full text-left p-2 rounded-lg border text-xs transition-colors',
                  isSelected ? 'bg-primary/10 border-primary' : 'bg-muted border-border hover:bg-muted/80'
                )}
              >
                <div className="font-medium truncate">
                  {candidate.resident?.first_name} {candidate.resident?.last_name}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  Score: {candidate.match_score}%
                </div>
                <Badge variant={badge.variant} className="mt-1 text-xs">
                  {badge.label}
                </Badge>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}