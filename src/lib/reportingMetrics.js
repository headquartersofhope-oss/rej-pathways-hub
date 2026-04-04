/**
 * Core metric calculation functions for reporting system
 * All calculations use real stored data and global_resident_id to avoid duplicates
 */

import { base44 } from '@/api/base44Client';

/**
 * Calculate all core metrics for dashboard
 */
export async function calculateCoreMetrics(dateRange = null) {
  const [residents, learningAssignments, certificates, jobMatches, outcomes, barriers, employers, listings] = 
    await Promise.all([
      base44.entities.Resident.list(),
      base44.entities.LearningAssignment.list(),
      base44.entities.Certificate.list(),
      base44.entities.JobMatch.list(),
      base44.entities.OutcomeRecord.list(),
      base44.entities.BarrierItem.list(),
      base44.entities.Employer.list(),
      base44.entities.JobListing.list(),
    ]);

  const filtered = {
    residents: filterByDateRange(residents, dateRange, 'intake_date'),
    learningAssignments: filterByDateRange(learningAssignments, dateRange, 'assigned_date'),
    certificates: filterByDateRange(certificates, dateRange, 'issued_date'),
    jobMatches: filterByDateRange(jobMatches, dateRange, 'applied_date'),
    outcomes: filterByDateRange(outcomes, dateRange, 'follow_up_date'),
    barriers: filterByDateRange(barriers, dateRange, 'updated_date'),
    listings: filterByDateRange(listings, dateRange, 'posted_date'),
  };

  // Get unique residents in active status
  const activeResidents = new Set(
    filtered.residents.filter(r => r.status === 'active' || r.status === 'employed').map(r => r.global_resident_id)
  );

  // Get completed intakes
  const completedIntakes = new Set(
    filtered.residents
      .filter(r => r.population && (r.status === 'active' || r.status === 'employed' || r.status === 'graduated'))
      .map(r => r.global_resident_id)
  );

  // Calculate resident metrics
  const residentMetrics = {
    totalResidents: new Set(filtered.residents.map(r => r.global_resident_id)).size,
    activeResidents: activeResidents.size,
    completedIntake: completedIntakes.size,
    averageJobReadiness: calculateAverage(
      filtered.residents
        .filter(r => r.job_readiness_score != null)
        .map(r => r.job_readiness_score)
    ),
  };

  // Calculate learning metrics
  const assignedClasses = new Set(filtered.learningAssignments.map(a => a.class_id)).size;
  const completedClasses = filtered.learningAssignments.filter(a => a.status === 'completed' || a.status === 'passed').length;
  const certificatesIssued = new Set(filtered.certificates.map(c => c.resident_id)).size;

  const learningMetrics = {
    classesAssigned: assignedClasses,
    classesCompleted: completedClasses,
    completionRate: assignedClasses > 0 ? Math.round((completedClasses / assignedClasses) * 100) : 0,
    certificatesIssued,
  };

  // Calculate employment metrics
  const uniqueHired = new Set(
    filtered.jobMatches.filter(m => m.status === 'hired').map(m => m.global_resident_id)
  ).size;
  
  const activeEmployed = new Set(
    filtered.jobMatches
      .filter(m => ['hired', 'interview_scheduled', 'interview_requested'].includes(m.status))
      .map(m => m.global_resident_id)
  ).size;

  // Time to employment (days from intake to hire)
  const timeToEmployment = calculateTimeToEmployment(filtered.residents, filtered.jobMatches);

  const employmentMetrics = {
    residentsPlaced: uniqueHired,
    activeEmployed,
    averageTimeToEmployment: timeToEmployment,
    retention30Days: countRetentionMilestone(filtered.outcomes, '30_days'),
    retention60Days: countRetentionMilestone(filtered.outcomes, '60_days'),
    retention90Days: countRetentionMilestone(filtered.outcomes, '90_days'),
  };

  // Barrier metrics
  const barrierCategories = {};
  filtered.barriers.forEach(b => {
    if (b.category) {
      barrierCategories[b.category] = (barrierCategories[b.category] || 0) + 1;
    }
  });

  const resolvedBarriers = filtered.barriers.filter(b => b.status === 'resolved').length;
  const barrierMetrics = {
    totalBarriers: filtered.barriers.length,
    resolvedBarriers,
    resolutionRate: filtered.barriers.length > 0 ? Math.round((resolvedBarriers / filtered.barriers.length) * 100) : 0,
    mostCommon: Object.entries(barrierCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count })),
  };

  // Employer metrics
  const employerMetrics = {
    jobsPosted: filtered.listings.length,
    matchesCreated: filtered.jobMatches.length,
    candidatesHired: uniqueHired,
    activeEmployers: new Set(filtered.listings.map(l => l.employer_id).filter(Boolean)).size,
  };

  // Program performance
  const programMetrics = calculateProgramPerformance(filtered, residentMetrics, employmentMetrics);

  return {
    residents: residentMetrics,
    learning: learningMetrics,
    employment: employmentMetrics,
    barriers: barrierMetrics,
    employers: employerMetrics,
    program: programMetrics,
    dateRange: dateRange || 'all_time',
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get resident outcome details for outcome tracking
 */
export async function getResidentOutcomes(residentId) {
  const [resident, assignments, certificates, matches, outcomes, barriers] = await Promise.all([
    base44.entities.Resident.get(residentId),
    base44.entities.LearningAssignment.filter({ resident_id: residentId }),
    base44.entities.Certificate.filter({ resident_id: residentId }),
    base44.entities.JobMatch.filter({ resident_id: residentId }),
    base44.entities.OutcomeRecord.filter({ resident_id: residentId }),
    base44.entities.BarrierItem.filter({ resident_id: residentId }),
  ]).catch(() => [null, [], [], [], [], []]);

  if (!resident) return null;

  const completedAssignments = assignments.filter(a => a.status === 'completed' || a.status === 'passed');

  return {
    residentId: resident.id,
    globalId: resident.global_resident_id,
    name: `${resident.first_name} ${resident.last_name}`,
    intakeDate: resident.intake_date,
    jobReadinessScore: resident.job_readiness_score,
    status: resident.status,
    
    learning: {
      classesAssigned: assignments.length,
      classesCompleted: completedAssignments.length,
      certificates: certificates.length,
      details: completedAssignments.map(a => ({
        classId: a.class_id,
        completedDate: a.completion_date,
        score: a.best_quiz_score,
      })),
    },

    employment: {
      jobMatches: matches.length,
      hired: matches.find(m => m.status === 'hired') || null,
      mostRecentMatch: matches.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null,
    },

    milestones: outcomes.sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date)).map(o => ({
      milestone: o.milestone,
      date: o.follow_up_date,
      employmentStatus: o.employment_status,
      housing: o.housing_stability,
      notes: o.notes,
    })),

    barriers: barriers.map(b => ({
      category: b.category,
      title: b.title,
      status: b.status,
      severity: b.severity,
    })),
  };
}

/**
 * Get employer outcome details
 */
export async function getEmployerOutcomes(employerId) {
  const [employer, listings, matches] = await Promise.all([
    base44.entities.Employer.get(employerId),
    base44.entities.JobListing.list(),
    base44.entities.JobMatch.list(),
  ]);

  if (!employer) return null;

  const employerListings = listings.filter(l => l.employer_id === employerId || l.employer_name === employer.company_name);
  const employerMatches = matches.filter(m => 
    employerListings.some(l => l.id === m.job_listing_id)
  );

  const hired = employerMatches.filter(m => m.status === 'hired');

  return {
    employerId: employer.id,
    companyName: employer.company_name,
    contact: employer.contact_name,
    industry: employer.industry,
    
    jobsPosted: employerListings.length,
    activeJobs: employerListings.filter(l => l.status === 'active').length,
    
    candidatesMatched: employerMatches.length,
    candidatesHired: hired.length,
    hireRate: employerMatches.length > 0 ? Math.round((hired.length / employerMatches.length) * 100) : 0,
    
    averageTimeToHire: calculateAverageTimeToHire(employerMatches),
    
    jobsWithHires: employerListings.filter(l => 
      hired.some(h => h.job_listing_id === l.id)
    ).length,
  };
}

/**
 * Filter records by date range
 */
function filterByDateRange(records, dateRange, dateField = 'created_date') {
  if (!dateRange) return records;

  const now = new Date();
  let startDate;

  switch (dateRange) {
    case '7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      return records;
  }

  return records.filter(r => {
    const date = new Date(r[dateField]);
    return date >= startDate;
  });
}

/**
 * Calculate average of numbers
 */
function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round(sum / numbers.length);
}

/**
 * Calculate days from intake to employment
 */
function calculateTimeToEmployment(residents, matches) {
  const hired = matches.filter(m => m.status === 'hired' && m.hired_date);
  if (hired.length === 0) return null;

  const times = hired.map(match => {
    const resident = residents.find(r => r.id === match.resident_id);
    if (!resident || !resident.intake_date) return null;

    const days = Math.floor(
      (new Date(match.hired_date) - new Date(resident.intake_date)) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? days : null;
  }).filter(Boolean);

  return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
}

/**
 * Count residents at retention milestone
 */
function countRetentionMilestone(outcomes, milestone) {
  return new Set(
    outcomes
      .filter(o => o.milestone === milestone && o.successfully_placed)
      .map(o => o.resident_id)
  ).size;
}

/**
 * Calculate average time to hire for employer
 */
function calculateAverageTimeToHire(matches) {
  const hired = matches.filter(m => m.status === 'hired' && m.applied_date && m.hired_date);
  if (hired.length === 0) return null;

  const times = hired.map(m => 
    Math.floor((new Date(m.hired_date) - new Date(m.applied_date)) / (1000 * 60 * 60 * 24))
  );

  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

/**
 * Calculate overall program performance metrics
 */
function calculateProgramPerformance(data, residents, employment) {
  const totalResidents = residents.totalResidents || 1;
  const completedIntakes = residents.completedIntake || 0;

  return {
    placementRate: totalResidents > 0 ? Math.round((employment.residentsPlaced / totalResidents) * 100) : 0,
    completionRate: completedIntakes > 0 ? Math.round((data.learningAssignments.filter(a => a.status === 'completed' || a.status === 'passed').length / data.learningAssignments.length) * 100) : 0,
    retention30Rate: employment.retention30Days > 0 ? Math.round((employment.retention30Days / employment.residentsPlaced) * 100) : 0,
    retention90Rate: employment.retention90Days > 0 ? Math.round((employment.retention90Days / employment.residentsPlaced) * 100) : 0,
    averageProgramDuration: calculateAverageProgramDuration(data.residents),
  };
}

/**
 * Calculate average program duration
 */
function calculateAverageProgramDuration(residents) {
  const durations = residents
    .filter(r => r.exit_date && r.intake_date)
    .map(r => 
      Math.floor((new Date(r.actual_exit_date) - new Date(r.intake_date)) / (1000 * 60 * 60 * 24))
    );

  return durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
}

/**
 * Export metrics to CSV
 */
export function exportMetricsToCSV(metrics, filename = 'outcomes-report.csv') {
  const lines = [];

  // Core metrics section
  lines.push('CORE METRICS REPORT');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  lines.push('RESIDENTS');
  lines.push(`Total Residents,${metrics.residents.totalResidents}`);
  lines.push(`Active Residents,${metrics.residents.activeResidents}`);
  lines.push(`Completed Intake,${metrics.residents.completedIntake}`);
  lines.push(`Average Job Readiness Score,${metrics.residents.averageJobReadiness}`);
  lines.push('');

  lines.push('LEARNING');
  lines.push(`Classes Assigned,${metrics.learning.classesAssigned}`);
  lines.push(`Classes Completed,${metrics.learning.classesCompleted}`);
  lines.push(`Completion Rate,${metrics.learning.completionRate}%`);
  lines.push(`Certificates Issued,${metrics.learning.certificatesIssued}`);
  lines.push('');

  lines.push('EMPLOYMENT');
  lines.push(`Residents Placed,${metrics.employment.residentsPlaced}`);
  lines.push(`Active Employed,${metrics.employment.activeEmployed}`);
  lines.push(`Average Time to Employment,${metrics.employment.averageTimeToEmployment || 'N/A'} days`);
  lines.push(`Retention (30 days),${metrics.employment.retention30Days}`);
  lines.push(`Retention (60 days),${metrics.employment.retention60Days}`);
  lines.push(`Retention (90 days),${metrics.employment.retention90Days}`);
  lines.push('');

  lines.push('BARRIERS');
  lines.push(`Total Barriers,${metrics.barriers.totalBarriers}`);
  lines.push(`Resolved Barriers,${metrics.barriers.resolvedBarriers}`);
  lines.push(`Resolution Rate,${metrics.barriers.resolutionRate}%`);
  lines.push('');

  lines.push('PROGRAM PERFORMANCE');
  lines.push(`Placement Rate,${metrics.program.placementRate}%`);
  lines.push(`Completion Rate,${metrics.program.completionRate}%`);
  lines.push(`30-Day Retention Rate,${metrics.program.retention30Rate}%`);
  lines.push(`90-Day Retention Rate,${metrics.program.retention90Rate}%`);

  const csv = lines.join('\n');
  downloadCSV(csv, filename);
}

/**
 * Export resident outcomes to CSV
 */
export function exportResidentOutcomesToCSV(outcomes, filename = 'resident-outcomes.csv') {
  const lines = ['Resident ID', 'Name', 'Intake Date', 'Job Readiness Score', 'Classes Completed', 'Certificates', 'Employment Status', 'Hired Date'];

  outcomes.forEach(outcome => {
    lines.push([
      outcome.globalId,
      outcome.name,
      outcome.intakeDate || '',
      outcome.jobReadinessScore || '',
      outcome.learning.classesCompleted,
      outcome.learning.certificates,
      outcome.employment.hired ? 'Hired' : outcome.status,
      outcome.employment.hired?.hired_date || '',
    ].map(v => `"${v}"`).join(','));
  });

  downloadCSV(lines.join('\n'), filename);
}

/**
 * Trigger CSV download
 */
function downloadCSV(csv, filename) {
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  link.download = filename;
  link.click();
}