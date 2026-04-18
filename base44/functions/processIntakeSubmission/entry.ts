import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Validate required fields
    if (!payload.source_type || !['website_application', 'partner_referral', 'employer_intake', 'resource_provider'].includes(payload.source_type)) {
      return Response.json({ error: 'Invalid or missing source_type' }, { status: 400 });
    }

    if (!payload.data) {
      return Response.json({ error: 'Missing data object' }, { status: 400 });
    }

    // Log submission
    const submissionLog = {
      source_type: payload.source_type,
      submission_data: JSON.stringify(payload.data),
      status: 'received',
      created_at: new Date().toISOString(),
      organization_id: payload.organization_id || 'org1',
      metadata: payload.metadata || {}
    };

    // Route to appropriate handler
    let result;
    switch (payload.source_type) {
      case 'website_application':
        result = await handleWebsiteApplication(base44, payload.data, payload.organization_id || 'org1');
        break;
      case 'partner_referral':
        result = await handlePartnerReferral(base44, payload.data, payload.organization_id || 'org1');
        break;
      case 'employer_intake':
        result = await handleEmployerIntake(base44, payload.data, payload.organization_id || 'org1');
        break;
      case 'resource_provider':
        result = await handleResourceProvider(base44, payload.data, payload.organization_id || 'org1');
        break;
      default:
        return Response.json({ error: 'Unknown source type' }, { status: 400 });
    }

    // Log success
    submissionLog.status = 'processed';
    submissionLog.result = result;

    return Response.json({
      success: true,
      submission_id: result.submission_id,
      source_type: payload.source_type,
      created_records: result.created_records,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    console.error('Intake submission error:', error);
    return Response.json({
      error: error.message,
      status: 'failed'
    }, { status: 500 });
  }
});

async function handleWebsiteApplication(base44, data, orgId) {
  // Validate required fields
  if (!data.first_name || !data.last_name || !data.email) {
    throw new Error('Website application missing required: first_name, last_name, email');
  }

  // Check for duplicates
  const existingResident = await checkForDuplicate(base44, data);
  
  let resident;
  if (existingResident) {
    resident = existingResident;
  } else {
    // Create new resident
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
      risk_level: 'low'
    });
  }

  // Create intake assessment
  const intake = await base44.entities.IntakeAssessment.create({
    resident_id: resident.id,
    global_resident_id: resident.global_resident_id,
    organization_id: orgId,
    status: 'in_progress',
    personal: {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone
    }
  });

  // Create initial service plan
  const servicePlan = await base44.entities.ServicePlan.create({
    resident_id: resident.id,
    global_resident_id: resident.global_resident_id,
    organization_id: orgId,
    title: 'Initial Service Plan - Website Application',
    status: 'active'
  });

  // Create intake task
  await base44.entities.ServiceTask.create({
    resident_id: resident.id,
    global_resident_id: resident.global_resident_id,
    organization_id: orgId,
    title: 'Complete Intake Assessment',
    description: 'Resident submitted application via website. Complete full intake assessment.',
    category: 'intake',
    status: 'pending',
    priority: 'high',
    requires_staff_action: true
  });

  return {
    submission_id: intake.id,
    created_records: {
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      intake_assessment_id: intake.id,
      service_plan_id: servicePlan.id
    },
    status: 'intake_started',
    message: `Website application received for ${data.first_name} ${data.last_name}. Intake assessment created.`
  };
}

async function handlePartnerReferral(base44, data, orgId) {
  if (!data.resident_name || !data.partner_name) {
    throw new Error('Partner referral missing required: resident_name, partner_name');
  }

  // Parse resident name
  const nameParts = data.resident_name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || 'Unknown';

  // Check for duplicates
  const existingResident = await checkForDuplicate(base44, {
    first_name: firstName,
    last_name: lastName,
    phone: data.resident_phone,
    email: data.resident_email
  });

  let resident;
  if (existingResident) {
    resident = existingResident;
  } else {
    resident = await base44.entities.Resident.create({
      first_name: firstName,
      last_name: lastName,
      phone: data.resident_phone,
      email: data.resident_email,
      organization_id: orgId,
      status: 'pre_intake',
      risk_level: 'low'
    });
  }

  // Create housing referral
  const referral = await base44.entities.HousingReferral.create({
    resident_id: resident.id,
    global_resident_id: resident.global_resident_id,
    organization_id: orgId,
    house_name: data.house_name || 'Partner Referral - TBD',
    house_type: data.house_type || 'transitional_housing',
    placement_source: data.partner_name,
    referral_status: 'submitted',
    placement_status: 'referred',
    sync_source: 'partner_referral',
    notes: data.notes || `Referral from ${data.partner_name}`
  });

  // Create intake task
  await base44.entities.ServiceTask.create({
    resident_id: resident.id,
    global_resident_id: resident.global_resident_id,
    organization_id: orgId,
    title: `Housing Referral from ${data.partner_name}`,
    description: `Process housing referral. Partner: ${data.partner_name}. ${data.notes || ''}`,
    category: 'housing',
    status: 'pending',
    priority: 'high',
    requires_staff_action: true
  });

  return {
    submission_id: referral.id,
    created_records: {
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      referral_id: referral.id
    },
    status: 'referral_submitted',
    message: `Housing referral received from ${data.partner_name} for ${data.resident_name}.`
  };
}

async function handleEmployerIntake(base44, data, orgId) {
  if (!data.company_name) {
    throw new Error('Employer intake missing required: company_name');
  }

  // Create or find employer
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

  // Create job listing if provided
  let jobListing = null;
  if (data.job_title || data.job_description) {
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
  }

  return {
    submission_id: employer.id,
    created_records: {
      employer_id: employer.id,
      job_listing_id: jobListing?.id || null
    },
    status: 'employer_registered',
    message: `Employer ${data.company_name} registered. ${jobListing ? 'Job listing created.' : 'No job listing submitted.'}`
  };
}

async function handleResourceProvider(base44, data, orgId) {
  if (!data.provider_name) {
    throw new Error('Resource provider missing required: provider_name');
  }

  // Create partner agency
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

  return {
    submission_id: partner.id,
    created_records: {
      partner_id: partner.id
    },
    status: 'provider_registered',
    message: `Service provider ${data.provider_name} registered and available for referrals.`
  };
}

async function checkForDuplicate(base44, data) {
  if (!data.first_name || !data.last_name) {
    return null;
  }

  // Simple duplicate check: search by first + last name
  const residents = await base44.entities.Resident.filter({
    first_name: data.first_name,
    last_name: data.last_name
  });

  if (residents.length > 0) {
    // Additional checks: DOB or phone/email match increases confidence
    const exactMatch = residents.find(r => 
      (data.date_of_birth && r.date_of_birth === data.date_of_birth) ||
      (data.phone && r.phone === data.phone) ||
      (data.email && r.email === data.email)
    );
    
    return exactMatch || residents[0];
  }

  return null;
}