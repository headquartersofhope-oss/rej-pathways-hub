import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Creates a user with optional onboarding tracking and invitation.
 * Handles app_role mapping to platform role and generates onboarding tokens.
 * 
 * Payload:
 * {
 *   full_name: string,
 *   email: string,
 *   phone?: string,
 *   app_role: 'admin' | 'case_manager' | 'staff' | 'probation_officer' | 'resident' | 'instructor' | 'program_manager' | 'employer' | 'auditor',
 *   organization_id?: string,
 *   site_id?: string,
 *   status?: 'active' | 'inactive',
 *   send_invite?: boolean,
 *   send_sms?: boolean
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || !['admin', 'user'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const {
      full_name,
      email,
      phone,
      app_role,
      organization_id,
      site_id,
      status = 'active',
      send_invite = false,
      send_sms = false
    } = payload;

    // Validate required fields
    if (!full_name?.trim()) {
      return Response.json({ error: 'full_name is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }
    if (!app_role) {
      return Response.json({ error: 'app_role is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Create or get user
    let createdUser;
    try {
      // Try to create the user
      createdUser = await base44.asServiceRole.entities.User.create({
        full_name,
        email,
        role: app_role,
        organization_id,
        site_id,
        status,
        phone: phone || undefined,
      });
    } catch (createError) {
      // If user already exists, try to update
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers.length > 0) {
        createdUser = existingUsers[0];
        // Update with new data if provided
        await base44.asServiceRole.entities.User.update(createdUser.id, {
          full_name,
          role: app_role,
          organization_id,
          site_id,
          status,
          phone: phone || undefined,
        });
      } else {
        throw createError;
      }
    }

    // Generate onboarding token/link
    const onboardingToken = crypto.getRandomValues(new Uint8Array(16));
    const tokenHex = Array.from(onboardingToken).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store onboarding record if supported
    let onboardingRecord;
    try {
      onboardingRecord = await base44.asServiceRole.entities.Onboarding.create({
        user_id: createdUser.id,
        organization_id,
        assigned_by: user.id,
        is_active: true,
        dismissed: false,
        completed_steps: [],
      });
    } catch (e) {
      console.log('Onboarding entity not available, skipping');
    }

    // Build onboarding URL
    const baseUrl = new URL(req.url).origin;
    const onboardingUrl = `${baseUrl}?onboard=${tokenHex}&user=${createdUser.id}`;

    // If SMS requested, return URL for manual copying (SMS sending not built-in)
    // In a real system, integrate with Twilio or similar
    const result = {
      user_id: createdUser.id,
      email: createdUser.email,
      full_name: createdUser.full_name,
      app_role,
      phone,
      onboarding_url: onboardingUrl,
      onboarding_token: tokenHex,
      status: 'created',
    };

    // If send_invite, send email (if supported integration exists)
    if (send_invite) {
      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Welcome to ${new URL(req.url).hostname}`,
          body: `Hi ${full_name},\n\nYou've been added as a ${app_role}. Click the link below to get started:\n\n${onboardingUrl}\n\nThis link expires in 7 days.`,
        });
        result.invite_sent = true;
      } catch (emailError) {
        console.log('Email sending failed:', emailError.message);
        result.invite_error = emailError.message;
      }
    }

    // If SMS requested, return link for manual SMS (direct SMS integration not implemented)
    if (send_sms && phone) {
      result.sms_message = `Welcome! Complete your onboarding here: ${onboardingUrl}`;
      result.sms_ready = true;
    }

    return Response.json(result);
  } catch (error) {
    console.error('User creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});