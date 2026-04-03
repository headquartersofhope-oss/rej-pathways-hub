/**
 * Onboarding checklist logic.
 * Computes the list of steps and their completion state from existing data.
 * No manual status setting — derived automatically wherever possible.
 */

export const ONBOARDING_STEPS = [
  {
    id: 'confirm_name',
    label: 'Confirm your name',
    description: 'Make sure your first and last name are correct.',
    link: null, // handled inline
    category: 'profile',
  },
  {
    id: 'add_phone',
    label: 'Add your phone number',
    description: 'So your case manager can reach you.',
    link: null,
    category: 'profile',
  },
  {
    id: 'add_email',
    label: 'Add your email address',
    description: 'Required for document notifications and updates.',
    link: null,
    category: 'profile',
  },
  {
    id: 'add_dob',
    label: 'Add your date of birth',
    description: 'Required for program eligibility and records.',
    link: null,
    category: 'profile',
  },
  {
    id: 'confirm_language',
    label: 'Confirm preferred language',
    description: "We'll make sure you get support in your language.",
    link: null,
    category: 'profile',
  },
  {
    id: 'complete_intake',
    label: 'Complete intake assessment',
    description: 'This helps us understand your goals and barriers.',
    link: (residentId) => `/intake/${residentId}/form`,
    category: 'intake',
  },
  {
    id: 'upload_id',
    label: 'Upload a government-issued ID',
    description: "Required for enrollment. Driver's license, state ID, or passport.",
    link: '/documents',
    category: 'documents',
  },
  {
    id: 'review_tasks',
    label: 'Review your tasks',
    description: 'Check your open action items and next steps.',
    link: (residentId) => `/residents/${residentId}`,
    category: 'tasks',
  },
  {
    id: 'view_learning',
    label: 'Explore your classes',
    description: 'See what classes are available and get enrolled.',
    link: '/learning',
    category: 'learning',
  },
  {
    id: 'check_job_readiness',
    label: 'View your job readiness profile',
    description: 'See your readiness score and what to work on next.',
    link: (residentId) => `/residents/${residentId}?tab=job-readiness`,
    category: 'job_readiness',
  },
];

/**
 * Compute which steps are auto-complete based on resident data.
 * Returns a Set of completed step IDs.
 */
export function computeAutoCompletedSteps(resident, documents = [], tasks = [], assessment = null) {
  const auto = new Set();

  if (resident?.first_name && resident?.last_name) auto.add('confirm_name');
  if (resident?.phone) auto.add('add_phone');
  if (resident?.email) auto.add('add_email');
  if (resident?.date_of_birth) auto.add('add_dob');
  if (resident?.primary_language) auto.add('confirm_language');

  // Intake: assessment exists and is completed, or intake_date is set
  if (
    assessment?.status === 'completed' ||
    resident?.intake_date ||
    resident?.status === 'active' ||
    resident?.status === 'employed' ||
    resident?.status === 'graduated'
  ) {
    auto.add('complete_intake');
  }

  // Documents: has at least one ID-type document uploaded
  const hasId = documents.some(d =>
    ['id', 'background_check'].includes(d.type) ||
    d.name?.toLowerCase().includes('id') ||
    d.name?.toLowerCase().includes('license') ||
    d.name?.toLowerCase().includes('passport')
  );
  if (hasId) auto.add('upload_id');

  // Tasks: has been to the profile (we just check if tasks exist — they've been assigned)
  if (tasks.length > 0) auto.add('review_tasks');

  return auto;
}

/**
 * Build the full step list with completion state merged from auto + manually completed steps.
 */
export function buildChecklist(resident, documents = [], tasks = [], assessment = null, manuallyCompleted = []) {
  const autoCompleted = computeAutoCompletedSteps(resident, documents, tasks, assessment);
  const manualSet = new Set(manuallyCompleted);

  return ONBOARDING_STEPS.map(step => ({
    ...step,
    completed: autoCompleted.has(step.id) || manualSet.has(step.id),
    autoCompleted: autoCompleted.has(step.id),
  }));
}

export function computeProgress(checklist) {
  const completed = checklist.filter(s => s.completed).length;
  return Math.round((completed / checklist.length) * 100);
}