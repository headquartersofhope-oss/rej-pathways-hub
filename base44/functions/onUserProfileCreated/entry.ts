/**
 * onUserProfileCreated — Entity automation handler.
 *
 * Fires on UserProfile create events.
 * If the new profile has role "staff", fires a governance webhook: staff_change.
 *
 * Auth: service-role (no user token — triggered by entity automation)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data) {
      return Response.json({ success: true, skipped: true, reason: 'No profile data in payload' });
    }

    // Only fire for staff role creations
    if (data.app_role !== 'staff' && data.app_role !== 'case_manager') {
      return Response.json({ success: true, skipped: true, reason: `Role ${data.app_role} does not trigger staff_change` });
    }

    console.log(`[onUserProfileCreated] Staff profile created for ${data.email}, firing governance webhook`);

    await base44.asServiceRole.functions.invoke('sendGovernanceWebhook', {
      event_type: 'staff_change',
      event_data: {
        action: 'created',
        email: data.email,
        full_name: data.full_name,
        app_role: data.app_role,
        organization_id: data.organization_id,
        site_id: data.site_id,
        status: data.status,
      },
    });

    console.log('[onUserProfileCreated] Governance webhook sent: staff_change');
    return Response.json({ success: true, event_type: 'staff_change', email: data.email });

  } catch (error) {
    console.error('[onUserProfileCreated] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});