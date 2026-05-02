/**
 * onIntakeCompleted — Symphony Wiring (Phase 2).
 *
 * Fires when an IntakeAssessment status changes to "completed".
 *
 * Original responsibilities:
 * - Verifies authoritative intake record
 * - Detects barriers from assessment data
 * - Creates ServicePlan + auto-generated tasks
 * - Writes intake_date to Resident
 * - Idempotent: checks for existing barriers/plans before creating
 * - Updates resident status to "active" if still pre_intake
 *
 * NEW (Symphony wiring):
 * - Auto-assigns case manager via load-balanced caseload matching
 * - If housing.current_status='none' or 'unstable', auto-creates HousingReferral
 * - Notifies assigned CM via in-app + email (with URGENT prefix if housing crisis)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

/**
 * Auto-assign a case manager via load-balanced caseload matching.
 * Returns { id, name } if a CM was found, null otherwise.
 */
async function autoAssignCaseManager(base44, orgId) {
  try {
    const caseManagerProfiles = await base44.asServiceRole.entities.UserProfile.filter({
      app_role: 'case_manager',
      status: 'active',
    });

    const eligible = caseManagerProfiles.filter(cm =>
      !orgId || !cm.organization_id || cm.organization_id === orgId
    );

    if (eligible.length === 0) return null;

    const counts = await Promise.all(eligible.map(async (cm) => {
      const cmId = cm.user_id || cm.id;
      const caseload = await base44.asServiceRole.entities.Resident.filter({
        assigned_case_manager_id: cmId,
        status: 'active',
      });
      return { profile: cm, count: caseload.length };
    }));

    counts.sort((a, b) => a.count - b.count);
    const chosen = counts[0].profile;
    return {
      id: chosen.user_id || chosen.id,
      name: chosen.full_name || chosen.email,
      email: chosen.email,
    };
  } catch (e) {
    console.warn('[autoAssignCaseManager] Failed:', e.message);
    return null;
  }
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

    let assessment;
    try {
      assessment = await base44.asServiceRole.entities.IntakeAssessment.get(assessmentId);
    } catch (e) {
      return Response.json({ skipped: true, reason: `IntakeAssessment not found: ${assessmentId}` });
    }

    if (!assessment) return Response.json({ skipped: true, reason: 'IntakeAssessment not found' });
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
    if (!resident) return Response.json({ skipped: true, reason: 'Resident record not found' });

    // Idempotency
    const existingPlans = await base44.asServiceRole.entities.ServicePlan.filter({ assessment_id: assessmentId });
    if (existingPlans.length > 0) {
      return Response.json({ skipped: true, reason: 'ServicePlan already exists — idempotent skip', assessment_id: assessmentId });
    }
    const existingBarriers = await base44.asServiceRole.entities.BarrierItem.filter({ assessment_id: assessmentId });
    if (existingBarriers.length > 0) {
      return Response.json({ skipped: true, reason: 'BarrierItems already exist — idempotent skip', assessment_id: assessmentId });
    }

    // Detect + create barriers
    const detectedBarriers = detectBarriersFromAssessment(assessment);
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

    // Generate tasks
    const allTasks = createdBarriers.flatMap(barrier =>
      generateTasksForBarrier(barrier, plan.id, residentId, globalResidentId, orgId)
    );
    const createdTasks = await Promise.all(
      allTasks.map(task => base44.asServiceRole.entities.ServiceTask.create(task))
    );

    // === SYMPHONY: Detect housing crisis ===
    const housingStatus = assessment.housing?.current_status;
    const isHousingCrisis = housingStatus === 'none' || housingStatus === 'unstable';

    // === SYMPHONY: Auto-assign case manager (if not already assigned) ===
    let assignedCM = null;
    let assignedJustNow = false;
    if (resident.assigned_case_manager_id) {
      assignedCM = {
        id: resident.assigned_case_manager_id,
        name: resident.assigned_case_manager,
      };
    } else {
      assignedCM = await autoAssignCaseManager(base44, orgId);
      if (assignedCM) assignedJustNow = true;
    }

    // === Build resident updates (combines original + new auto-assign) ===
    const intakeDateStr = assessment.completed_at
      ? assessment.completed_at.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const residentUpdates: any = { intake_date: intakeDateStr };
    if (resident.status === 'pre_intake') {
      residentUpdates.status = 'active';
    }
    if (assignedJustNow && assignedCM) {
      residentUpdates.assigned_case_manager_id = assignedCM.id;
      residentUpdates.assigned_case_manager = assignedCM.name;
      residentUpdates.assignment_method = 'auto';
      residentUpdates.assignment_timestamp = new Date().toISOString();
      residentUpdates.auto_assignment_reason = 'auto_intake_complete';
    }
    await base44.asServiceRole.entities.Resident.update(residentId, residentUpdates);

    // === SYMPHONY: Housing crisis dispatch ===
    let housingReferralId = null;
    if (isHousingCrisis) {
      try {
        const referral = await base44.asServiceRole.entities.HousingReferral.create({
          resident_id: residentId,
          global_resident_id: globalResidentId,
          organization_id: orgId,
          urgency: 'critical',
          reason: 'auto_dispatched_from_intake',
          requested_by: 'system',
          status: 'pending_assignment',
          notes: `Resident reported "no stable housing" at intake. Auto-dispatched for immediate placement. Assigned CM: ${assignedCM?.name || 'unassigned'}.`,
        });
        housingReferralId = referral.id;
      } catch (e) {
        console.warn('[onIntakeCompleted] HousingReferral create failed:', e.message);
      }
    }

    // === SYMPHONY: Notify assigned case manager ===
    if (assignedCM && assignedJustNow) {
      try {
        const subject = isHousingCrisis
          ? `🚨 URGENT: New participant assigned (housing required) — ${resident.first_name} ${resident.last_name}`
          : `New participant assigned: ${resident.first_name} ${resident.last_name}`;

        const messageBody =
          `${resident.first_name} ${resident.last_name} (${globalResidentId}) just completed intake and has been assigned to your caseload.\n\n` +
          `• ${createdBarriers.length} barriers identified\n` +
          `• ${createdTasks.length} tasks auto-generated\n` +
          (isHousingCrisis
            ? '\n⚠️ URGENT: Resident has NO STABLE HOUSING. Housing referral auto-created — please assign a bed today.\n'
            : '') +
          `\nOpen their profile to begin: /residents/${residentId}`;

        // Create in-app notification record
        await base44.asServiceRole.entities.Notification.create({
          resident_id: residentId,
          global_resident_id: globalResidentId,
          recipient_user_id: assignedCM.id,
          recipient_email: assignedCM.email,
          recipient_name: assignedCM.name,
          channel: 'in_app',
          type: isHousingCrisis ? 'crisis_alert' : 'case_manager_assigned',
          subject,
          body: messageBody,
          link_url: `/residents/${residentId}`,
          sent_by: 'system',
          status: 'queued',
        });

        // Also send email if we have CM's email
        if (assignedCM.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: assignedCM.email,
              subject,
              body: messageBody,
            });
          } catch (e) {
            console.warn('[onIntakeCompleted] Email send failed:', e.message);
          }
        }
      } catch (e) {
        console.warn('[onIntakeCompleted] Notification create failed:', e.message);
      }
    }

    // === System CaseNote (audit trail) ===
    await base44.asServiceRole.entities.CaseNote.create({
      resident_id: residentId,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      staff_id: 'system',
      staff_name: 'Pathways Automation',
      note_type: 'general',
      description:
        `[Auto] Intake completed for ${globalResidentId}. ${createdBarriers.length} barrier(s) identified. ` +
        `Service plan created. ${createdTasks.length} task(s) generated. ` +
        `Resident status: ${residentUpdates.status || resident.status}.` +
        (assignedJustNow ? ` Auto-assigned to CM: ${assignedCM.name}.` : '') +
        (isHousingCrisis ? ' Emergency housing referral dispatched.' : ''),
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
      case_manager_auto_assigned: assignedJustNow,
      case_manager_id: assignedCM?.id || null,
      case_manager_name: assignedCM?.name || null,
      housing_crisis: isHousingCrisis,
      housing_referral_id: housingReferralId,
    });

  } catch (error) {
    console.error('[onIntakeCompleted] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
