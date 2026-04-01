import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function ScoreRing({ value, label, color }) {
  const clampedValue = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="32" fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${clampedValue * 2.01} 201`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-heading font-bold text-lg">
          {clampedValue}
        </span>
      </div>
      <p className="text-xs text-center text-muted-foreground font-medium leading-tight">{label}</p>
    </div>
  );
}

export default function ScoreSummary({ scores, barrierCount }) {
  const { barrier_severity_score = 0, stability_score = 0, work_readiness_score = 0 } = scores || {};

  const getRiskLabel = (score) => {
    if (score >= 80) return { label: 'High Risk', color: 'text-destructive' };
    if (score >= 50) return { label: 'Moderate Risk', color: 'text-amber-600' };
    return { label: 'Lower Risk', color: 'text-accent' };
  };

  const getReadinessLabel = (score) => {
    if (score >= 75) return { label: 'Job Ready', color: 'text-accent' };
    if (score >= 45) return { label: 'Developing', color: 'text-amber-600' };
    return { label: 'Needs Support', color: 'text-destructive' };
  };

  const risk = getRiskLabel(barrier_severity_score);
  const readiness = getReadinessLabel(work_readiness_score);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-sm">Assessment Scores</h3>
        <span className="text-xs text-muted-foreground">{barrierCount} barriers identified</span>
      </div>
      <div className="flex justify-around mb-5">
        <ScoreRing value={barrier_severity_score} label="Barrier Severity" color="hsl(var(--destructive))" />
        <ScoreRing value={stability_score} label="Stability Score" color="hsl(var(--accent))" />
        <ScoreRing value={work_readiness_score} label="Work Readiness" color="hsl(var(--primary))" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-center text-xs">
        <div className="p-2 rounded-lg bg-muted/50">
          <p className={`font-semibold ${risk.color}`}>{risk.label}</p>
          <p className="text-muted-foreground">Risk Level</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <p className={`font-semibold ${readiness.color}`}>{readiness.label}</p>
          <p className="text-muted-foreground">Job Readiness</p>
        </div>
      </div>
    </Card>
  );
}