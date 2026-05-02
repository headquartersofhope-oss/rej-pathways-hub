/**
 * processDonation — Stripe webhook handler for donor checkouts.
 *
 * Receives Stripe checkout.session.completed events.
 * Creates/updates Donor record, creates Donation record, sends tax receipt email.
 *
 * STUB MODE: If STRIPE_SECRET_KEY is not set, returns setup instructions instead
 * of processing. This lets the function ship safely before keys are provisioned.
 *
 * Required env vars (when ready to go live):
 *   STRIPE_SECRET_KEY        — Stripe secret API key (sk_live_... or sk_test_...)
 *   STRIPE_WEBHOOK_SECRET    — Webhook signing secret from Stripe webhook config
 *
 * Setup steps (post-key):
 *   1. In Stripe Dashboard → Webhooks → Add endpoint
 *   2. Endpoint URL: <base44 functions URL>/processDonation
 *   3. Listen for: checkout.session.completed
 *   4. Copy signing secret → paste into STRIPE_WEBHOOK_SECRET env var
 *   5. Apply for Stripe nonprofit rate (1.5% vs 2.9%) at support.stripe.com/contact
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const HOH_EIN = '[your-EIN-pending]'; // TODO: replace once IRS determination letter received
const HOH_NAME = 'Headquarters of Hope Foundation Inc';
const HOH_FOUNDER = 'Rodney Jones';

Deno.serve(async (req) => {
  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecret || !webhookSecret) {
      return Response.json({
        stub: true,
        message: 'Stripe not configured. processDonation is in stub mode.',
        next_steps: [
          '1. Create or sign in to your Stripe account',
          '2. Apply for Stripe nonprofit rate (1.5% + $0.30) at support.stripe.com/contact',
          '3. Get secret key at https://dashboard.stripe.com/apikeys',
          '4. Create webhook endpoint at https://dashboard.stripe.com/webhooks pointing at this function URL',
          '5. Listen for: checkout.session.completed',
          '6. Copy webhook signing secret',
          '7. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Base44 Functions env vars',
          '8. Build a public donor checkout page that calls Stripe Checkout with success_url back to your site',
        ],
      }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();

    // TODO (security): verify Stripe signature using webhookSecret + req.headers['stripe-signature']
    // For now, parse the JSON body. In production, signature verification is mandatory.

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Only process completed checkouts
    if (event.type !== 'checkout.session.completed') {
      return Response.json({ skipped: true, type: event.type });
    }

    const session = event.data.object;
    const donorEmail = session.customer_email || session.customer_details?.email;
    const donorName = session.customer_details?.name || 'Anonymous Donor';
    const amount = (session.amount_total || 0) / 100;
    const currency = (session.currency || 'usd').toUpperCase();
    const isRecurring = session.mode === 'subscription';

    // === Look up or create Donor ===
    let donorId = null;
    if (donorEmail) {
      const existing = await base44.asServiceRole.entities.Donor.filter({ email: donorEmail });
      if (existing.length > 0) {
        donorId = existing[0].id;
        // Increment lifetime giving total
        await base44.asServiceRole.entities.Donor.update(donorId, {
          last_donation_date: new Date().toISOString(),
          last_donation_amount: amount,
          lifetime_giving: (existing[0].lifetime_giving || 0) + amount,
        });
      } else {
        const newDonor = await base44.asServiceRole.entities.Donor.create({
          name: donorName,
          email: donorEmail,
          first_donation_date: new Date().toISOString(),
          last_donation_date: new Date().toISOString(),
          last_donation_amount: amount,
          lifetime_giving: amount,
          status: 'active',
          source: 'website_stripe',
        });
        donorId = newDonor.id;
      }
    }

    // === Create Donation record ===
    const donation = await base44.asServiceRole.entities.Donation.create({
      donor_id: donorId,
      donor_name: donorName,
      donor_email: donorEmail,
      amount,
      currency,
      donation_date: new Date().toISOString(),
      payment_method: 'stripe',
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      tax_receipt_sent: false,
      type: isRecurring ? 'recurring' : 'one_time',
      status: 'completed',
    });

    // === Send tax receipt email ===
    let receiptSent = false;
    if (donorEmail) {
      try {
        const receiptDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: donorEmail,
          subject: `Thank you — Tax Receipt for your $${amount.toFixed(2)} gift to ${HOH_NAME}`,
          body:
`Dear ${donorName},

Thank you for your generous gift of $${amount.toFixed(2)} ${currency} to ${HOH_NAME}.

This email serves as your official receipt for tax purposes.

${HOH_NAME} is a 501(c)(3) tax-exempt nonprofit organization.
EIN: ${HOH_EIN}
No goods or services were provided in exchange for this gift.

DONATION DETAILS
——————————————————————————————————
Date:           ${receiptDate}
Amount:         $${amount.toFixed(2)} ${currency}
Method:         Stripe (online)
Donation ID:    ${donation.id}
Type:           ${isRecurring ? 'Recurring monthly gift' : 'One-time gift'}
——————————————————————————————————

Keep this receipt for your tax records.

With deep gratitude,

${HOH_FOUNDER}
Founder, ${HOH_NAME}`,
        });
        await base44.asServiceRole.entities.Donation.update(donation.id, { tax_receipt_sent: true });
        receiptSent = true;
      } catch (e) {
        console.warn('[processDonation] Tax receipt send failed:', e.message);
      }
    }

    // === Notify admin ===
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: 'info@headquartersofhope.org',
        channel: 'email',
        type: 'donation_receipt',
        subject: `🎉 New donation: $${amount.toFixed(2)} from ${donorName}`,
        body: `${donorName} (${donorEmail}) just gave $${amount.toFixed(2)} ${currency} (${isRecurring ? 'recurring' : 'one-time'}). Donation ID: ${donation.id}`,
        sent_by: 'system',
        status: 'sent',
      });
    } catch (e) {
      console.warn('[processDonation] Admin notify failed:', e.message);
    }

    return Response.json({
      success: true,
      donation_id: donation.id,
      donor_id: donorId,
      amount,
      currency,
      tax_receipt_sent: receiptSent,
      is_recurring: isRecurring,
    });

  } catch (error) {
    console.error('[processDonation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
