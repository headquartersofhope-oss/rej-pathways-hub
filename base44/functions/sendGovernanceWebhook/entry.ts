/**
 * sendGovernanceWebhook — Outbound webhook to Governance OS
 *
 * Accepts event_type (string) and event_data (object), then POSTs
 * to the Governance OS processEcosystemTrigger endpoint with
 * the shared x-pathways-secret header.
 *
 * POST { event_type, event_data }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOVERNANCE_URL = 'https://preview-sandbox--69e881ebbd44d79ff0ebbaed.base44.app/functions/processEcosystemTrigger';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated users and internal service-role calls
    const body = await req.json();
    const { event_type, event_data = {} } = body;

    if (!event_type) {
      return Response.json({ error: 'event_type is required' }, { status: 400 });
    }

    const secret = Deno.env.get('GOVERNANCE_WEBHOOK_SECRET');
    if (!secret) {
      console.error('[sendGovernanceWebhook] GOVERNANCE_WEBHOOK_SECRET not set');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const payload = {
      event_type,
      event_data,
      timestamp: new Date().toISOString(),
      source: 'pathways_hub',
    };

    console.log(`[sendGovernanceWebhook] Sending event: ${event_type}`);

    const response = await fetch(GOVERNANCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pathways-secret': secret,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`[sendGovernanceWebhook] Response ${response.status} for event ${event_type}:`, responseData);

    return Response.json({
      success: response.ok,
      status: response.status,
      event_type,
      response: responseData,
    });

  } catch (error) {
    console.error('[sendGovernanceWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});