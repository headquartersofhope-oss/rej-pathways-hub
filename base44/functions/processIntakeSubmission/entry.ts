import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const startTime = new Date().toISOString();
    console.error(`=== processIntakeSubmission STARTED at ${startTime} ===`);
    console.error(`[DEBUG] Request method: ${req.method}`);

    // Only accept POST
    if (req.method !== 'POST') {
      console.warn(`❌ EARLY EXIT: Invalid method ${req.method}, returning 405`);
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    let payload;
    try {
      payload = await req.json();
      console.log('✅ Payload parsed successfully');
      console.log('📥 Incoming payload:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('❌ EARLY EXIT: JSON parse error:', parseError.message);
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Validate required fields
    console.log(`[VALIDATION] Checking source_type: "${payload.source_type}"`);
    const validTypes = ['website_application', 'partner_referral', 'employer_intake', 'resource_provider'];
    
    if (!payload.source_type || !validTypes.includes(payload.source_type)) {
      console.warn(`❌ EARLY EXIT: Invalid source_type "${payload.source_type}". Valid types: ${validTypes.join(', ')}`);
      return Response.json({ error: 'Invalid or missing source_type' }, { status: 400 });
    }
    console.log(`✅ Source type validated: ${payload.source_type}`);

    if (!payload.data) {
      console.warn(`❌ EARLY EXIT: Missing data object in payload`);
      return Response.json({ error: 'Missing data object' }, { status: 400 });
    }
    console.log(`✅ Data object present, keys: ${Object.keys(payload.data).join(', ')}`);

    const orgId = payload.organization_id || 'org1';
    console.log(`[ROUTING] Organization ID: ${orgId}`);

    // Route to appropriate handler
    console.log(`[ROUTING] Routing to handler for type: ${payload.source_type}`);
    let result;
    try {
      switch (payload.source_type) {
        case 'website_application':
          console.log('[HANDLER] Starting handleWebsiteApplication');
          result = await handleWebsiteApplication(base44, payload.data, orgId);
          break;
        case 'partner_referral':
          console.log('[HANDLER] Starting handlePartnerReferral');
          result = await handlePartnerReferral(base44, payload.data, orgId);
          break;
        case 'employer_intake':
          console.log('[HANDLER] Starting handleEmployerIntake');
          result = await handleEmployerIntake(base44, payload.data, orgId);
          break;
        case 'resource_provider':
          console.log('[HANDLER] Starting handleResourceProvider');
          result = await handleResourceProvider(base44, payload.data, orgId);
          break;
        default:
          console.warn(`❌ EARLY EXIT: Unknown source type ${payload.source_type}`);
          return Response.json({ error: 'Unknown source type' }, { status: 400 });
      }
    } catch (handlerError) {
      console.error(`❌ Handler error for ${payload.source_type}:`, handlerError.message);
      console.error('Stack:', handlerError.stack);
      return Response.json({
        success: false,
        error: handlerError.message,
        source_type: payload.source_type,
        status: 'handler_failed'
      }, { status: 500 });
    }

    console.log('✅ Handler completed successfully');
    console.log('[RESULT] Created records:', JSON.stringify(result.created_records, null, 2));
    console.log('[RESULT] Status:', result.status);

    console.log('=== processIntakeSubmission SUCCEEDED ===');
    return Response.json({
      success: true,
      submission_id: result.submission_id,
      source_type: payload.source_type,
      created_records: result.created_records,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    console.error('❌ FATAL ERROR: Uncaught exception in processIntakeSubmission');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('=== processIntakeSubmission FAILED ===');
    return Response.json({
      success: false,
      error: error.message,
      status: 'fatal_error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});

async function handleWebsiteApplication(base44, data, orgId) {
  console.log('[WEBSITE_APP] Starting validation');
  
  // Validate required fields
  console.log(`[WEBSITE_APP] Checking required fields: first_name="${data.first_name}", last_name="${data.last_name}", email="${data.email}"`);
  if (!data.first_name || !data.last_name || !data.email) {
    console.warn(`❌ [WEBSITE_APP] Validation failed: missing first_name, last_name, or email`);
    throw new Error('Website application missing required: first_name, last_name, email');
  }
  console.log(`✅ [WEBSITE_APP] All required fields present`);

  // Check for duplicates
  console.log(`[WEBSITE_APP] Checking for duplicates: "${data.first_name} ${data.last_name}"`);
  const existingResident = await checkForDuplicate(base44, data);
  
  let resident;
  let globalResidentId;
  
  if (existingResident) {
    console.log(`⚠️  [WEBSITE_APP] Duplicate found! Using existing resident ID: ${existingResident.id}, global_resident_id: ${existingResident.global_resident_id}`);
    resident = existingResident;
    globalResidentId = existingResident.global_resident_id;
  } else {
    console.log(`✅ [WEBSITE_APP] No duplicate found, generating global_resident_id`);
    
    // Generate next global_resident_id by scanning existing residents
    try {
      const allResidents = await base44.asServiceRole.entities.Resident.list();
      let maxNum = 0;
      for (const r of allResidents) {
        if (r.global_resident_id && /^RES-\d{6}$/.test(r.global_resident_id)) {
          const num = parseInt(r.global_resident_id.slice(4), 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum + 1;
      globalResidentId = `RES-${String(nextNum).padStart(6, '0')}`;
      console.log(`✅ [WEBSITE_APP] Generated global_resident_id: ${globalResidentId}`);
    } catch (scanError) {
      console.error(`❌ [WEBSITE_APP] Failed to scan for next ID:`, scanError.message);
      throw scanError;
    }

    // Create new resident WITH generated global_resident_id
    try {
      resident = await base44.entities.Resident.create({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        preferred_name: data.preferred_name,
        primary_language: data.primary_language || 'english',
        population: data.population,
        organization_id: orgId,
        status: 'pre_intake',
        intake_date: new Date().toISOString().split('T')[0],
        risk_level: 'low',
        global_resident_id: globalResidentId
      });
      console.log(`✅ [WEBSITE_APP] Resident created: ID=${resident.id}, global_resident_id=${globalResidentId}`);
    } catch (createError) {
      console.error(`❌ [WEBSITE_APP] Failed to create resident:`, createError.message);
      throw createError;
    }
  }

  // Create intake assessment
  console.log(`[WEBSITE_APP] Creating IntakeAssessment for resident ${resident.id}`);
  try {
    const intake = await base44.entities.IntakeAssessment.create({
      resident_id: resident.id,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      status: 'in_progress',
      personal: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone
      }
    });
    console.log(`✅ [WEBSITE_APP] IntakeAssessment created: ${intake.id}`);

    // Create initial service plan
    console.log(`[WEBSITE_APP] Creating ServicePlan`);
    const servicePlan = await base44.entities.ServicePlan.create({
      resident_id: resident.id,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      title: 'Initial Service Plan - Website Application',
      status: 'active'
    });
    console.log(`✅ [WEBSITE_APP] ServicePlan created: ${servicePlan.id}`);

    // Create intake task
    console.log(`[WEBSITE_APP] Creating ServiceTask`);
    const task = await base44.entities.ServiceTask.create({
      resident_id: resident.id,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      title: 'Complete Intake Assessment',
      description: 'Resident submitted application via website. Complete full intake assessment.',
      category: 'intake',
      status: 'pending',
      priority: 'high',
      requires_staff_action: true
    });
    console.log(`✅ [WEBSITE_APP] ServiceTask created: ${task.id}`);

    // Create OnboardingRequest to bridge into queue
    console.log(`[WEBSITE_APP] Creating OnboardingRequest for queue visibility`);
    try {
      const onboardingRequest = await base44.entities.OnboardingRequest.create({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        request_type: 'resident_intake',
        requested_role: 'resident',
        status: 'pending',
        submitted_date: new Date().toISOString(),
        ai_analysis_complete: false,
        resident_id: resident.id,
        intake_assessment_id: intake.id,
        organization_id: orgId
      });
      console.log(`✅ [WEBSITE_APP] OnboardingRequest created: ${onboardingRequest.id}`);

      // Trigger AI analysis
      try {
        await base44.functions.invoke('analyzeOnboardingRequest', {
          request_id: onboardingRequest.id
        });
        console.log(`✅ [WEBSITE_APP] AI analysis triggered for onboarding request`);
      } catch (aiError) {
        console.warn(`⚠️  [WEBSITE_APP] AI analysis trigger failed (non-fatal): ${aiError.message}`);
      }
    } catch (onboardingError) {
      console.warn(`⚠️  [WEBSITE_APP] OnboardingRequest creation failed (non-fatal): ${onboardingError.message}`);
    }

    return {
      submission_id: intake.id,
      created_records: {
        resident_id: resident.id,
        global_resident_id: globalResidentId,
        intake_assessment_id: intake.id,
        service_plan_id: servicePlan.id
      },
      status: 'intake_started',
      message: `Website application received for ${data.first_name} ${data.last_name}. Intake assessment created and queued for review.`
    };
  } catch (operationError) {
    console.error(`❌ [WEBSITE_APP] Failed to create records:`, operationError.message);
    throw operationError;
  }
}

async function handlePartnerReferral(base44, data, orgId) {
  console.log('[PARTNER_REFERRAL] Starting validation');
  console.log(`[PARTNER_REFERRAL] Checking required fields: resident_name="${data.resident_name}", partner_name="${data.partner_name}"`);
  
  if (!data.resident_name || !data.partner_name) {
    console.warn(`❌ [PARTNER_REFERRAL] Validation failed: missing resident_name or partner_name`);
    throw new Error('Partner referral missing required: resident_name, partner_name');
  }
  console.log(`✅ [PARTNER_REFERRAL] All required fields present`);

  // Parse resident name
  console.log(`[PARTNER_REFERRAL] Parsing resident name: "${data.resident_name}"`);
  const nameParts = data.resident_name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || 'Unknown';
  console.log(`[PARTNER_REFERRAL] Parsed name: firstName="${firstName}", lastName="${lastName}"`);

  // Check for duplicates
  console.log(`[PARTNER_REFERRAL] Checking for duplicates`);
  const existingResident = await checkForDuplicate(base44, {
    first_name: firstName,
    last_name: lastName,
    phone: data.resident_phone,
    email: data.resident_email
  });

  let resident;
  let globalResidentId;
  
  if (existingResident) {
    console.log(`⚠️  [PARTNER_REFERRAL] Duplicate found! Using existing resident ID: ${existingResident.id}`);
    resident = existingResident;
    globalResidentId = existingResident.global_resident_id;
  } else {
    console.log(`✅ [PARTNER_REFERRAL] No duplicate found, generating global_resident_id`);
    
    // Generate next global_resident_id by scanning existing residents
    try {
      const allResidents = await base44.asServiceRole.entities.Resident.list();
      let maxNum = 0;
      for (const r of allResidents) {
        if (r.global_resident_id && /^RES-\d{6}$/.test(r.global_resident_id)) {
          const num = parseInt(r.global_resident_id.slice(4), 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum + 1;
      globalResidentId = `RES-${String(nextNum).padStart(6, '0')}`;
      console.log(`✅ [PARTNER_REFERRAL] Generated global_resident_id: ${globalResidentId}`);
    } catch (scanError) {
      console.error(`❌ [PARTNER_REFERRAL] Failed to scan for next ID:`, scanError.message);
      throw scanError;
    }

    try {
      resident = await base44.entities.Resident.create({
        first_name: firstName,
        last_name: lastName,
        phone: data.resident_phone,
        email: data.resident_email,
        organization_id: orgId,
        status: 'pre_intake',
        risk_level: 'low',
        global_resident_id: globalResidentId
      });
      console.log(`✅ [PARTNER_REFERRAL] Resident created: ID=${resident.id}, global_resident_id=${globalResidentId}`);
    } catch (createError) {
      console.error(`❌ [PARTNER_REFERRAL] Failed to create resident:`, createError.message);
      throw createError;
    }
  }

  // Create housing referral
  console.log(`[PARTNER_REFERRAL] Creating HousingReferral for partner: ${data.partner_name}`);
  try {
    const referral = await base44.entities.HousingReferral.create({
      resident_id: resident.id,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      participant_name: data.resident_name,
      housing_need_summary: data.notes || `Housing referral from ${data.partner_name}`,
      target_provider_name: data.partner_name,
      current_housing_situation: 'unknown',
      status: 'submitted',
      referral_date: new Date().toISOString().split('T')[0],
      internal_notes: `Referred by ${data.partner_name}. ${data.notes || ''}`
    });
    console.log(`✅ [PARTNER_REFERRAL] HousingReferral created: ${referral.id}`);

    // Create intake task
    console.log(`[PARTNER_REFERRAL] Creating ServiceTask`);
    const task = await base44.entities.ServiceTask.create({
      resident_id: resident.id,
      global_resident_id: globalResidentId,
      organization_id: orgId,
      title: `Housing Referral from ${data.partner_name}`,
      description: `Process housing referral. Partner: ${data.partner_name}. ${data.notes || ''}`,
      category: 'housing',
      status: 'pending',
      priority: 'high',
      requires_staff_action: true
    });
    console.log(`✅ [PARTNER_REFERRAL] ServiceTask created: ${task.id}`);

    // Create OnboardingRequest to bridge into queue
    console.log(`[PARTNER_REFERRAL] Creating OnboardingRequest for queue visibility`);
    try {
      const onboardingRequest = await base44.entities.OnboardingRequest.create({
        first_name: firstName,
        last_name: lastName,
        email: data.resident_email,
        phone: data.resident_phone,
        request_type: 'partner_referral',
        requested_role: 'resident',
        status: 'pending',
        submitted_date: new Date().toISOString(),
        ai_analysis_complete: false,
        resident_id: resident.id,
        referral_id: referral.id,
        organization_id: orgId,
        notes: `Referred by ${data.partner_name}: ${data.notes || ''}`
      });
      console.log(`✅ [PARTNER_REFERRAL] OnboardingRequest created: ${onboardingRequest.id}`);

      // Trigger AI analysis
      try {
        await base44.functions.invoke('analyzeOnboardingRequest', {
          request_id: onboardingRequest.id
        });
        console.log(`✅ [PARTNER_REFERRAL] AI analysis triggered for onboarding request`);
      } catch (aiError) {
        console.warn(`⚠️  [PARTNER_REFERRAL] AI analysis trigger failed (non-fatal): ${aiError.message}`);
      }
    } catch (onboardingError) {
      console.warn(`⚠️  [PARTNER_REFERRAL] OnboardingRequest creation failed (non-fatal): ${onboardingError.message}`);
    }

    return {
      submission_id: referral.id,
      created_records: {
        resident_id: resident.id,
        global_resident_id: globalResidentId,
        referral_id: referral.id
      },
      status: 'referral_submitted',
      message: `Housing referral received from ${data.partner_name} for ${data.resident_name}. Queued for review.`
    };
  } catch (operationError) {
    console.error(`❌ [PARTNER_REFERRAL] Failed to create records:`, operationError.message);
    throw operationError;
  }
}

async function handleEmployerIntake(base44, data, orgId) {
  console.log('[EMPLOYER_INTAKE] Starting validation');
  console.log(`[EMPLOYER_INTAKE] Checking required field: company_name="${data.company_name}"`);
  
  if (!data.company_name) {
    console.warn(`❌ [EMPLOYER_INTAKE] Validation failed: missing company_name`);
    throw new Error('Employer intake missing required: company_name');
  }
  console.log(`✅ [EMPLOYER_INTAKE] Required field present`);

  // Create employer
  console.log(`[EMPLOYER_INTAKE] Creating Employer: ${data.company_name}`);
  try {
    let employer = await base44.entities.Employer.create({
      company_name: data.company_name,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      address: data.address,
      city: data.city,
      state: data.state,
      industry: data.industry,
      hiring_preferences: data.hiring_preferences,
      website: data.website,
      second_chance_friendly: data.second_chance_friendly || false,
      veteran_friendly: data.veteran_friendly || false,
      organization_id: orgId,
      status: 'active'
    });
    console.log(`✅ [EMPLOYER_INTAKE] Employer created: ${employer.id}`);

    // Create job listing if provided
    let jobListing = null;
    if (data.job_title || data.job_description) {
      console.log(`[EMPLOYER_INTAKE] Job details provided, creating JobListing`);
      try {
        jobListing = await base44.entities.JobListing.create({
          employer_id: employer.id,
          employer_name: data.company_name,
          job_title: data.job_title || 'Position Available',
          job_description: data.job_description,
          location: data.job_location || `${data.city}, ${data.state}`,
          salary_range: data.salary_range,
          required_qualifications: data.required_qualifications,
          skills_preferred: data.skills_preferred,
          employment_type: data.employment_type || 'full_time',
          status: 'active',
          posted_date: new Date().toISOString().split('T')[0],
          organization_id: orgId
        });
        console.log(`✅ [EMPLOYER_INTAKE] JobListing created: ${jobListing.id}`);
      } catch (jobError) {
        console.warn(`⚠️  [EMPLOYER_INTAKE] Failed to create job listing, but employer created. Error: ${jobError.message}`);
      }
    } else {
      console.log(`[EMPLOYER_INTAKE] No job details provided, skipping JobListing creation`);
    }

    // Create OnboardingRequest to bridge into queue
    console.log(`[EMPLOYER_INTAKE] Creating OnboardingRequest for queue visibility`);
    try {
      const onboardingRequest = await base44.entities.OnboardingRequest.create({
        first_name: data.contact_name || 'Employer',
        last_name: data.company_name,
        email: data.contact_email,
        phone: data.contact_phone,
        request_type: 'employer_intake',
        requested_role: 'employer',
        status: 'pending',
        submitted_date: new Date().toISOString(),
        ai_analysis_complete: false,
        employer_id: employer.id,
        organization_id: orgId,
        notes: `Employer intake: ${data.company_name}`
      });
      console.log(`✅ [EMPLOYER_INTAKE] OnboardingRequest created: ${onboardingRequest.id}`);

      // Trigger AI analysis
      try {
        await base44.functions.invoke('analyzeOnboardingRequest', {
          request_id: onboardingRequest.id
        });
        console.log(`✅ [EMPLOYER_INTAKE] AI analysis triggered for onboarding request`);
      } catch (aiError) {
        console.warn(`⚠️  [EMPLOYER_INTAKE] AI analysis trigger failed (non-fatal): ${aiError.message}`);
      }
    } catch (onboardingError) {
      console.warn(`⚠️  [EMPLOYER_INTAKE] OnboardingRequest creation failed (non-fatal): ${onboardingError.message}`);
    }

    return {
      submission_id: employer.id,
      created_records: {
        employer_id: employer.id,
        job_listing_id: jobListing?.id || null
      },
      status: 'employer_registered',
      message: `Employer ${data.company_name} registered and queued for review. ${jobListing ? 'Job listing created.' : 'No job listing submitted.'}`
    };
  } catch (createError) {
    console.error(`❌ [EMPLOYER_INTAKE] Failed to create employer:`, createError.message);
    throw createError;
  }
}

async function handleResourceProvider(base44, data, orgId) {
  console.log('[RESOURCE_PROVIDER] Starting validation');
  console.log(`[RESOURCE_PROVIDER] Checking required field: provider_name="${data.provider_name}"`);
  
  if (!data.provider_name) {
    console.warn(`❌ [RESOURCE_PROVIDER] Validation failed: missing provider_name`);
    throw new Error('Resource provider missing required: provider_name');
  }
  console.log(`✅ [RESOURCE_PROVIDER] Required field present`);

  // Create partner agency
  console.log(`[RESOURCE_PROVIDER] Creating PartnerAgency: ${data.provider_name}`);
  try {
    const partner = await base44.entities.PartnerAgency.create({
      name: data.provider_name,
      type: data.provider_type || 'other',
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      address: data.address,
      status: 'active',
      notes: data.services_offered || data.notes || '',
      organization_id: orgId
    });
    console.log(`✅ [RESOURCE_PROVIDER] PartnerAgency created: ${partner.id}`);

    // Create OnboardingRequest to bridge into queue
    console.log(`[RESOURCE_PROVIDER] Creating OnboardingRequest for queue visibility`);
    try {
      const onboardingRequest = await base44.entities.OnboardingRequest.create({
        first_name: data.contact_name || 'Provider',
        last_name: data.provider_name,
        email: data.contact_email,
        phone: data.contact_phone,
        request_type: 'resource_provider',
        requested_role: 'partner',
        status: 'pending',
        submitted_date: new Date().toISOString(),
        ai_analysis_complete: false,
        partner_id: partner.id,
        organization_id: orgId,
        notes: `Resource provider intake: ${data.provider_name}`
      });
      console.log(`✅ [RESOURCE_PROVIDER] OnboardingRequest created: ${onboardingRequest.id}`);

      // Trigger AI analysis
      try {
        await base44.functions.invoke('analyzeOnboardingRequest', {
          request_id: onboardingRequest.id
        });
        console.log(`✅ [RESOURCE_PROVIDER] AI analysis triggered for onboarding request`);
      } catch (aiError) {
        console.warn(`⚠️  [RESOURCE_PROVIDER] AI analysis trigger failed (non-fatal): ${aiError.message}`);
      }
    } catch (onboardingError) {
      console.warn(`⚠️  [RESOURCE_PROVIDER] OnboardingRequest creation failed (non-fatal): ${onboardingError.message}`);
    }

    return {
      submission_id: partner.id,
      created_records: {
        partner_id: partner.id
      },
      status: 'provider_registered',
      message: `Service provider ${data.provider_name} registered, queued for review, and available for referrals.`
    };
  } catch (createError) {
    console.error(`❌ [RESOURCE_PROVIDER] Failed to create partner agency:`, createError.message);
    throw createError;
  }
}

async function checkForDuplicate(base44, data) {
  console.log('[DUPLICATE_CHECK] Starting duplicate detection');
  
  if (!data.first_name || !data.last_name) {
    console.log('[DUPLICATE_CHECK] Skipping: missing first_name or last_name');
    return null;
  }

  console.log(`[DUPLICATE_CHECK] Searching for residents: "${data.first_name} ${data.last_name}"`);
  
  // Simple duplicate check: search by first + last name
  try {
    const residents = await base44.entities.Resident.filter({
      first_name: data.first_name,
      last_name: data.last_name
    });
    
    console.log(`[DUPLICATE_CHECK] Found ${residents.length} resident(s) with matching name`);

    if (residents.length > 0) {
      // Additional checks: DOB or phone/email match increases confidence
      console.log('[DUPLICATE_CHECK] Checking for exact matches (DOB/phone/email)');
      const exactMatch = residents.find(r => 
        (data.date_of_birth && r.date_of_birth === data.date_of_birth) ||
        (data.phone && r.phone === data.phone) ||
        (data.email && r.email === data.email)
      );
      
      if (exactMatch) {
        console.log(`⚠️  [DUPLICATE_CHECK] EXACT MATCH found: ID=${exactMatch.id}, global_resident_id=${exactMatch.global_resident_id}`);
        return exactMatch;
      } else {
        console.log(`⚠️  [DUPLICATE_CHECK] NAME MATCH ONLY (no DOB/phone/email confirmation): ID=${residents[0].id}, global_resident_id=${residents[0].global_resident_id}`);
        return residents[0];
      }
    }
    
    console.log('[DUPLICATE_CHECK] ✅ No duplicates found');
    return null;
  } catch (checkError) {
    console.error('[DUPLICATE_CHECK] ❌ Error during duplicate check:', checkError.message);
    throw checkError;
  }
}