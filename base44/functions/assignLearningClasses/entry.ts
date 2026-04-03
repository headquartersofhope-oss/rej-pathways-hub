import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resident_id } = await req.json();

    if (!resident_id) {
      return Response.json({ error: 'resident_id required' }, { status: 400 });
    }

    console.log(`[Learning Assignment] Starting AI assignment for resident ${resident_id}`);

    // Fetch resident profile
    const resident = await base44.entities.Resident.list('id', 1000);
    const targetResident = resident.find(r => r.id === resident_id);

    if (!targetResident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Fetch intake assessment to understand barriers
    const intakes = await base44.entities.IntakeAssessment.list();
    const intake = intakes.find(i => i.resident_id === resident_id);

    // Fetch existing assignments to avoid duplicates
    const assignments = await base44.entities.LearningAssignment.list();
    const existingClasses = new Set(
      assignments
        .filter(a => a.resident_id === resident_id)
        .map(a => a.class_id)
    );

    // Fetch all active classes
    const allClasses = await base44.entities.LearningClass.list();
    const activeClasses = allClasses.filter(c => c.is_active && c.status === 'published');

    console.log(`[Learning Assignment] Found ${activeClasses.length} active classes, resident has ${existingClasses.size} already`);

    const recommendedClasses = [];
    const assignmentReasons = {};

    // RULE 1: Required orientation for all new residents
    if (targetResident.status === 'pre_intake' || !targetResident.intake_date) {
      const orientationClass = activeClasses.find(c => c.category === 'orientation' && c.is_required);
      if (orientationClass && !existingClasses.has(orientationClass.id)) {
        recommendedClasses.push({
          class_id: orientationClass.id,
          assignment_type: 'required',
          assignment_reason: 'Program orientation required for all residents',
        });
        assignmentReasons[orientationClass.id] = 'orientation_required';
      }
    }

    // RULE 2: Low digital literacy → digital literacy classes
    if (intake?.communication?.has_computer_access === false || intake?.digital_literacy?.comfort_level === 'none') {
      const digitalClasses = activeClasses.filter(c => c.category === 'digital_literacy' && c.literacy_level_support === 'low');
      digitalClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendedClasses.push({
            class_id: cls.id,
            assignment_type: 'ai_suggested',
            assignment_reason: 'low_digital_literacy',
          });
          assignmentReasons[cls.id] = 'low_digital_literacy';
        }
      });
    }

    // RULE 3: No resume → Resume building class
    const employabilityProfile = await base44.entities.EmployabilityProfile.list();
    const profile = employabilityProfile.find(p => p.resident_id === resident_id);
    if (profile?.resume_status === 'none' || profile?.resume_status === 'draft') {
      const resumeClass = activeClasses.find(c => c.tags?.includes('resume') && c.category === 'employment');
      if (resumeClass && !existingClasses.has(resumeClass.id)) {
        recommendedClasses.push({
          class_id: resumeClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'no_resume',
        });
        assignmentReasons[resumeClass.id] = 'no_resume';
      }
    }

    // RULE 4: Low job readiness → Job readiness series
    if (profile?.job_readiness_score < 60 || profile?.is_job_ready === false) {
      const jobReadyClasses = activeClasses.filter(c => c.category === 'employment' && c.tags?.includes('job_readiness'));
      jobReadyClasses.slice(0, 2).forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendedClasses.push({
            class_id: cls.id,
            assignment_type: 'ai_suggested',
            assignment_reason: 'low_job_readiness',
          });
          assignmentReasons[cls.id] = 'low_job_readiness';
        }
      });
    }

    // RULE 5: Interview readiness < 60 → Interview prep
    if (profile?.interview_readiness_score < 60) {
      const interviewClass = activeClasses.find(c => c.tags?.includes('interview') && c.category === 'employment');
      if (interviewClass && !existingClasses.has(interviewClass.id)) {
        recommendedClasses.push({
          class_id: interviewClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'low_interview_readiness',
        });
        assignmentReasons[interviewClass.id] = 'low_interview_readiness';
      }
    }

    // RULE 6: Housing barrier → Housing stability class
    if (intake?.housing?.current_status === 'shelter' || intake?.housing?.current_status === 'unstable' || intake?.housing?.current_status === 'none') {
      const housingClass = activeClasses.find(c => c.category === 'housing' && c.is_active);
      if (housingClass && !existingClasses.has(housingClass.id)) {
        recommendedClasses.push({
          class_id: housingClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'housing_barrier',
        });
        assignmentReasons[housingClass.id] = 'housing_barrier';
      }
    }

    // RULE 7: Financial barriers → Financial literacy
    if (intake?.legal_financial?.has_fines_fees === true || (targetResident.barriers?.includes('financial_readiness'))) {
      const financialClass = activeClasses.find(c => c.category === 'financial_literacy');
      if (financialClass && !existingClasses.has(financialClass.id)) {
        recommendedClasses.push({
          class_id: financialClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'financial_barriers',
        });
        assignmentReasons[financialClass.id] = 'financial_barriers';
      }
    }

    // RULE 8: Missing documents → Documentation class
    if ((targetResident.missing_documents?.length > 0) || (intake?.documents?.missing_documents?.length > 0)) {
      const docClass = activeClasses.find(c => c.category === 'documentation');
      if (docClass && !existingClasses.has(docClass.id)) {
        recommendedClasses.push({
          class_id: docClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'missing_documents',
        });
        assignmentReasons[docClass.id] = 'missing_documents';
      }
    }

    // RULE 9: Justice-impacted → Life skills & wellness
    if (targetResident.population === 'justice_impacted') {
      const lifeSkillsClass = activeClasses.find(c => c.category === 'life_skills');
      const wellnessClass = activeClasses.find(c => c.category === 'wellness');
      if (lifeSkillsClass && !existingClasses.has(lifeSkillsClass.id)) {
        recommendedClasses.push({
          class_id: lifeSkillsClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'population_support',
        });
        assignmentReasons[lifeSkillsClass.id] = 'population_support';
      }
      if (wellnessClass && !existingClasses.has(wellnessClass.id)) {
        recommendedClasses.push({
          class_id: wellnessClass.id,
          assignment_type: 'ai_suggested',
          assignment_reason: 'stability_support',
        });
        assignmentReasons[wellnessClass.id] = 'stability_support';
      }
    }

    // RULE 10: All residents get AI literacy
    const aiLiteracyClass = activeClasses.find(c => c.category === 'ai_literacy');
    if (aiLiteracyClass && !existingClasses.has(aiLiteracyClass.id)) {
      recommendedClasses.push({
        class_id: aiLiteracyClass.id,
        assignment_type: 'ai_suggested',
        assignment_reason: 'foundational_skill',
      });
      assignmentReasons[aiLiteracyClass.id] = 'foundational_skill';
    }

    console.log(`[Learning Assignment] Recommended ${recommendedClasses.length} classes for resident ${resident_id}`);

    // Create LearningAssignment records
    const createdAssignments = [];
    for (const rec of recommendedClasses) {
      try {
        const assignment = await base44.entities.LearningAssignment.create({
          resident_id: targetResident.id,
          global_resident_id: targetResident.global_resident_id,
          class_id: rec.class_id,
          organization_id: targetResident.organization_id,
          assignment_type: rec.assignment_type,
          assignment_reason: rec.assignment_reason,
          assigned_by: 'system',
          assigned_date: new Date().toISOString().split('T')[0],
          status: 'assigned',
        });
        createdAssignments.push({ class_id: rec.class_id, assignment_id: assignment.id });
      } catch (e) {
        console.error(`[Learning Assignment] Failed to create assignment for class ${rec.class_id}:`, e.message);
      }
    }

    console.log(`[Learning Assignment] Created ${createdAssignments.length} assignments for resident ${resident_id}`);

    return Response.json({
      success: true,
      resident_id: targetResident.id,
      global_resident_id: targetResident.global_resident_id,
      assignments_created: createdAssignments.length,
      recommended_classes: recommendedClasses.length,
      assignments: createdAssignments,
      message: `Assigned ${createdAssignments.length} classes to resident based on profile analysis`,
    });
  } catch (error) {
    console.error('[Learning Assignment] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});