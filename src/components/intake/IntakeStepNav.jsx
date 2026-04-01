import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { INTAKE_STEPS } from '@/lib/intakeBarriers';

export default function IntakeStepNav({ currentStep, completedSteps, onStepClick }) {
  return (
    <div className="flex overflow-x-auto gap-1 pb-2 scrollbar-hide">
      {INTAKE_STEPS.map((step, idx) => {
        const isDone = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
              isCurrent ? 'bg-primary text-primary-foreground shadow-sm' :
              isDone ? 'bg-accent/15 text-accent' :
              'text-muted-foreground hover:bg-muted'
            )}
          >
            <span className="text-base leading-none">
              {isDone ? <CheckCircle2 className="w-4 h-4 text-accent" /> : step.icon}
            </span>
            <span className="text-[10px]">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}