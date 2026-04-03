import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Manages user operations: create, update, activate/deactivate
 * Works directly with the User entity and handles onboarding token generation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, user_id, data } = payload;

    if (action === 'create') {
      const { full_name, email, phone_number, app_role, organization_id, site_id, status = 'active' } = data;

      // Validate required fields
      if (!full_name?.trim() || !email?.trim() || !app_role) {
        return Response.json({ error: 'full_name, email, and app_role are required' }, { status: 400 });
      }

      // Map app_role to platform role (only admin/user allowed by platform)
      const platformRole = (app_role === 'admin') ? 'admin' : 'user';

      try {
        // Create User entity with all fields
        const newUser = await base44.asServiceRole.entities.User.create({
          full_name,
          email,
          phone_number: phone_number || undefined,
          app_role,
          role: platformRole,
          organization_id: organization_id || undefined,
          site_id: site_id || undefined,
          status,
          onboarding_status: 'not_started',
        });

        console.log('User entity created:', newUser.id, email);

        // Generate onboarding link
        const tokenBytes = crypto.getRandomValues(new Uint8Array(16));
        const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const baseUrl = new URL(req.url).origin;
        const onboardingUrl = `${baseUrl}?onboard=${token}&user=${newUser.id}`;

        return Response.json({
          success: true,
          user_id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          app_role: newUser.app_role,
          onboarding_url: onboardingUrl,
          onboarding_token: token,
          phone: newUser.phone_number,
        });
      } catch (createError) {
        console.error('User creation failed:', createError.message);
        return Response.json({ error: 'User creation failed: ' + createError.message }, { status: 500 });
      }
    } else if (action === 'update') {
      if (!user_id) {
        return Response.json({ error: 'user_id required' }, { status: 400 });
      }

      try {
        const updateData = {};
        if (data.full_name !== undefined) updateData.full_name = data.full_name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
        if (data.app_role !== undefined) {
          updateData.app_role = data.app_role;
          updateData.role = (data.app_role === 'admin') ? 'admin' : 'user';
        }
        if (data.organization_id !== undefined) updateData.organization_id = data.organization_id || null;
        if (data.site_id !== undefined) updateData.site_id = data.site_id || null;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.onboarding_status !== undefined) updateData.onboarding_status = data.onboarding_status;

        await base44.asServiceRole.entities.User.update(user_id, updateData);

        console.log('User updated:', user_id);
        return Response.json({ success: true, user_id });
      } catch (updateError) {
        console.error('User update failed:', updateError.message);
        return Response.json({ error: 'Update failed: ' + updateError.message }, { status: 500 });
      }
    } else if (action === 'activate') {
      if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });
      try {
        await base44.asServiceRole.entities.User.update(user_id, { status: 'active' });
        console.log('User activated:', user_id);
        return Response.json({ success: true, user_id, status: 'active' });
      } catch (error) {
        console.error('Activation failed:', error.message);
        return Response.json({ error: 'Activation failed: ' + error.message }, { status: 500 });
      }
    } else if (action === 'deactivate') {
      if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });
      try {
        await base44.asServiceRole.entities.User.update(user_id, { status: 'inactive' });
        console.log('User deactivated:', user_id);
        return Response.json({ success: true, user_id, status: 'inactive' });
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