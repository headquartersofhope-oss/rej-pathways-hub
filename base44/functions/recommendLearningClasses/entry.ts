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

    console.log(`[Learning Recommendations] Starting AI recommendation engine for ${resident_id}`);

    // Fetch resident profile
    const residents = await base44.entities.Resident.list();
    const resident = residents.find(r => r.id === resident_id);

    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Fetch intake assessment
    const intakes = await base44.entities.IntakeAssessment.list();
    const intake = intakes.find(i => i.resident_id === resident_id);

    // Fetch employability profile
    const profiles = await base44.entities.EmployabilityProfile.list();
    const profile = profiles.find(p => p.resident_id === resident_id);

    // Fetch existing assignments
    const assignments = await base44.entities.LearningAssignment.list();
    const existingClasses = new Set(
      assignments
        .filter(a => a.resident_id === resident_id)
        .map(a => a.class_id)
    );

    // Fetch all active classes
    const allClasses = await base44.entities.LearningClass.list();
    const activeClasses = allClasses.filter(c => c.is_active && c.status === 'published');

    const recommendations = [];

    // RULE 1: Orientation for all new residents
    if (!resident.intake_date || resident.status === 'pre_intake') {
      const orientationClasses = activeClasses.filter(c => 
        c.category === 'orientation' && c.is_required
      );
      orientationClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'required',
            reason: 'Required orientation for all residents',
            reason_code: 'orientation_required',
            priority: 'high',
          });
        }
      });
    }

    // RULE 2: Low literacy level
    if (intake?.personal?.race_ethnicity || !intake) {
      // Assume low literacy if minimal intake completion
      const lowLiteracyClasses = activeClasses.filter(c => 
        c.literacy_level_support === 'low' && c.category === 'digital_literacy'
      );
      lowLiteracyClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Digital literacy support for low-literacy learners',
            reason_code: 'low_literacy_support',
            priority: 'high',
          });
        }
      });
    }

    // RULE 3: Low digital literacy
    if (intake?.communication?.has_computer_access === false || 
        intake?.digital_literacy?.comfort_level === 'none' ||
        intake?.communication?.has_internet_access === false) {
      const digitalClasses = activeClasses.filter(c => 
        (c.tags?.includes('computer') || c.tags?.includes('digital') || c.tags?.includes('email')) &&
        c.difficulty_level === 'beginner'
      );
      digitalClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Building digital skills',
            reason_code: 'low_digital_literacy',
            priority: 'high',
          });
        }
      });
    }

    // RULE 4: No resume
    if (!profile?.resume_status || profile?.resume_status === 'none' || profile?.resume_status === 'draft') {
      const resumeClasses = activeClasses.filter(c => 
        c.tags?.includes('resume') || c.title.toLowerCase().includes('resume')
      );
      resumeClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'required',
            reason: 'Build resume to apply for jobs',
            reason_code: 'no_resume',
            priority: 'high',
          });
        }
      });
    }

    // RULE 5: Low interview readiness
    if (profile?.interview_readiness_score < 60 || !profile?.interview_readiness_score) {
      const interviewClasses = activeClasses.filter(c => 
        c.tags?.includes('interview') || c.title.toLowerCase().includes('interview')
      );
      interviewClasses.slice(0, 2).forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Prepare for job interviews',
            reason_code: 'low_interview_readiness',
            priority: 'high',
          });
        }
      });
    }

    // RULE 6: Low job readiness
    if (profile?.job_readiness_score < 60 || !profile?.job_readiness_score) {
      const jobReadyClasses = activeClasses.filter(c => 
        c.category === 'employment' && c.difficulty_level === 'beginner'
      ).slice(0, 3);
      jobReadyClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Develop job readiness skills',
            reason_code: 'low_job_readiness',
            priority: 'medium',
          });
        }
      });
    }

    // RULE 7: Financial instability
    if (intake?.legal_financial?.has_fines_fees === true || 
        resident.barriers?.includes('financial_readiness') ||
        intake?.benefits?.receiving_snap === true) {
      const financialClasses = activeClasses.filter(c => 
        c.category === 'financial_literacy'
      );
      financialClasses.slice(0, 3).forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Build financial stability skills',
            reason_code: 'financial_instability',
            priority: 'high',
          });
        }
      });
    }

    // RULE 8: Housing instability
    if (intake?.housing?.current_status === 'shelter' || 
        intake?.housing?.current_status === 'unstable' || 
        intake?.housing?.current_status === 'none' ||
        resident.barriers?.includes('housing_stability')) {
      const housingClasses = activeClasses.filter(c => 
        c.category === 'housing'
      );
      housingClasses.slice(0, 2).forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Achieve housing stability',
            reason_code: 'housing_instability',
            priority: 'high',
          });
        }
      });
    }

    // RULE 9: Missing documents
    if ((resident.missing_documents?.length > 0) || 
        (intake?.documents?.missing_documents?.length > 0)) {
      const docClasses = activeClasses.filter(c => 
        c.category === 'documentation'
      );
      docClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Get critical identification and documents',
            reason_code: 'missing_documents',
            priority: 'high',
          });
        }
      });
    }

    // RULE 10: Transportation barriers
    if (intake?.transportation?.transport_access === 'none' || 
        intake?.transportation?.max_commute_minutes === 0) {
      const transportClasses = activeClasses.filter(c => 
        c.tags?.includes('transportation') || c.title.toLowerCase().includes('transportation')
      );
      transportClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Plan transportation to work',
            reason_code: 'transportation_barriers',
            priority: 'medium',
          });
        }
      });
    }

    // RULE 11: Justice-impacted population
    if (resident.population === 'justice_impacted') {
      const supportClasses = activeClasses.filter(c => 
        c.category === 'life_skills' || c.category === 'wellness'
      ).slice(0, 3);
      supportClasses.forEach(cls => {
        if (!existingClasses.has(cls.id)) {
          recommendations.push({
            class_id: cls.id,
            class_title: cls.title,
            assignment_type: 'recommended',
            reason: 'Support for justice-impacted population',
            reason_code: 'population_support',
            priority: 'medium',
          });
        }
      });
    }

    // RULE 12: All residents get AI literacy
    const aiLiteracyClasses = activeClasses.filter(c => 
      c.category === 'ai_literacy'
    );
    aiLiteracyClasses.slice(0, 1).forEach(cls => {
      if (!existingClasses.has(cls.id)) {
        recommendations.push({
          class_id: cls.id,
          class_title: cls.title,
          assignment_type: 'recommended',
          reason: 'Learn to use AI tools safely',
          reason_code: 'foundational_skill',
          priority: 'medium',
        });
      }
    });

    console.log(`[Learning Recommendations] Generated ${recommendations.length} recommendations`);

    return Response.json({
      success: true,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      recommendations_count: recommendations.length,
      recommendations: recommendations.map(r => ({
        class_id: r.class_id,
        class_title: r.class_title,
        assignment_type: r.assignment_type,
        reason: r.reason,
        reason_code: r.reason_code,
        priority: r.priority,
      })),
      learning_pathways: {
        required: recommendations.filter(r => r.assignment_type === 'required').length,
        recommended: recommendations.filter(r => r.assignment_type === 'recommended').length,
      },
      message: `Generated ${recommendations.length} personalized learning recommendations`,
    });
  } catch (error) {
    console.error('[Learning Recommendations] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});