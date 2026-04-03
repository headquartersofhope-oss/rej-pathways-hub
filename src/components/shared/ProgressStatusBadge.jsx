import React from 'react';
import { computeProgressStatus, STATUS_STYLES } from '@/lib/progressStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Reusable color-coded progress status badge.
 *
 * Props:
 *   resident  — Resident record (required)
 *   barriers  — BarrierItem[] for this resident (optional)
 *   tasks     — ServiceTask[] for this resident (optional)
 *   variant   — 'badge' (default) | 'dot' | 'dot+label'
 */
export default function ProgressStatusBadge({ resident, barriers = [], tasks = [], variant = 'badge' }) {
  const { status, reasons } = computeProgressStatus(resident, barriers, tasks);
  const styles = STATUS_STYLES[status];

  const tooltipContent = (
    <div className="text-xs space-y-0.5 max-w-[200px]">
      {reasons.map((r, i) => <p key={i}>• {r}</p>)}
    </div>
  );

  let inner;
  if (variant === 'dot') {
    inner = <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${styles.dot}`} />;
  } else if (variant === 'dot+label') {
    inner = (
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
        <span className="text-[11px] font-medium">{styles.label}</span>
      </span>
    );
  } else {
    // badge (default)
    inner = (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${styles.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
        {styles.label}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{inner}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}