import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AUTHORIZED_ROLES = ['admin', 'staff', 'case_manager'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    console.log('[HOUSING] submitToHousingQueue invoked by:', user.email);

    const { resident_id, reason } = await req.json();
    if (!resident_id) return Response.json({ error: 'resident_id required' }, { status: 400 });

    const resident = await base44.entities.Resident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    console.log('[HOUSING] Resident found:', resident.id, 'current status:', resident.status);

    // Mark resident as housing_pending
    const updateResult = await base44.entities.Resident.update(resident_id, {
      status: 'housing_pending'
    });
    console.log('[HOUSING] Resident updated to housing_pending:', updateResult.id);

    // Create task for housing staff
    const task = await base44.asServiceRole.entities.ServiceTask.create({
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id,
      organization_id: resident.organization_id,
      title: `Housing Placement: ${resident.first_name} ${resident.last_name}`,
      description: `Resident submitted to housing queue. ${reason || 'No additional notes.'}`,
      category: 'housing',
      status: 'pending',
      priority: 'high',
      requires_staff_action: true
    });
    console.log('[HOUSING] Task created:', task.id);

    // ── HousingReferral upsert ────────────────────────────────────────────────
    const ACTIVE_STATUSES = ['submitted', 'received', 'under_review',
      'more_information_requested', 'approved', 'waitlisted', 'closed'];

    // Generate external referral ID
    const external_referral_id = `EXT-${resident.global_resident_id}-${Date.now()}`;

    // Check for existing referral at or past submitted
    const existingReferrals = await base44.asServiceRole.entities.HousingReferral.filter({
      resident_id: resident.id
    });
    const activeReferral = existingReferrals.find(r => ACTIVE_STATUSES.includes(r.status));

    let referral;
    let referral_action;

    if (activeReferral) {
      // Update existing — ensure external_referral_id is set
      const updateData = {};
      if (!activeReferral.external_referral_id) {
        updateData.external_referral_id = external_referral_id;
      }
      referral = await base44.asServiceRole.entities.HousingReferral.update(
        activeReferral.id, updateData
      );
      referral_action = 'updated_existing';
      console.log('[HOUSING] Existing HousingReferral found, ensured external_referral_id set:', referral.id);
    } else {
      // Create new referral
      referral = await base44.asServiceRole.entities.HousingReferral.create({
        resident_id: resident.id,
        global_resident_id: resident.global_resident_id,
        organization_id: resident.organization_id,
        participant_name: `${resident.first_name} ${resident.last_name}`,
        housing_need_summary: reason || 'Resident submitted to housing queue via Pathways.',
        referring_case_manager_id: user.id,
        referring_case_manager_name: user.full_name || user.email,
        priority_level: resident.risk_level === 'high' ? 'urgent' : 'high',
        status: 'submitted',
        submitted_date: new Date().toISOString(),
        consent_confirmed: true,
        external_referral_id
      });
      referral_action = 'created';
      console.log('[HOUSING] HousingReferral created:', referral.id, 'external_referral_id:', external_referral_id);
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      action: 'submit_to_housing_queue',
      entity_type: 'Resident',
      entity_id: resident.id,
      details: `Resident ${resident.first_name} ${resident.last_name} submitted to housing queue. Referral ${referral_action}. external_referral_id: ${referral.external_referral_id || external_referral_id}`,
      severity: 'info'
    }).catch(e => console.warn('[HOUSING] Audit log failed:', e.message));

    return Response.json({
      success: true,
      resident_id,
      task_id: task.id,
      referral_id: referral.id,
      referral_action,
      external_referral_id: referral.external_referral_id || external_referral_id,
      message: 'Resident submitted to housing queue'
    });
  } catch (error) {
    console.error('[HOUSING] Housing queue submission error:', error);
    return Response.json({ error: error.message || 'Failed to submit to housing queue' }, { status: 500 });
  }
});