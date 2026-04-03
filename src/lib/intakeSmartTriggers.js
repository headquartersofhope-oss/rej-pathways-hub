/**
 * intakeSmartTriggers.js
 *
 * Real-time rules engine for the Intake Form.
 * Analyzes partial form data as staff fills it out and returns:
 *   - alerts: urgent staff notifications
 *   - tasks: recommended service tasks
 *   - classes: recommended learning classes
 */

export function evaluateTriggers(formData) {
  const alerts = [];
  const tasks = [];
  const classes = [];

  const j = formData.justice || {};
  const h = formData.housing || {};
  const e = formData.education || {};
  const w = formData.work_history || {};
  const t = formData.transportation || {};
  const c = formData.communication || {};
  const dl = formData.digital_literacy || {};
  const mh = formData.mental_health || {};
  const tx = formData.treatment || {};
  const dep = formData.dependent_care || {};
  const dis = formData.disability || {};
  const doc = formData.documents || {};
  const lf = formData.legal_financial || {};
  const cl = formData.clothing_tools || {};
  const ben = formData.benefits || {};
  const vet = formData.veteran || {};

  // ── JUSTICE ─────────────────────────────────────────────────────────────

  if (j.sex_offender_registry) {
    alerts.push({
      id: 'sex_offender_registry',
      severity: 'critical',
      icon: '🔴',
      title: 'Sex Offender Registry Status',
      message: 'Resident is on the sex offender registry. Requires specialized placement review — many employers and locations are restricted. Do not proceed with standard job matching.',
    });
    tasks.push({ id: 'sor_review', title: 'Conduct specialized placement review for registry-restricted resident', requires_staff_action: true, priority: 'urgent' });
  }

  if (j.geographic_restrictions) {
    alerts.push({
      id: 'geo_restrictions',
      severity: 'high',
      icon: '🟠',
      title: 'Geographic Travel Restrictions Active',
      message: 'Probation/parole geographic restrictions apply. All job matches must be reviewed for location compliance before referral.',
    });
    tasks.push({ id: 'geo_review', title: 'Contact PO to clarify approved work zone boundaries', requires_staff_action: true, priority: 'urgent' });
    tasks.push({ id: 'geo_filter', title: 'Filter all job referrals for geographic compliance', requires_staff_action: true, priority: 'high' });
  }

  if (j.curfew) {
    alerts.push({
      id: 'curfew',
      severity: 'high',
      icon: '🟠',
      title: `Curfew Restriction: ${j.curfew}`,
      message: `Resident has a curfew of ${j.curfew}. Evening, overnight, and late shifts must be pre-approved by their PO before referral.`,
    });
    tasks.push({ id: 'curfew_task', title: `Verify curfew-compliant shift hours with PO (curfew: ${j.curfew})`, requires_staff_action: true, priority: 'urgent' });
  }

  if (j.charge_type === 'violent') {
    alerts.push({
      id: 'violent_charge',
      severity: 'high',
      icon: '🟠',
      title: 'Violent Offense Conviction',
      message: 'Resident has a violent offense conviction. Many employer partners conduct background checks that may flag this. Pre-screen with employers before referral.',
    });
    tasks.push({ id: 'violent_prescreen', title: 'Pre-screen employer partners for background check policy on violent offenses', requires_staff_action: true, priority: 'high' });
    classes.push({ id: 'interview_coaching', title: 'Addressing Your Background in Interviews', category: 'interview_preparation' });
  }

  if ((j.on_probation || j.on_parole) && j.check_in_frequency && j.check_in_frequency !== 'monthly' && j.check_in_frequency !== 'as_needed') {
    tasks.push({ id: 'po_schedule', title: 'Obtain written schedule of PO check-ins for employer disclosure planning', requires_staff_action: true, priority: 'high' });
    classes.push({ id: 'workplace_communication', title: 'Communicating Legal Obligations to Employers', category: 'workplace_communication' });
  }

  // ── HOUSING ─────────────────────────────────────────────────────────────

  if (['unstable', 'none', 'shelter'].includes(h.current_status)) {
    alerts.push({
      id: 'unstable_housing',
      severity: 'critical',
      icon: '🔴',
      title: 'Unstable / No Housing',
      message: 'Resident lacks stable housing. Immediate housing stabilization referral required before prioritizing employment placement.',
    });
    tasks.push({ id: 'housing_referral', title: 'Initiate emergency housing referral', requires_staff_action: true, priority: 'urgent' });
    tasks.push({ id: 'housing_plan', title: 'Attend housing stability planning meeting', priority: 'urgent' });
    classes.push({ id: 'financial_lit', title: 'Financial Literacy for Housing Stability', category: 'financial_literacy' });
  }

  // ── EDUCATION ────────────────────────────────────────────────────────────

  if (e.highest_level === 'no_diploma' && !e.currently_enrolled) {
    alerts.push({
      id: 'no_diploma',
      severity: 'high',
      icon: '🟡',
      title: 'No Diploma — Not Enrolled in GED',
      message: 'Resident has no diploma and is not currently enrolled in a GED program. Many employers require a diploma or GED.',
    });
    tasks.push({ id: 'ged_enroll', title: 'Enroll resident in GED preparation program', requires_staff_action: true, priority: 'high' });
    classes.push({ id: 'ged_prep', title: 'GED Preparation', category: 'work_readiness' });
  }

  if (e.learning_disability) {
    alerts.push({
      id: 'learning_disability',
      severity: 'medium',
      icon: '🟡',
      title: 'Learning Disability Identified',
      message: 'Resident has a learning disability. Ensure all coaching materials are adapted and request accommodation support from employer if needed.',
    });
    tasks.push({ id: 'learning_accommodations', title: 'Identify accommodation needs for learning disability in training and employment', priority: 'medium' });
  }

  // ── WORK HISTORY ─────────────────────────────────────────────────────────

  if (w.experience_level === 'none' || w.employment_status === 'unemployed') {
    tasks.push({ id: 'resume_build', title: 'Complete resume builder with case manager', priority: 'high' });
    tasks.push({ id: 'work_history_narrative', title: 'Develop work history narrative with coach', priority: 'high' });
    classes.push({ id: 'resume_class', title: 'Resume Writing Workshop', category: 'resume_preparation' });
    classes.push({ id: 'interview_prep', title: 'Interview Preparation Bootcamp', category: 'interview_preparation' });
  }

  if (w.fired_or_left === 'fired') {
    tasks.push({ id: 'termination_coaching', title: 'Role-play addressing termination history in interviews', priority: 'medium' });
    classes.push({ id: 'workplace_conduct', title: 'Workplace Conduct & Professionalism', category: 'soft_skills' });
  }

  if (w.employment_status === 'unable_to_work') {
    alerts.push({
      id: 'unable_to_work',
      severity: 'high',
      icon: '🟠',
      title: 'Resident Unable to Work',
      message: 'Resident reports being unable to work. Determine if SSI/SSDI benefits apply and assess what supports would enable future employment.',
    });
    tasks.push({ id: 'unable_assessment', title: 'Assess barriers preventing employment and explore alternative supports', requires_staff_action: true, priority: 'high' });
  }

  // ── TRANSPORTATION ───────────────────────────────────────────────────────

  if (t.transport_access === 'none') {
    alerts.push({
      id: 'no_transport',
      severity: 'high',
      icon: '🟠',
      title: 'No Transportation Access',
      message: 'Resident has no transportation access. Job placement must prioritize walkable or transit-served locations.',
    });
    tasks.push({ id: 'transit_apply', title: 'Apply for bus pass / transit subsidy program', priority: 'urgent' });
    tasks.push({ id: 'job_radius', title: 'Limit job matching to walkable or transit-accessible locations', requires_staff_action: true, priority: 'high' });
  }

  if (t.license_suspended) {
    alerts.push({
      id: 'suspended_license',
      severity: 'high',
      icon: '🟠',
      title: 'Driver\'s License Suspended',
      message: 'Suspended license limits transportation options and disqualifies resident from driving-related jobs.',
    });
    tasks.push({ id: 'license_reinstate', title: 'Research license reinstatement requirements and fee waiver options', priority: 'high' });
    tasks.push({ id: 'exclude_driving_jobs', title: 'Exclude driving-related jobs from job matching', requires_staff_action: true, priority: 'high' });
  }

  if (t.shift_availability && t.shift_availability.length === 0) {
    alerts.push({
      id: 'no_shift_avail',
      severity: 'medium',
      icon: '🟡',
      title: 'No Shift Availability Selected',
      message: 'Resident has not indicated available work shifts. This must be resolved before job matching.',
    });
  }

  // ── COMMUNICATION ────────────────────────────────────────────────────────

  if (!c.has_phone) {
    alerts.push({
      id: 'no_phone',
      severity: 'critical',
      icon: '🔴',
      title: 'No Phone Access',
      message: 'Resident has no phone. Job applications and employer contact are not possible without phone access. Apply for Lifeline/SafeLink immediately.',
    });
    tasks.push({ id: 'lifeline_app', title: 'Apply for Lifeline or SafeLink free phone program', priority: 'urgent' });
    tasks.push({ id: 'phone_relay', title: 'Set up staff message relay during application process', requires_staff_action: true, priority: 'urgent' });
  }

  if (!c.has_email) {
    tasks.push({ id: 'create_email', title: 'Help resident create professional email address (Gmail/Outlook)', priority: 'urgent' });
    classes.push({ id: 'email_basics', title: 'Digital Literacy 101: Email & Internet Basics', category: 'digital_literacy' });
  }

  // ── DIGITAL LITERACY ─────────────────────────────────────────────────────

  if (dl.comfort_level === 'none') {
    alerts.push({
      id: 'no_digital',
      severity: 'high',
      icon: '🟡',
      title: 'No Digital Literacy',
      message: 'Resident cannot use email, apply online, or use basic technology. All job application support must be staff-assisted.',
    });
    tasks.push({ id: 'digital_assist', title: 'Assist resident with all online job applications until digital skills develop', requires_staff_action: true, priority: 'high' });
    classes.push({ id: 'digital_101', title: 'Digital Literacy 101', category: 'digital_literacy' });
  } else if (dl.comfort_level === 'basic') {
    classes.push({ id: 'digital_101', title: 'Digital Literacy 101', category: 'digital_literacy' });
    tasks.push({ id: 'online_practice', title: 'Practice online job application with case manager', priority: 'medium' });
  }

  // ── MENTAL HEALTH ────────────────────────────────────────────────────────

  if (mh.has_diagnosis && !mh.in_counseling) {
    alerts.push({
      id: 'mh_no_treatment',
      severity: 'high',
      icon: '🟠',
      title: 'Mental Health Diagnosis — No Active Treatment',
      message: 'Resident has a mental health diagnosis but is not currently in counseling. Refer to mental health services before or alongside employment placement.',
    });
    tasks.push({ id: 'mh_referral', title: 'Refer resident to mental health counseling services', requires_staff_action: true, priority: 'urgent' });
  }

  if (mh.trauma_history) {
    alerts.push({
      id: 'trauma',
      severity: 'medium',
      icon: '🟡',
      title: 'Trauma History Disclosed',
      message: 'Resident has disclosed a trauma history. Use trauma-informed practices throughout case planning.',
    });
    classes.push({ id: 'conflict_mgmt', title: 'Conflict Management & Emotional Regulation', category: 'conflict_management' });
  }

  // ── TREATMENT / RECOVERY ──────────────────────────────────────────────────

  if (tx.in_treatment) {
    alerts.push({
      id: 'in_treatment',
      severity: 'medium',
      icon: '🟡',
      title: 'Active Recovery / Treatment Program',
      message: 'Resident is in an active treatment program. Work schedule must accommodate treatment appointments. Coordinate with employer before placement.',
    });
    tasks.push({ id: 'treatment_schedule', title: 'Obtain treatment schedule and coordinate with employer', requires_staff_action: true, priority: 'high' });
    classes.push({ id: 'recovery_support', title: 'Recovery Support & Workplace Success', category: 'recovery_support_education' });
  }

  // ── DEPENDENT CARE ────────────────────────────────────────────────────────

  if (dep.has_dependents && !dep.childcare_arranged) {
    alerts.push({
      id: 'childcare',
      severity: 'high',
      icon: '🟠',
      title: 'Dependents Without Childcare Plan',
      message: `Resident has ${dep.num_dependents || 'multiple'} dependents with no childcare arrangement. Must resolve before full-time placement.`,
    });
    tasks.push({ id: 'childcare_app', title: 'Apply for childcare subsidy (CCAP or equivalent)', priority: 'urgent' });
    tasks.push({ id: 'childcare_nav', title: 'Connect to resource navigator for childcare options', requires_staff_action: true, priority: 'high' });
  }

  // ── DISABILITY ────────────────────────────────────────────────────────────

  if (dis.has_disability && dis.accommodation_needed) {
    alerts.push({
      id: 'accommodation',
      severity: 'medium',
      icon: '🟡',
      title: 'Workplace Accommodation Required',
      message: `Resident requires workplace accommodation: "${dis.accommodation_notes || 'details not specified'}". Must be communicated to employer during placement.`,
    });
    tasks.push({ id: 'accommodation_letter', title: 'Prepare accommodation request documentation for employer', requires_staff_action: true, priority: 'high' });
  }

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────

  if (doc.has_state_id === false) {
    tasks.push({ id: 'id_docs', title: 'Gather docs required for state ID (birth cert, proof of address)', priority: 'urgent' });
    tasks.push({ id: 'dmv_visit', title: 'Schedule and assist resident with DMV visit', requires_staff_action: true, priority: 'urgent' });
  }
  if (doc.has_ssn_card === false) {
    tasks.push({ id: 'ssn_form', title: 'Complete SS-5 form for replacement Social Security Card', priority: 'urgent' });
  }

  // ── LEGAL / FINANCIAL ─────────────────────────────────────────────────────

  if (lf.wage_garnishment) {
    alerts.push({
      id: 'wage_garnishment',
      severity: 'medium',
      icon: '🟡',
      title: 'Wage Garnishment Active',
      message: 'Wage garnishment will reduce take-home pay. Inform resident about net pay impact and connect to financial counseling.',
    });
    tasks.push({ id: 'financial_counseling', title: 'Schedule financial counseling to review garnishment impact on take-home pay', priority: 'medium' });
    classes.push({ id: 'financial_literacy', title: 'Financial Literacy & Budgeting', category: 'financial_literacy' });
  }

  // ── CLOTHING / TOOLS ──────────────────────────────────────────────────────

  if (!cl.has_interview_clothes) {
    tasks.push({ id: 'clothing_assist', title: 'Connect resident to clothing closet or Dress for Success program', priority: 'medium' });
  }

  // ── BENEFITS ─────────────────────────────────────────────────────────────

  if (ben.eligible_not_enrolled && ben.eligible_not_enrolled.length > 0) {
    tasks.push({ id: 'benefits_enrollment', title: `Enroll in eligible benefits: ${ben.eligible_not_enrolled.join(', ')}`, priority: 'high' });
    classes.push({ id: 'financial_literacy2', title: 'Understanding Your Benefits', category: 'financial_literacy' });
  }

  // ── VETERAN ───────────────────────────────────────────────────────────────

  if (vet.is_veteran && !vet.va_enrolled) {
    tasks.push({ id: 'va_enrollment', title: 'Connect resident to VA services enrollment', requires_staff_action: true, priority: 'high' });
  }

  if (vet.discharge_status === 'other_than_honorable' || vet.discharge_status === 'dishonorable') {
    alerts.push({
      id: 'discharge_status',
      severity: 'medium',
      icon: '🟡',
      title: 'Non-Honorable Discharge Status',
      message: 'Discharge status may limit eligibility for VA benefits and some veteran-specific employer programs. Verify benefit eligibility before referral.',
    });
    tasks.push({ id: 'discharge_review', title: 'Review VA benefit eligibility based on discharge status', requires_staff_action: true, priority: 'medium' });
  }

  // Deduplicate by id
  const dedupe = (arr) => {
    const seen = new Set();
    return arr.filter(x => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  };

  return {
    alerts: dedupe(alerts),
    tasks: dedupe(tasks),
    classes: dedupe(classes),
  };
}

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };