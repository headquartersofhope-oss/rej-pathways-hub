import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Lists all users with their custom profiles merged together
 * This avoids frontend SDK entity loading issues by doing the merge on the backend
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch both users and profiles
    const [platformUsers, profiles] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 100),
      base44.asServiceRole.entities.UserProfile.list('-created_date', 100),
    ]);
    
    console.log('Platform users:', platformUsers.length, 'UserProfiles:', profiles.length);

    // Create a map of profiles by email for quick lookup
    const profileMap = {};
    const profileEmails = new Set();
    profiles.forEach(p => {
      // Handle both direct fields and nested data field
      const email = (p.data?.email || p.email || '').toLowerCase();
      if (email) {
        profileMap[email] = p.data || p;
        profileEmails.add(email);
      }
    });

    // Create a set of platform user emails for deduplication
    const platformEmails = new Set(platformUsers.map(u => u.email.toLowerCase()));

    // Start with platform users
    const mergedUsers = platformUsers.map(u => {
      const profile = profileMap[u.email.toLowerCase()];
      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone_number: profile?.phone_number || null,
        app_role: profile?.app_role || 'staff',
        organization_id: profile?.organization_id || null,
        site_id: profile?.site_id || null,
        status: profile?.status || 'active',
        onboarding_status: profile?.onboarding_status || 'not_started',
        created_date: u.created_date,
      };
    });

    // Add users that exist in profiles but not in platform (pending/invited)
    profiles.forEach(p => {
      const email = (p.data?.email || p.email || '').toLowerCase();
      if (!platformEmails.has(email)) {
        const profile = p.data || p;
        mergedUsers.push({
          id: p.id,
          full_name: profile.full_name || email,
          email: profile.email,
          phone_number: profile.phone_number || null,
          app_role: profile.app_role || 'staff',
          organization_id: profile.organization_id || null,
          site_id: profile.site_id || null,
          status: profile.status || 'active',
          onboarding_status: profile.onboarding_status || 'not_started',
          created_date: p.created_date,
        });
      }
    });

    return Response.json({ success: true, users: mergedUsers });
  } catch (error) {
    console.error('List users error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});