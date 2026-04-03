/**
 * Automatic color-coded progress status system.
 *
 * RED    = high risk / urgent / low readiness
 * YELLOW = in progress / moderate readiness
 * GREEN  = job ready / stable / employed/graduated
 *
 * All inputs come from existing resident + derived data (barriers, tasks).
 * Staff never set this manually — it is always computed.
 */

export const PROGRESS_STATUS = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
};

/**
 * Compute the progress status for a resident.
 *
 * @param {object} resident   — Resident entity record
 * @param {Array}  barriers   — BarrierItem records for this resident (optional)
 * @param {Array}  tasks      — ServiceTask records for this resident (optional)
 * @returns {{ status: 'red'|'yellow'|'green', reasons: string[] }}
 */
export function computeProgressStatus(resident, barriers = [], tasks = []) {
  if (!resident) return { status: PROGRESS_STATUS.RED, reasons: ['No resident data'] };

  const reasons = [];

  // ── GREEN conditions (early exit) ────────────────────────────────────────
  if (['employed', 'graduated'].includes(resident.status)) {
    return { status: PROGRESS_STATUS.GREEN, reasons: ['Employed or graduated'] };
  }

  // ── RED conditions ────────────────────────────────────────────────────────
  const redFlags = [];

  // 1. Explicitly high risk
  if (resident.risk_level === 'high') redFlags.push('High risk level');

  // 2. No intake started (pre_intake with no intake date)
  if (resident.status === 'pre_intake' && !resident.intake_date) {
    redFlags.push('No intake completed');
  }

  // 3. Very low job readiness score
  if (resident.job_readiness_score !== undefined && resident.job_readiness_score !== null) {
    if (resident.job_readiness_score < 30) redFlags.push('Very low job readiness (<30%)');
  }

  // 4. Critical or high-severity unresolved barriers
  const activeBarriers = barriers.filter(b => !['resolved'].includes(b.status));
  const criticalBarriers = activeBarriers.filter(b => b.severity === 'critical');
  const highBarriers = activeBarriers.filter(b => b.severity === 'high');
  if (criticalBarriers.length > 0) redFlags.push(`${criticalBarriers.length} critical barrier(s)`);
  if (highBarriers.length >= 2) redFlags.push(`${highBarriers.length} high-severity barriers`);

  // 5. Missing key documents (ID, SSN, work auth)
  const criticalMissingDocs = (resident.missing_documents || []).filter(d =>
    ['id', 'state_id', 'ssn', 'ssn_card', 'work_authorization', 'birth_certificate'].some(k =>
      d.toLowerCase().includes(k)
    )
  );
  if (criticalMissingDocs.length >= 2) redFlags.push('Missing critical documents');

  // 6. Many overdue tasks
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t =>
    t.due_date && t.due_date < today && !['completed'].includes(t.status)
  );
  if (overdueTasks.length >= 3) redFlags.push(`${overdueTasks.length} overdue tasks`);

  if (redFlags.length > 0) {
    return { status: PROGRESS_STATUS.RED, reasons: redFlags };
  }

  // ── GREEN conditions ──────────────────────────────────────────────────────
  const greenFlags = [];

  // High readiness score
  if ((resident.job_readiness_score || 0) >= 70) greenFlags.push('High job readiness (70%+)');

  // No active barriers or all resolved
  if (activeBarriers.length === 0 && barriers.length > 0) greenFlags.push('All barriers resolved');
  else if (activeBarriers.length <= 1 && (resident.job_readiness_score || 0) >= 60) {
    greenFlags.push('Low barriers, good readiness');
  }

  // Task completion rate >= 70%
  if (tasks.length >= 3) {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const rate = completedTasks.length / tasks.length;
    if (rate >= 0.7) greenFlags.push(`${Math.round(rate * 100)}% tasks completed`);
  }

  // Intake completed + stable status
  if (resident.intake_date && ['active'].includes(resident.status)) {
    greenFlags.push('Intake completed, active');
  }

  if (greenFlags.length >= 2) {
    return { status: PROGRESS_STATUS.GREEN, reasons: greenFlags };
  }

  // ── YELLOW (default — in progress) ───────────────────────────────────────
  const yellowReasons = [];
  if (resident.intake_date) yellowReasons.push('Intake started');
  if ((resident.job_readiness_score || 0) > 0) yellowReasons.push(`Readiness: ${resident.job_readiness_score}%`);
  if (activeBarriers.length > 0) yellowReasons.push(`${activeBarriers.length} active barriers`);

  return {
    status: PROGRESS_STATUS.YELLOW,
    reasons: yellowReasons.length > 0 ? yellowReasons : ['In progress'],
  };
}

/** Tailwind classes for each status level */
export const STATUS_STYLES = {
  red: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    ring: 'ring-red-400',
    label: 'High Risk',
  },
  yellow: {
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ring: 'ring-yellow-400',
    label: 'In Progress',
  },
  green: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-400',
    label: 'On Track',
  },
};