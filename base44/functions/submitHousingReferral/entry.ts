/**
 * submitHousingReferral — Marks a referral as submitted and optionally sends to external housing API.
 * Auth: staff, case_manager, admin only.
 * The referral must be in draft or ready_to_submit status and have consent_confirmed=true.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'case_manager') {
      return Response.json({ error: 'Forbidden: Staff or admin access required' }, { status: 403 });
    }

    const { referral_id } = await req.json();

    if (!referral_id) {
      return Response.json({ error: 'referral_id is required' }, { status: 400 });
    }

    // Fetch referral
    const referral = await base44.entities.HousingReferral.get(referral_id);
    if (!referral) {
      return Response.json({ error: 'Referral not found' }, { status: 404 });
    }

    // Org isolation check (non-admins can only submit their own org's referrals)
    if (user.role !== 'admin' && referral.organization_id !== user.data?.organization_id) {
      return Response.json({ error: 'Forbidden: You may only submit referrals from your organization' }, { status: 403 });
    }

    // Consent gate
    if (!referral.consent_confirmed) {
      return Response.json({ error: 'Referral cannot be submitted: participant consent has not been confirmed' }, { status: 400 });
    }

    // Status gate
    if (!['draft', 'ready_to_submit'].includes(referral.status)) {
      return Response.json({ error: `Referral cannot be submitted from status: ${referral.status}` }, { status: 400 });
    }

    // Attempt external API submission if provider has an api_endpoint
    let external_referral_id = null;
    let apiMessage = 'No external API configured for this provider.';

    if (referral.target_provider_id) {
      const provider = await base44.entities.HousingProvider.get(referral.target_provider_id).catch(() => null);
      if (provider?.api_endpoint) {
        try {
          const externalRes = await fetch(provider.api_endpoint + '/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              external_source: 'pathways_hub',
              referral_date: referral.referral_date,
              participant_name: referral.participant_name,
              contact_phone: referral.contact_phone,
              contact_email: referral.contact_email,
              housing_need_summary: referral.housing_need_summary,
              priority_level: referral.priority_level,
              current_housing_situation: referral.current_housing_situation,
              employment_status: referral.employment_status,
              relevant_barriers: referral.relevant_barriers || [],
              referring_organization: referral.organization_id,
              referring_staff: referral.referring_staff_name,
              consent_confirmed: referral.consent_confirmed,
              consent_categories: referral.consent_categories || [],
            }),
          });
          if (externalRes.ok) {
            const externalData = await externalRes.json();
            external_referral_id = externalData.referral_id || externalData.id || null;
            apiMessage = 'Referral sent to external housing system successfully.';
          } else {
            apiMessage = `External API responded with status ${externalRes.status}. Referral marked submitted locally.`;
          }
        } catch (apiErr) {
          apiMessage = `External API not reachable: ${apiErr.message}. Referral marked submitted locally.`;
        }
      }
    }

    // Update referral status to submitted
    const updateData = {
      status: 'submitted',
      submitted_date: new Date().toISOString(),
    };
    if (external_referral_id) {
      updateData.external_referral_id = external_referral_id;
    }

    await base44.entities.HousingReferral.update(referral_id, updateData);

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'housing_referral_submitted',
      entity_type: 'HousingReferral',
      entity_id: referral_id,
      performed_by: user.email,
      details: `Referral for ${referral.participant_name} submitted to ${referral.target_provider_name || 'provider'}. ${apiMessage}`,
    }).catch(() => {});

    return Response.json({
      success: true,
      referral_id,
      status: 'submitted',
      external_referral_id,
      api_message: apiMessage,
      message: 'Referral submitted successfully.',
    });
  } catch (error) {
    console.error('[submitHousingReferral] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});