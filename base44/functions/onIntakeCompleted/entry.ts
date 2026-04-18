/**
 * onIntakeCompleted — Week 2 Automation 2
 *
 * Fires when an IntakeAssessment status changes to "completed".
 * - Verifies authoritative intake record
 * - Writes intake_date to Resident
 * - Idempotent: checks for existing barriers/plans before creating
 * - Updates resident status to "active" if still pre_intake
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Barrier detection logic — mirrors intakeBarriers.js client-side logic
function detectBarriersFromAssessment(a) {
  const barriers = [];

  const j = a.justice || {};
  if (j.justice_involved) {
    barriers.push({ category: 'legal', title: 'Active Justice Involvement', severity: j.on_probation || j.on_parole ? 'high' : 'medium', description: 'Resident has current justice involvement requiring navigation support.' });
  }
  if (j.sex_offender_registry) {
    barriers.push({ category: 'legal', title: 'Sex Offender Registry', severity: 'critical', description: 'Registry status creates significant housing and employment barriers.' });
  }

  const docs = a.documents || {};
  const missingDocs = docs.missing_documents || [];
  if (missingDocs.length > 0) {
    barriers.push({ category: 'identification_documents', title: 'Missing Identity Documents', severity: missingDocs.length >= 2 ? 'high' : 'medium', description: `Missing: ${missingDocs.join(', ')}` });
  }

  const h = a.housing || {};
  if (h.current_status === 'none' || h.current_status === 'unstable') {
    barriers.push({ category: 'housing_stability', title: 'No Stable Housing', severity: 'critical', description: 'Resident lacks stable housing — immediate placement prioritization required.' });
  } else if (h.eviction_history) {
    barriers.push({ category: 'housing_stability', title: 'Eviction History', severity: 'medium', description: 'Prior eviction may limit housing options.' });
  }

  const t = a.transportation || {};
  if (!t.has_vehicle && !t.uses_public_transit && t.transport_access === 'none') {
    barriers.push({ category: 'transportation', title: 'No Transportation Access', severity: 'high', description: 'Resident has no vehicle and cannot access public transit.' });
  }
  if (t.license_suspended) {
    barriers.push({ category: 'transportation', title: 'Suspended License', severity: 'medium', description: 'Driver license is suspended — limits employment options.' });
  }

  const edu = a.education || {};
  if (edu.highest_level === 'no_diploma') {
    barriers.push({ category: 'education', title: 'No High School Diploma or GED', severity: 'high', description: 'Credential barrier limits employment eligibility.' });
  }

  const dl = a.digital_literacy || {};
  if (dl.comfort_level === 'none' || dl.comfort_level === 'basic') {
    barriers.push({ category: 'digital_literacy', title: 'Limited Digital Literacy', severity: 'medium', description: 'May need support applying online or using work platforms.' });
  }

  const wh = a.work_history || {};
  if (wh.employment_status === 'unemployed' && (wh.experience_level === 'none' || wh.experience_level === 'limited')) {
    barriers.push({ category: 'work_history', title: 'Limited Work Experience', severity: 'high', description: 'Limited employment history requires pre-employment skill building.' });
  }

  const mh = a.mental_health || {};
  if (mh.has_diagnosis && !mh.in_counseling) {
    barriers.push({ category: 'mental_health_support', title: 'Mental Health Diagnosis Without Support', severity: 'high', description: 'Diagnosed condition without active counseling — referral recommended.' });
  }

  const dis = a.disability || {};
  if (dis.has_disability && dis.accommodation_needed) {
    barriers.push({ category: 'disability_accommodations', title: 'Disability Accommodation Needed', severity: 'medium', description: dis.accommodation_notes || 'Accommodation requirements must be addressed with employer.' });
  }

  const dc = a.dependent_care || {};
  if (dc.has_dependents && !dc.childcare_arranged) {
    barriers.push({ category: 'childcare_dependent_care', title: 'Childcare Not Arranged', severity: 'high', description: 'Dependent care unresolved — blocks consistent employment.' });
  }

  const lf = a.legal_financial || {};
  if (lf.has_fines_fees && lf.total_owed > 500) {
    barriers.push({ category: 'financial_readiness', title: 'Outstanding Legal Fines/Fees', severity: 'medium', description: `$${lf.total_owed} owed in fines/fees — may affect financial stability.` });
  }
  if (lf.wage_garnishment) {
    barriers.push({ category: 'financial_readiness', title: 'Wage Garnishment Active', severity: 'high', description: 'Wage garnishment reduces net income and financial stability.' });
  }

  const ct = a.clothing_tools || {};
  if (ct.needs_work_uniform || ct.needs_tools_equipment || ct.needs_safety_gear) {
    barriers.push({ category: 'clothing_tools_gear', title: 'Work Gear/Uniform Needed', severity: 'low', description: 'Resident needs work-specific clothing, tools, or safety gear.' });
  }

  const comm = a.communication || {};
  if (!comm.has_phone) {
    barriers.push({ category: 'communication_access', title: 'No Phone Access', severity: 'high', description: 'No phone — limits employer contact, emergency response, and program coordination.' });
  }

  return barriers;
}

function generateTasksForBarrier(barrier, planId, residentId, globalResidentId, orgId) {
  const taskMap = {
    legal: ['Connect with legal aid or probation officer', 'Review compliance requirements with case manager'],
    identification_documents: ['Obtain missing identity documents', 'Schedule DMV/vital records appointment'],
    housing_stability: ['Initiate housing placement search', 'Connect with housing navigator'],
    transportation: ['Explore transit options or carpool arrangements', 'Investigate license reinstatement process'],
    education: ['Enroll in GED program', 'Identify vocational training options'],
    digital_literacy: ['Enroll in digital literacy class', 'Provide device/internet access support'],
    work_history: ['Create or update resume', 'Enroll in pre-employment skills training'],
    mental_health_support: ['Connect with counseling services', 'Review medication plan with case manager'],
    disability_accommodations: ['Document accommodation needs', 'Coordinate with employer for accommodations'],
    childcare_dependent_care: ['Research childcare subsidy eligibility', 'Identify childcare provider options'],
    financial_readiness: ['Create debt repayment plan', 'Connect with financial counseling services'],
    clothing_tools_gear: ['Request work gear from resource inventory', 'Identify uniform/tool assistance programs'],
    communication_access: ['Apply for Lifeline phone program', 'Provide phone access through program resources'],
    substance_recovery: ['Confirm treatment enrollment', 'Schedule check-in with recovery support'],
    benefits: ['Apply for eligible benefits', 'Review benefit enrollment with case manager'],
    interview_readiness: ['Schedule mock interview session', 'Review interview preparation materials'],
  };

  const titles = taskMap[barrier.category] || [`Address ${barrier.title}`];
  return titles.map(title => ({
    resident_id: residentId,
    global_resident_id: globalResidentId,
    plan_id: planId,
    barrier_item_id: barrier.id || null,
    organization_id: orgId,
    title,
    description: `Auto-generated task for barrier: ${barrier.title}`,
    category: barrier.category,
    status: 'pending',
    priority: barrier.severity === 'critical' ? 'urgent' : barrier.severity === 'high' ? 'high' : 'medium',
    is_resident_visible: true,
    requires_staff_action: true,
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event } = body;
    const assessmentId = event?.entity_id;

    if (!assessmentId) {
      return Response.json({ error: 'Missing entity_id in event payload' }, { status: 400 });
    }

    // Fetch fresh assessment from DB
    let assessment;
    try {
      assessment = await base44.asServiceRole.entities.IntakeAssessment.get(assessmentId);
    } catch (e) {
      return Response.json({ skipped: true, reason: `IntakeAssessment not found: ${assessmentId}` });
    }

    if (!assessment) {
      return Response.json({ skipped: true, reason: 'IntakeAssessment not found' });
    }

    if (assessment.status !== 'completed') {
      return Response.json({ skipped: true, reason: `Assessment status is "${assessment.status}", not completed` });
    }

    const residentId = assessment.resident_id;
    const globalResidentId = assessment.global_resident_id;
    const orgId = assessment.organization_id || '';

    if (!residentId || !globalResidentId) {
      return Response.json({ skipped: true, reason: 'Assessment missing resident_id or global_resident_id' });
    }

    let resident;
    try {
      resident = await base44.asServiceRole.entities.Resident.get(residentId);
    } catch (e) {
      return Response.json({ skipped: true, reason: `Resident not found: ${residentId}` });
    }
    if (!resident) {
      return Response.json({ skipped: true, reason: 'Resident record not found' });
    }

    // Idempotency: check if this assessment has already been processed
    const existingPlans = await base44.asServiceRole.entities.ServicePlan.filter({ assessment_id: assessmentId });
    if (existingPlans.length > 0) {
      return Response.json({ skipped: true, reason: 'ServicePlan already exists for this assessment — idempotent skip', assessment_id: assessmentId });
    }

    const existingBarriers = await base44.asServiceRole.entities.BarrierItem.filter({ assessment_id: assessmentId });
    if (existingBarriers.length > 0) {
      return Response.json({ skipped: true, reason: 'BarrierItems already exist for this assessment — idempotent skip', assessment_id: assessmentId });
    }

    // Detect barriers from assessment data
    const detectedBarriers = detectBarriersFromAssessment(assessment);

    // Create barrier items
    const createdBarriers = await Promise.all(
      detectedBarriers.map(b =>
        base44.asServiceRole.entities.BarrierItem.create({
          ...b,
          resident_id: residentId,
          global_resident_id: globalResidentId,
          assessment_id: assessmentId,
          organization_id: orgId,
          auto_generated: true,
        })
      )
    );

    // Create service plan
    const plan = await base44.asServiceRole.entities.ServicePlan.create({
      resident_id: residentId,
      global_resident_id: globalResidentId,
      assessment_id: assessmentId,
      organization_id: orgId,
      title: `Service Plan — ${resident.first_name} ${resident.last_name}`,
      status: 'active',
      created_by: 'system',
    });

    // Generate tasks for all barriers
    const allTasks = createdBarriers.flatMap(barrier =>
      generateTasksForBarrier(barrier, plan.id, residentId, globalResidentId, orgId)
    );
    const createdTasks = await Promise.all(
      allTasks.map(task => base44.asServiceRole.entities.ServiceTask.create(task))
    );

    // Write intake_date to Resident and advance status if still pre_intake
    const intakeDateStr = assessment.completed_at
      ? assessment.completed_at.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const residentUpdates = {
      intake_date: intakeDateStr,
    };
    if (resident.status === 'pre_intake') {
      residentUpdates.status = 'active';
    }
    await base44.asServiceRole.entities.Resident.update(residentId, residentUpdates);

    // Write system CaseNote
    await base44.asServiceRole.entities.CaseNote.create({
      resident_id: residentId,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      staff_id: 'system',
      staff_name: 'Pathways Automation',
      note_type: 'general',
      description: `[Auto] Intake assessment completed for ${globalResidentId}. ${createdBarriers.length} barrier(s) identified. Service plan created. ${createdTasks.length} task(s) generated. Resident status advanced to: ${residentUpdates.status || resident.status}.`,
      is_confidential: false,
    });

    return Response.json({
      success: true,
      assessment_id: assessmentId,
      resident_id: residentId,
      global_resident_id: globalResidentId,
      barriers_created: createdBarriers.length,
      plan_id: plan.id,
      tasks_created: createdTasks.length,
      intake_date_written: intakeDateStr,
      resident_status: residentUpdates.status || resident.status,
    });

  } catch (error) {
    console.error('[onIntakeCompleted] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});