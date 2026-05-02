/**
 * processDonorSignup
 *
 * Public-facing donor signup handler. Called from the DonorSignup form
 * (no auth required). Creates a Donor record with status='prospect',
 * sends a welcome email, and notifies admin.
 *
 * Call as:
 *   base44.functions.invoke('processDonorSignup', {
 *     donor_name, email, phone, donor_type, interest_areas, notes
 *   })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      donor_name,
      email,
      phone = '',
      donor_type = 'individual',
      interest_areas = [],
      notes = '',
    } = body;

    if (!donor_name || !email) {
      return Response.json({ error: 'donor_name and email are required' }, { status: 400 });
    }

    // Check if donor already exists
    const existing = await base44.asServiceRole.entities.Donor.filter({ contact_email: email });
    if (existing.length > 0) {
      return Response.json({
        success: true,
        donor_id: existing[0].id,
        already_exists: true,
        message: 'Welcome back! We already have your information on file.',
      });
    }

    // Create donor
    const donor = await base44.asServiceRole.entities.Donor.create({
      donor_name,
      contact_email: email,
      contact_phone: phone,
      donor_type,
      status: 'prospect',
      source: 'website_signup',
      notes: [notes, interest_areas.length > 0 ? `Interest areas: ${interest_areas.join(', ')}` : ''].filter(Boolean).join('\n\n'),
      total_given: 0,
    });

    // Send welcome email to donor
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Welcome to the Headquarters of Hope family',
        body:
`Dear ${donor_name},

Thank you for joining the Headquarters of Hope donor community.

We're a 501(c)(3) nonprofit serving formerly incarcerated adults, veterans, and people in recovery. Every gift — large or small — directly funds housing days, job placements, and second chances.

When you're ready to give, you can do so at any time. We'll keep you updated on the impact of our work and the people you're helping.

If you have any questions, just reply to this email.

With gratitude,

Rodney Jones
Founder, Headquarters of Hope Foundation Inc`,
      });
    } catch (e) {
      console.warn('[processDonorSignup] Welcome email failed:', e.message);
    }

    // Notify admin
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: 'info@headquartersofhope.org',
        channel: 'email',
        type: 'custom',
        subject: `📬 New donor signup: ${donor_name}`,
        body: `${donor_name} (${email}) signed up as a donor via the website.\nPhone: ${phone || 'not provided'}\nDonor type: ${donor_type}\nInterest areas: ${interest_areas.join(', ') || 'not specified'}\n\nDonor ID: ${donor.id}`,
        sent_by: 'system',
        status: 'queued',
      });
    } catch (e) {
      console.warn('[processDonorSignup] Admin notify failed:', e.message);
    }

    return Response.json({
      success: true,
      donor_id: donor.id,
      message: 'Thank you for joining! Check your inbox for a welcome message.',
    });

  } catch (error) {
    console.error('[processDonorSignup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
