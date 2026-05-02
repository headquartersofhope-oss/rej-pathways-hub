/**
 * processSponsorSignup
 *
 * Public-facing sponsor signup handler. Creates a Sponsor record with
 * status='pending_approval' (admin must approve + match to a sponsoree).
 * Sends welcome email + notifies admin.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      sponsor_name,
      email,
      phone = '',
      sponsorship_type = 'recovery_general',
      sobriety_date = null,
      years_sober = null,
      home_group = '',
      experience_with = [],
      availability = '',
      preferred_contact_method = 'phone',
      notes = '',
    } = body;

    if (!sponsor_name || !email) {
      return Response.json({ error: 'sponsor_name and email are required' }, { status: 400 });
    }

    // Check if sponsor already exists
    const existing = await base44.asServiceRole.entities.Sponsor.filter({ email });
    if (existing.length > 0) {
      return Response.json({
        success: true,
        sponsor_id: existing[0].id,
        already_exists: true,
        message: 'We already have your application on file.',
      });
    }

    const sponsor = await base44.asServiceRole.entities.Sponsor.create({
      sponsor_name,
      email,
      phone,
      sponsorship_type,
      sobriety_date,
      years_sober,
      home_group,
      experience_with,
      availability,
      preferred_contact_method,
      notes,
      status: 'pending_approval',
      background_check_status: 'pending',
      references_provided: false,
    });

    // Welcome email to sponsor
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Thank you for applying to be a Headquarters of Hope sponsor',
        body:
`Dear ${sponsor_name},

Thank you for stepping up to be a sponsor in the Headquarters of Hope program.

Your application has been received. Here's what happens next:

1. We review your application (1-3 business days)
2. We complete a background check (5-7 business days)
3. We match you with a sponsoree based on shared experience and availability
4. You receive an email introduction and access to the Pathways app

Sponsors are the lifeblood of recovery and reentry programs. Thank you for offering your time, your story, and your hand to someone who needs them.

If you have questions or want to update your application, just reply to this email.

With gratitude,

Rodney Jones
Founder, Headquarters of Hope Foundation Inc`,
      });
    } catch (e) {
      console.warn('[processSponsorSignup] Welcome email failed:', e.message);
    }

    // Notify admin
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: 'info@headquartersofhope.org',
        channel: 'email',
        type: 'custom',
        subject: `🤝 New sponsor application: ${sponsor_name}`,
        body: `${sponsor_name} (${email}) applied to sponsor.\nPhone: ${phone}\nSponsorship type: ${sponsorship_type}\nYears sober: ${years_sober || 'n/a'}\nExperience with: ${experience_with.join(', ') || 'not specified'}\n\nSponsor ID: ${sponsor.id} — review in admin portal and run background check.`,
        sent_by: 'system',
        status: 'queued',
      });
    } catch (e) {
      console.warn('[processSponsorSignup] Admin notify failed:', e.message);
    }

    return Response.json({
      success: true,
      sponsor_id: sponsor.id,
      message: 'Application received! Watch your inbox for next steps.',
    });

  } catch (error) {
    console.error('[processSponsorSignup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
