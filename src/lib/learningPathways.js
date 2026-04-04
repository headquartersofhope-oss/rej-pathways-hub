// Canonical pathway definitions for the Learning Center.
// Class titles are matched against LearningClass.title (case-insensitive).

export const LEARNING_PATHWAYS = [
  {
    id: 'job_ready',
    label: 'Job Ready Path',
    description: 'Build the core skills needed to find, get, and keep a job — from writing a resume to showing up ready every day.',
    icon: '💼',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
    progressColor: 'bg-blue-500',
    certificate_category: 'job_ready',
    certificateName: 'Job Ready Certificate',
    classTitles: [
      'How This Program Works',
      'Resume Basics',
      'Interview Basics',
      'Workplace Communication',
      'How to Keep a Job',
    ],
  },
  {
    id: 'financial_basics',
    label: 'Financial Basics Path',
    description: 'Understand how money, credit, and budgeting work so your first paycheck can start building a better future.',
    icon: '💰',
    color: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-700',
    progressColor: 'bg-yellow-500',
    certificate_category: 'financial_basics',
    certificateName: 'Financial Basics Certificate',
    classTitles: [
      'How Money Works',
      'Budgeting Basics',
      'How Credit Works',
    ],
  },
  {
    id: 'digital_readiness',
    label: 'Digital Basics Path',
    description: 'Get comfortable with computers and email so you can apply for jobs and manage documents online.',
    icon: '💻',
    color: 'bg-cyan-50 border-cyan-200',
    iconBg: 'bg-cyan-100',
    iconText: 'text-cyan-700',
    progressColor: 'bg-cyan-500',
    certificate_category: 'digital_readiness',
    certificateName: 'Digital Readiness Certificate',
    classTitles: [
      'Basic Computer Skills',
      'How to Use an Email Address',
    ],
  },
];

/**
 * Resolves which LearningClass records correspond to each pathway's class titles.
 * Matches case-insensitively by title.
 */
export function resolvePathwayClasses(pathway, classes) {
  return pathway.classTitles.map(title => {
    const found = classes.find(c => c.title?.toLowerCase().trim() === title.toLowerCase().trim());
    return { title, class: found || null };
  });
}

/**
 * Calculates pathway progress stats for a given set of enrollments.
 */
export function getPathwayProgress(pathway, classes, enrollments) {
  const resolved = resolvePathwayClasses(pathway, classes);
  const completedClassIds = new Set(
    enrollments.filter(e => e.status === 'completed').map(e => e.class_id)
  );
  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));

  const knownClasses = resolved.filter(r => r.class !== null);
  const completedCount = knownClasses.filter(r => completedClassIds.has(r.class.id)).length;
  const totalCount = resolved.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = knownClasses.length > 0 && completedCount >= knownClasses.length;

  // Next class = first class in pathway that exists but is not yet completed
  const nextClass = knownClasses.find(r => !completedClassIds.has(r.class.id))?.class || null;

  return { resolved, completedCount, totalCount, pct, isComplete, completedClassIds, enrolledClassIds, nextClass };
}