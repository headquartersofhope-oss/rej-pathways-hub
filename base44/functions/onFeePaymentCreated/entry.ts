/**
 * onFeePaymentCreated — Entity automation handler.
 *
 * Fires on FeePayment create events.
 * If the payment amount exceeds $5,000, fires a governance webhook: large_transaction.
 *
 * Auth: service-role (no user token — triggered by entity automation)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LARGE_TRANSACTION_THRESHOLD = 5000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data) {
      return Response.json({ success: true, skipped: true, reason: 'No payment data in payload' });
    }

    const amount = Number(data.amount || data.fee_amount || data.total || 0);

    if (amount <= LARGE_TRANSACTION_THRESHOLD) {
      return Response.json({ success: true, skipped: true, reason: `Amount $${amount} below threshold` });
    }

    console.log(`[onFeePaymentCreated] Large transaction detected: $${amount}, firing governance webhook`);

    await base44.asServiceRole.functions.invoke('sendGovernanceWebhook', {
      event_type: 'large_transaction',
      event_data: {
        amount,
        resident_id: data.resident_id,
        global_resident_id: data.global_resident_id,
        organization_id: data.organization_id,
        payment_type: data.payment_type,
        payment_method: data.payment_method,
        description: data.description || data.notes,
        fee_period: data.fee_period,
        record_id: data.id,
      },
    });

    console.log('[onFeePaymentCreated] Governance webhook sent: large_transaction');
    return Response.json({ success: true, event_type: 'large_transaction', amount });

  } catch (error) {
    console.error('[onFeePaymentCreated] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});