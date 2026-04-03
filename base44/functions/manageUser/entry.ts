import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Manages user operations: create, update, activate/deactivate
 * Creates UserProfile records linked by email to platform Users
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, email, data } = payload;

    if (action === 'create') {
      const { full_name, phone_number, app_role, organization_id, site_id, status = 'active' } = data;

      // Validate required fields
      if (!full_name?.trim() || !email?.trim() || !app_role) {
        return Response.json({ error: 'full_name, email, and app_role are required' }, { status: 400 });
      }

      // Map app_role to platform role (only admin/user allowed by platform)
      // All custom roles (case_manager, probation_officer, staff, etc.) map to 'user'
      const platformRole = (app_role === 'admin') ? 'admin' : 'user';
      console.log(`[manageUser] Mapping app_role="${app_role}" to platformRole="${platformRole}"`);

      try {
        // Try to invite user to platform first
        try {
          await base44.users.inviteUser(email, platformRole);
          console.log('User invited to platform:', email);
        } catch (inviteErr) {
          // User may already exist, that's ok
          console.log('User invite skipped (may already exist):', email);
        }

        // Now create or update UserProfile with custom fields
        // The platform may have auto-created a profile when inviting, so we update it to set proper values
        const existingProfile = await base44.entities.UserProfile.filter({ email: email.toLowerCase() }, '', 1);
        
        let profile;
        if (existingProfile.length > 0) {
          // Update existing profile (set/override all fields)
          profile = await base44.entities.UserProfile.update(existingProfile[0].id, {
            email: email.toLowerCase(),
            full_name,
            phone_number: phone_number || undefined,
            app_role,
            organization_id: organization_id || undefined,
            site_id: site_id || undefined,
            status,
            onboarding_status: 'invited',
          });
          console.log('UserProfile updated after invite:', email, 'with full_name:', full_name);
        } else {
          // Create new profile if it doesn't exist
          profile = await base44.entities.UserProfile.create({
            email: email.toLowerCase(),
            full_name,
            phone_number: phone_number || undefined,
            app_role,
            organization_id: organization_id || undefined,
            site_id: site_id || undefined,
            status,
            onboarding_status: 'invited',
          });
          console.log('UserProfile created:', email);
        }

        // Generate onboarding link
        const tokenBytes = crypto.getRandomValues(new Uint8Array(16));
        const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const baseUrl = new URL(req.url).origin;
        const onboardingUrl = `${baseUrl}?onboard=${token}&user=${email}`;

        return Response.json({
          success: true,
          email,
          full_name,
          app_role,
          onboarding_url: onboardingUrl,
          onboarding_token: token,
          phone: phone_number || null,
        });
      } catch (createError) {
        console.error('User creation failed:', createError.message);
        return Response.json({ error: 'User creation failed: ' + createError.message }, { status: 500 });
      }
    } else if (action === 'update') {
      if (!email) {
        return Response.json({ error: 'email required' }, { status: 400 });
      }

      try {
        const profiles = await base44.entities.UserProfile.filter({ email: email.toLowerCase() }, '', 1);
        if (profiles.length === 0) {
          return Response.json({ error: 'User profile not found' }, { status: 404 });
        }

        const updateData = {};
        if (data.full_name !== undefined) updateData.full_name = data.full_name;
        if (data.email !== undefined) updateData.email = data.email.toLowerCase();
        if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
        if (data.app_role !== undefined) updateData.app_role = data.app_role;
        if (data.organization_id !== undefined) updateData.organization_id = data.organization_id || null;
        if (data.site_id !== undefined) updateData.site_id = data.site_id || null;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.onboarding_status !== undefined) updateData.onboarding_status = data.onboarding_status;

        await base44.entities.UserProfile.update(profiles[0].id, updateData);

        console.log('UserProfile updated:', email, 'with data:', updateData);
        return Response.json({ success: true, email: data.email || email });
      } catch (updateError) {
        console.error('User update failed:', updateError.message);
        return Response.json({ error: 'Update failed: ' + updateError.message }, { status: 500 });
      }
    } else if (action === 'activate') {
      if (!email) return Response.json({ error: 'email required' }, { status: 400 });
      try {
        const profiles = await base44.entities.UserProfile.filter({ email: email.toLowerCase() }, '', 1);
        if (profiles.length === 0) {
          return Response.json({ error: 'User profile not found' }, { status: 404 });
        }
        await base44.entities.UserProfile.update(profiles[0].id, { status: 'active' });
        console.log('User activated:', email);
        return Response.json({ success: true, email, status: 'active' });
      } catch (error) {
        console.error('Activation failed:', error.message);
        return Response.json({ error: 'Activation failed: ' + error.message }, { status: 500 });
      }
    } else if (action === 'deactivate') {
      if (!email) return Response.json({ error: 'email required' }, { status: 400 });
      try {
        const profiles = await base44.entities.UserProfile.filter({ email: email.toLowerCase() }, '', 1);
        if (profiles.length === 0) {
          return Response.json({ error: 'User profile not found' }, { status: 404 });
        }
        await base44.entities.UserProfile.update(profiles[0].id, { status: 'inactive' });
        console.log('User deactivated:', email);
        return Response.json({ success: true, email, status: 'inactive' });
      } catch (error) {
        console.error('Deactivation failed:', error.message);
        return Response.json({ error: 'Deactivation failed: ' + error.message }, { status: 500 });
      }
    } else {
      return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('User management error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});