// ─────────────────────────────────────────────
// Barrier Library & Auto-Plan Generation Logic
// ─────────────────────────────────────────────

export const BARRIER_CATEGORIES = {
  legal: 'Legal',
  identification_documents: 'ID & Documents',
  housing_stability: 'Housing Stability',
  transportation: 'Transportation',
  education: 'Education',
  digital_literacy: 'Digital Literacy',
  work_history: 'Work History',
  interview_readiness: 'Interview Readiness',
  mental_health_support: 'Mental Health Support',
  substance_recovery: 'Substance Recovery',
  childcare_dependent_care: 'Childcare / Dependent Care',
  benefits: 'Benefits',
  financial_readiness: 'Financial Readiness',
  disability_accommodations: 'Disability / Accommodations',
  clothing_tools_gear: 'Clothing / Tools / Gear',
  communication_access: 'Communication Access',
};

export const SEVERITY_WEIGHTS = { low: 1, medium: 2, high: 3, critical: 5 };
export const MAX_BARRIER_SCORE = 100;

/**
 * Analyzes a completed IntakeAssessment and returns an array of BarrierItem objects (without IDs).
 */
export function detectBarriers(intake) {
  const barriers = [];
  const d = intake;

  // ── ID & Documents ──────────────────────────────────────
  if (!d.documents?.has_state_id) barriers.push({
    category: 'identification_documents', title: 'Missing State ID',
    severity: 'critical',
    description: 'Resident does not have a valid state-issued photo ID. Required for employment eligibility.',
    required_documents: ['Birth Certificate or Passport', 'Proof of Address'],
  });
  if (!d.documents?.has_birth_certificate) barriers.push({
    category: 'identification_documents', title: 'Missing Birth Certificate',
    severity: 'high',
    description: 'Birth certificate needed to obtain ID and SSN card.',
    required_documents: ['Request form from vital records office'],
  });
  if (!d.documents?.has_ssn_card) barriers.push({
    category: 'identification_documents', title: 'Missing Social Security Card',
    severity: 'critical',
    description: 'SSN card required for employment eligibility verification (I-9).',
    required_documents: ['State ID or Birth Certificate'],
  });
  if (!d.documents?.has_resume) barriers.push({
    category: 'work_history', title: 'No Resume',
    severity: 'high',
    description: 'Resident does not have a current resume. Blocks most job applications.',
  });
  if (!d.documents?.has_references) barriers.push({
    category: 'work_history', title: 'No Professional References',
    severity: 'medium',
    description: 'Resident lacks professional or character references for employment.',
  });
  if (d.veteran?.is_veteran && !d.documents?.has_dd214) barriers.push({
    category: 'identification_documents', title: 'Missing DD-214',
    severity: 'high',
    description: 'DD-214 needed for veteran benefits and to verify military service to employers.',
  });

  // ── Transportation ───────────────────────────────────────
  if (!d.transportation?.has_vehicle && !d.transportation?.uses_public_transit) barriers.push({
    category: 'transportation', title: 'No Transportation Access',
    severity: 'critical',
    description: 'Resident has no vehicle or public transit access, severely limiting job reach.',
  });
  if (!d.transportation?.has_vehicle && d.transportation?.uses_public_transit && !d.transportation?.transit_accessible) barriers.push({
    category: 'transportation', title: 'Limited Transit Access',
    severity: 'high',
    description: 'Public transit available but routes do not serve likely employment areas.',
  });
  if (d.transportation?.valid_license === false && !d.transportation?.has_vehicle) barriers.push({
    category: 'transportation', title: 'No Valid Driver\'s License',
    severity: 'medium',
    description: 'No valid license limits ability to drive to work or obtain driving-related jobs.',
  });
  if (d.transportation?.license_suspended) barriers.push({
    category: 'transportation', title: 'Suspended Driver\'s License',
    severity: 'high',
    description: 'Suspended license — must address fines or reinstatement requirements.',
  });

  // ── Housing ──────────────────────────────────────────────
  if (['shelter', 'unstable', 'none'].includes(d.housing?.current_status)) barriers.push({
    category: 'housing_stability', title: 'Unstable Housing',
    severity: 'critical',
    description: 'Unstable or no housing severely impacts ability to maintain employment.',
  });
  if (d.housing?.eviction_history) barriers.push({
    category: 'housing_stability', title: 'Eviction History',
    severity: 'medium',
    description: 'Prior evictions may create housing barriers and stress related to stability.',
  });

  // ── Legal / Justice ──────────────────────────────────────
  if (d.justice?.on_probation || d.justice?.on_parole) {
    if (d.justice?.geographic_restrictions) barriers.push({
      category: 'legal', title: 'Geographic Restrictions (Probation/Parole)',
      severity: 'high',
      description: 'Geographic restrictions limit which employers or locations are accessible. Requires staff review.',
    });
    if (d.justice?.curfew) barriers.push({
      category: 'legal', title: 'Curfew Requirement',
      severity: 'high',
      description: `Curfew (${d.justice.curfew}) may conflict with evening or overnight shifts. Requires employer accommodation or officer approval.`,
    });
    barriers.push({
      category: 'legal', title: 'Probation/Parole Check-in Requirements',
      severity: 'medium',
      description: `Check-in frequency: ${d.justice.check_in_frequency || 'unspecified'}. Employer must accommodate schedule.`,
    });
  }
  if (d.justice?.sex_offender_registry) barriers.push({
    category: 'legal', title: 'Sex Offender Registry Restrictions',
    severity: 'critical',
    description: 'Registry status creates significant employer and location restrictions. Requires specialized placement support.',
    requires_staff_action: true,
  });
  if (d.legal_financial?.has_fines_fees) barriers.push({
    category: 'financial_readiness', title: 'Outstanding Legal Fines / Fees',
    severity: 'medium',
    description: `Estimated $${d.legal_financial?.total_owed || 0} owed. May affect employment background checks or license reinstatement.`,
  });
  if (d.legal_financial?.wage_garnishment) barriers.push({
    category: 'financial_readiness', title: 'Wage Garnishment',
    severity: 'high',
    description: 'Wage garnishment reduces take-home pay and may demotivate employment.',
  });

  // ── Education ────────────────────────────────────────────
  if (['no_diploma', 'ged'].includes(d.education?.highest_level) && !d.education?.currently_enrolled) barriers.push({
    category: 'education', title: 'No High School Diploma or GED',
    severity: 'high',
    description: 'Many employers require a diploma or GED. Resident should be enrolled in GED classes.',
  });

  // ── Digital Literacy ─────────────────────────────────────
  if (['none', 'basic'].includes(d.digital_literacy?.comfort_level)) barriers.push({
    category: 'digital_literacy', title: 'Low Digital Literacy',
    severity: 'high',
    description: 'Resident cannot apply for jobs online or use common workplace technology.',
  });
  if (!d.communication?.has_email) barriers.push({
    category: 'digital_literacy', title: 'No Email Address',
    severity: 'high',
    description: 'Email is required for job applications, interview scheduling, and workplace communication.',
  });

  // ── Communication Access ─────────────────────────────────
  if (!d.communication?.has_phone) barriers.push({
    category: 'communication_access', title: 'No Phone Access',
    severity: 'critical',
    description: 'Phone required for job applications, employer calls, and case management contact.',
  });
  if (d.communication?.phone_type === 'basic' || !d.communication?.has_internet_access) barriers.push({
    category: 'communication_access', title: 'Limited Device / Internet Access',
    severity: 'medium',
    description: 'Limited smartphone or internet access restricts job searching and online applications.',
  });

  // ── Mental Health ────────────────────────────────────────
  if (d.mental_health?.has_diagnosis && !d.mental_health?.in_counseling) barriers.push({
    category: 'mental_health_support', title: 'Mental Health Diagnosis — No Active Treatment',
    severity: 'high',
    description: 'Resident has a diagnosis but is not currently in counseling. Needs linkage to services.',
  });
  if (d.mental_health?.trauma_history) barriers.push({
    category: 'mental_health_support', title: 'Trauma History',
    severity: 'medium',
    description: 'Trauma-informed support should be integrated into case planning.',
  });

  // ── Substance Recovery ───────────────────────────────────
  if (d.treatment?.in_treatment) barriers.push({
    category: 'substance_recovery', title: 'Active Recovery / Treatment Program',
    severity: 'medium',
    description: 'Treatment schedule must be coordinated with employment. Employer understanding needed.',
  });

  // ── Interview Readiness ──────────────────────────────────
  if (!d.work_history?.years_of_experience || d.work_history?.years_of_experience < 1) barriers.push({
    category: 'interview_readiness', title: 'Limited Work History',
    severity: 'high',
    description: 'Gaps or lack of work history require interview coaching and narrative development.',
  });
  if (d.work_history?.fired_or_left === 'fired') barriers.push({
    category: 'interview_readiness', title: 'Termination History',
    severity: 'medium',
    description: 'History of being fired — needs coaching on how to address this in interviews.',
  });

  // ── Childcare ─────────────────────────────────────────────
  if (d.dependent_care?.has_dependents && !d.dependent_care?.childcare_arranged) barriers.push({
    category: 'childcare_dependent_care', title: 'Childcare Not Arranged',
    severity: 'high',
    description: `${d.dependent_care?.num_dependents || 'Multiple'} dependents with no childcare plan. Will affect shift availability.`,
  });

  // ── Disability ────────────────────────────────────────────
  if (d.disability?.has_disability && d.disability?.accommodation_needed) barriers.push({
    category: 'disability_accommodations', title: 'Accommodation Needed',
    severity: 'medium',
    description: `Accommodation required: ${d.disability?.accommodation_notes || 'details needed'}. Must be communicated to employer.`,
  });

  // ── Clothing / Gear ──────────────────────────────────────
  if (!d.clothing_tools?.has_interview_clothes) barriers.push({
    category: 'clothing_tools_gear', title: 'No Interview-Appropriate Clothing',
    severity: 'medium',
    description: 'Resident does not have professional attire for job interviews.',
  });
  if (d.clothing_tools?.needs_tools_equipment || d.clothing_tools?.needs_safety_gear) barriers.push({
    category: 'clothing_tools_gear', title: 'Needs Work Tools / Safety Gear',
    severity: 'medium',
    description: 'Resident needs tools, equipment, or safety gear to start work.',
  });

  // ── Benefits ─────────────────────────────────────────────
  if (d.benefits?.eligible_not_enrolled?.length > 0) barriers.push({
    category: 'benefits', title: 'Eligible Benefits Not Enrolled',
    severity: 'medium',
    description: `Not enrolled in: ${d.benefits.eligible_not_enrolled.join(', ')}. Enrollment can stabilize income during job search.`,
  });

  return barriers.map(b => ({
    ...b,
    auto_generated: true,
    status: 'new',
    resident_id: intake.resident_id,
    global_resident_id: intake.global_resident_id || '',
    assessment_id: intake.id,
    organization_id: intake.organization_id,
  }));
}

/**
 * Generates tasks for each barrier.
 */
export function generateTasksForBarrier(barrier, planId, residentId, globalResidentId, orgId) {
  const base = {
    plan_id: planId,
    resident_id: residentId,
    global_resident_id: globalResidentId || '',
    organization_id: orgId,
    barrier_item_id: barrier.id || '',
  };
  const taskMap = {
    'Missing State ID': [
      { title: 'Gather required documents (birth certificate, proof of address)', priority: 'urgent', is_resident_visible: true },
      { title: 'Visit DMV to apply for state ID', priority: 'urgent', is_resident_visible: true },
      { title: 'Staff: Provide transportation to DMV if needed', priority: 'high', requires_staff_action: true, is_resident_visible: false },
    ],
    'Missing Social Security Card': [
      { title: 'Complete SS-5 form for replacement SSN card', priority: 'urgent', is_resident_visible: true },
      { title: 'Mail or visit SSA office', priority: 'urgent', is_resident_visible: true },
    ],
    'Missing Birth Certificate': [
      { title: 'Identify birth state and request vital records form', priority: 'high', is_resident_visible: true },
      { title: 'Submit payment for birth certificate copy', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Assist with fee waiver if applicable', requires_staff_action: true, is_resident_visible: false },
    ],
    'Missing DD-214': [
      { title: 'Complete SF-180 to request DD-214 from National Archives', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Connect resident with VSO for expedited request', requires_staff_action: true, is_resident_visible: false },
    ],
    'No Resume': [
      { title: 'Attend Resume Writing Workshop', priority: 'high', is_resident_visible: true },
      { title: 'Complete resume in online resume builder tool', priority: 'high', is_resident_visible: true },
      { title: 'Submit draft resume for staff review', priority: 'medium', is_resident_visible: true },
    ],
    'No Professional References': [
      { title: 'Identify 3 character or professional references', priority: 'medium', is_resident_visible: true },
      { title: 'Draft reference request letter with case manager', priority: 'medium', is_resident_visible: true },
    ],
    'No Transportation Access': [
      { title: 'Apply for bus pass / transit subsidy program', priority: 'urgent', is_resident_visible: true },
      { title: 'Review bus routes to potential work sites', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Filter job matches within commuting distance', requires_staff_action: true, is_resident_visible: false },
      { title: 'Staff: Explore ride-share assistance programs', requires_staff_action: true, is_resident_visible: false },
    ],
    'Limited Transit Access': [
      { title: 'Identify bus routes and walking distances to nearby employers', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Prioritize employers with transit accessibility in job matching', requires_staff_action: true, is_resident_visible: false },
    ],
    'No High School Diploma or GED': [
      { title: 'Enroll in GED preparation class', priority: 'high', is_resident_visible: true },
      { title: 'Complete GED skills assessment', priority: 'high', is_resident_visible: true },
    ],
    'Low Digital Literacy': [
      { title: 'Enroll in Digital Literacy 101 class', priority: 'high', is_resident_visible: true },
      { title: 'Practice online job application with case manager', priority: 'medium', is_resident_visible: true },
    ],
    'No Email Address': [
      { title: 'Create professional email address (Gmail/Outlook)', priority: 'urgent', is_resident_visible: true },
      { title: 'Practice sending and receiving emails', priority: 'medium', is_resident_visible: true },
    ],
    'No Phone Access': [
      { title: 'Apply for Lifeline/SafeLink free phone program', priority: 'urgent', is_resident_visible: true },
      { title: 'Staff: Provide loaner phone or message relay during application', requires_staff_action: true, is_resident_visible: false },
    ],
    'Probation/Parole Check-in Requirements': [
      { title: 'Document probation/parole schedule for employer disclosure planning', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Coordinate with PO for work schedule accommodation letter', requires_staff_action: true, is_resident_visible: false },
    ],
    'Geographic Restrictions (Probation/Parole)': [
      { title: 'Staff: Create alert — review all job matches for geographic compliance', priority: 'urgent', requires_staff_action: true, is_resident_visible: false },
      { title: 'Staff: Contact PO to clarify approved work locations', requires_staff_action: true, is_resident_visible: false },
    ],
    'Curfew Requirement': [
      { title: 'Staff: Review curfew with PO and note approved shift hours', requires_staff_action: true, priority: 'urgent', is_resident_visible: false },
      { title: 'Filter job listings to daytime-only shifts', priority: 'high', is_resident_visible: true },
    ],
    'Childcare Not Arranged': [
      { title: 'Apply for childcare subsidy (CCAP or local program)', priority: 'urgent', is_resident_visible: true },
      { title: 'Research family/community childcare options', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Link to resource navigator for childcare referral', requires_staff_action: true, is_resident_visible: false },
    ],
    'Mental Health Diagnosis — No Active Treatment': [
      { title: 'Staff: Refer resident to mental health services', priority: 'urgent', requires_staff_action: true, is_resident_visible: false },
      { title: 'Attend introductory counseling appointment', priority: 'high', is_resident_visible: true },
    ],
    'Active Recovery / Treatment Program': [
      { title: 'Share treatment schedule with case manager for employer coordination', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Identify treatment-friendly employers in job matching', requires_staff_action: true, is_resident_visible: false },
    ],
    'No Interview-Appropriate Clothing': [
      { title: 'Visit clothing closet / clothing assistance program', priority: 'medium', is_resident_visible: true },
      { title: 'Staff: Connect to Dress for Success or local donation programs', requires_staff_action: true, is_resident_visible: false },
    ],
    'Limited Work History': [
      { title: 'Enroll in Mock Interview Workshop', priority: 'high', is_resident_visible: true },
      { title: 'Complete work history narrative with case manager', priority: 'high', is_resident_visible: true },
    ],
    'Termination History': [
      { title: 'Attend "Addressing Employment Gaps" coaching session', priority: 'medium', is_resident_visible: true },
      { title: 'Role-play termination explanation with case manager', priority: 'medium', is_resident_visible: true },
    ],
    'Unstable Housing': [
      { title: 'Attend housing stability planning meeting', priority: 'urgent', is_resident_visible: true },
      { title: 'Staff: Initiate housing referral process', requires_staff_action: true, priority: 'urgent', is_resident_visible: false },
    ],
    'Outstanding Legal Fines / Fees': [
      { title: 'Obtain itemized list of all fines and fees', priority: 'medium', is_resident_visible: true },
      { title: 'Staff: Research fee waiver or payment plan programs', requires_staff_action: true, is_resident_visible: false },
    ],
    'Wage Garnishment': [
      { title: 'Meet with financial counselor to understand garnishment impact', priority: 'high', is_resident_visible: true },
    ],
    'Needs Work Tools / Safety Gear': [
      { title: 'Identify specific tools or gear required for target job', priority: 'medium', is_resident_visible: true },
      { title: 'Staff: Research tool lending programs or employer-provided equipment', requires_staff_action: true, is_resident_visible: false },
    ],
    'Eligible Benefits Not Enrolled': [
      { title: 'Complete benefits enrollment appointment', priority: 'high', is_resident_visible: true },
      { title: 'Staff: Schedule benefits navigator appointment', requires_staff_action: true, is_resident_visible: false },
    ],
  };

  const tasks = taskMap[barrier.title] || [
    { title: `Address barrier: ${barrier.title}`, priority: 'medium', is_resident_visible: true },
    { title: `Staff: Review and create intervention plan for ${barrier.title}`, requires_staff_action: true, is_resident_visible: false },
  ];

  return tasks.map(t => ({
    ...base,
    status: 'pending',
    category: barrier.category,
    ...t,
  }));
}

/**
 * Calculate scores from an intake assessment.
 */
export function calculateScores(intake, barriers) {
  // Stability Score (0-100): housing, phone, legal status, mental health stability
  let stabilityPoints = 0;
  if (intake.housing?.current_status === 'stable') stabilityPoints += 25;
  else if (intake.housing?.current_status === 'transitional') stabilityPoints += 15;
  if (intake.communication?.has_phone) stabilityPoints += 15;
  if (!intake.justice?.on_probation && !intake.justice?.on_parole) stabilityPoints += 15;
  if (!intake.mental_health?.has_diagnosis || intake.mental_health?.in_counseling) stabilityPoints += 15;
  if (!intake.treatment?.in_treatment || intake.treatment?.sobriety_date) stabilityPoints += 15;
  if (!intake.housing?.eviction_history) stabilityPoints += 10;
  if (intake.benefits?.receiving_snap || intake.benefits?.receiving_medi_cal) stabilityPoints += 5;
  const stabilityScore = Math.min(100, stabilityPoints);

  // Work Readiness Score (0-100): documents, skills, experience
  let wrPoints = 0;
  if (intake.documents?.has_state_id) wrPoints += 20;
  if (intake.documents?.has_ssn_card) wrPoints += 15;
  if (intake.documents?.has_resume) wrPoints += 15;
  if (intake.education?.highest_level && !['no_diploma'].includes(intake.education.highest_level)) wrPoints += 10;
  if (intake.transportation?.has_vehicle || intake.transportation?.uses_public_transit) wrPoints += 10;
  if (intake.communication?.has_phone) wrPoints += 10;
  if (intake.digital_literacy?.comfort_level === 'proficient' || intake.digital_literacy?.comfort_level === 'moderate') wrPoints += 5;
  if ((intake.work_history?.years_of_experience || 0) >= 1) wrPoints += 10;
  if (!intake.dependent_care?.has_dependents || intake.dependent_care?.childcare_arranged) wrPoints += 5;
  const workReadinessScore = Math.min(100, wrPoints);

  // Barrier Severity Score (0-100): weighted sum of barriers, inverted (lower = fewer barriers)
  const totalWeight = barriers.reduce((sum, b) => sum + (SEVERITY_WEIGHTS[b.severity] || 2), 0);
  const maxPossible = 15 * SEVERITY_WEIGHTS.critical;
  const barrierSeverityScore = Math.min(100, Math.round((totalWeight / maxPossible) * 100));

  return { barrier_severity_score: barrierSeverityScore, stability_score: stabilityScore, work_readiness_score: workReadinessScore };
}

export const INTAKE_STEPS = [
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'housing', label: 'Housing', icon: '🏠' },
  { id: 'justice', label: 'Justice', icon: '⚖️' },
  { id: 'treatment', label: 'Treatment', icon: '💊' },
  { id: 'veteran', label: 'Veteran', icon: '🎖️' },
  { id: 'foster_care', label: 'Foster Care', icon: '🏡' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'work_history', label: 'Work History', icon: '💼' },
  { id: 'transportation', label: 'Transportation', icon: '🚌' },
  { id: 'communication', label: 'Communication', icon: '📱' },
  { id: 'digital_literacy', label: 'Digital Literacy', icon: '💻' },
  { id: 'dependent_care', label: 'Dependent Care', icon: '👶' },
  { id: 'legal_financial', label: 'Legal / Financial', icon: '💰' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'mental_health', label: 'Mental Health', icon: '🧠' },
  { id: 'disability', label: 'Disability', icon: '♿' },
  { id: 'clothing_tools', label: 'Clothing / Tools', icon: '👔' },
  { id: 'benefits', label: 'Benefits', icon: '🏥' },
  { id: 'emergency_contact', label: 'Emergency Contact', icon: '🆘' },
];