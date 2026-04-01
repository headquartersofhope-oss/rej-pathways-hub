/**
 * Canonical intake status model — single source of truth.
 *
 * Status values: 'not_started' | 'in_progress' | 'completed'
 *
 * Completion is TRUE if ANY of the following hold:
 *   1. assessment.status === 'completed'
 *   2. assessment exists AND barriers exist (generation ran successfully)
 *   3. assessment exists AND tasks exist (generation ran successfully)
 *   4. resident.intake_date is populated (write-back already happened)
 */

export function deriveIntakeStatus({ assessment, barriers = [], tasks = [], resident = null }) {
  if (
    assessment?.status === 'completed' ||
    (assessment && barriers.length > 0) ||
    (assessment && tasks.length > 0) ||
    resident?.intake_date
  ) {
    return 'completed';
  }
  if (assessment?.status === 'in_progress' || assessment?.status === 'draft' || assessment) {
    return 'in_progress';
  }
  return 'not_started';
}

export const INTAKE_STATUS_LABELS = {
  completed: 'Completed',
  in_progress: 'In Progress',
  draft: 'In Progress',
  not_started: 'Not Started',
};

export const INTAKE_STATUS_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  not_started: 'bg-red-50 text-red-700',
};