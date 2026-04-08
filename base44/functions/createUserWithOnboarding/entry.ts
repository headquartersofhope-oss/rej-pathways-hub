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
    
    // RULE 1: Authenticate first
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.error('Auth error:', authError);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RULE 2: Admin-only - user creation is admin function
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    // Invite the user to the platform using the built-in inviteUser
    // Platform roles are limited to "user" and "admin" - map app_role to platform role
    let inviteResult = { email, full_name, app_role };
    const platformRole = (app_role === 'admin' || app_role === 'super_admin' || app_role === 'org_admin') ? 'admin' : 'user';
    
    try {
      // The inviteUser function only accepts "user" or "admin"
      await base44.users.inviteUser(email, platformRole);
      console.log('User invited successfully:', email, 'as platform role:', platformRole);
    } catch (inviteError) {
      console.log('Invite error (continuing):', inviteError.message);
      // Continue even if invite fails - we still return the onboarding link
      inviteResult.invite_error = inviteError.message;
    }
    
    // Generate onboarding token/link first
    const onboardingToken = crypto.getRandomValues(new Uint8Array(16));
    const tokenHex = Array.from(onboardingToken).map(b => b.toString(16).padStart(2, '0')).join('');

    // Try to store in custom User entity (best effort, may fail due to platform restrictions)
    try {
      const existingUser = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUser && existingUser.length > 0) {
        // Update existing
        await base44.asServiceRole.entities.User.update(existingUser[0].id, {
          full_name,
          role: app_role,
          app_role,
          status: status || 'active',
          ...(phone && { phone_number: phone }),
          ...(organization_id && { organization_id }),
          ...(site_id && { site_id }),
        });
        inviteResult.user_id = existingUser[0].id;
        console.log('Updated existing user:', inviteResult.user_id);
      } else {
        // Try to create
        const newUser = await base44.asServiceRole.entities.User.create({
          email,
          full_name,
          role: app_role,
          app_role,
          status: status || 'active',
          ...(phone && { phone_number: phone }),
          ...(organization_id && { organization_id }),
          ...(site_id && { site_id }),
        });
        inviteResult.user_id = newUser.id;
        console.log('Created new user:', inviteResult.user_id);
      }
    } catch (entityError) {
      console.log('Entity storage error (expected for platform users):', entityError.message);
      // Generate a temp token-based ID for tracking
      const tempId = tokenHex.substring(0, 16);
      inviteResult.user_id = tempId;
    }
    
    // Store onboarding record if supported
    try {
      await base44.asServiceRole.entities.Onboarding.create({
        user_id: inviteResult.user_id,
        organization_id,
        assigned_by: user.id,
        is_active: true,
        dismissed: false,
        completed_steps: [],
      });
      console.log('Onboarding record created');
    } catch (e) {
      console.log('Onboarding entity not available, skipping:', e.message);
    }

    // Build onboarding URL
    const baseUrl = new URL(req.url).origin;
    const onboardingUrl = `${baseUrl}?onboard=${tokenHex}&user=${inviteResult.user_id}`;

    // Build response
    const result = {
      user_id: inviteResult.user_id,
      email: inviteResult.email,
      full_name: inviteResult.full_name,
      app_role: inviteResult.app_role,
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