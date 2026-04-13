import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { create } from "https://deno.land/x/djwt@v2.2/mod.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth + admin gate
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const JWT_SECRET = Deno.env.get('JWT_SECRET');
    if (!JWT_SECRET) return Response.json({ error: 'System configuration error: JWT_SECRET not set' }, { status: 500 });

    const { request_id, final_role } = await req.json();
    if (!final_role) return Response.json({ error: 'final_role is required' }, { status: 400 });

    const request = await base44.asServiceRole.entities.OnboardingRequest.get(request_id);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });

    // Generate JWT activation token (valid for 7 days)
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const activationToken = await create(
      { alg: "HS256", typ: "JWT" },
      { email: request.email, role: final_role, exp: expiresAt },
      JWT_SECRET
    );

    // Invite user to platform
    let linkedUser;
    try {
      await base44.users.inviteUser(request.email, final_role);
      const userList = await base44.asServiceRole.entities.User.filter({ email: request.email });
      linkedUser = userList[0];
    } catch (err) {
      const userList = await base44.asServiceRole.entities.User.filter({ email: request.email });
      linkedUser = userList[0];
    }

    // Create UserAccount record
    const userAccount = await base44.asServiceRole.entities.UserAccount.create({
      email: request.email,
      user_id: linkedUser?.id,
      app_role: final_role,
      status: 'invited',
      onboarding_request_id: request_id,
      temporary_login_code: activationToken,
      temporary_code_expires: new Date(expiresAt * 1000).toISOString(),
      approved_date: new Date().toISOString(),
      created_by: user.email,
    });

    // If resident, create Resident record
    let linkedResidentId;
    if (final_role === 'resident' || request.request_type === 'resident_intake') {
      const resident = await base44.asServiceRole.entities.Resident.create({
        first_name: request.first_name,
        last_name: request.last_name,
        preferred_name: request.preferred_name,
        email: request.email,
        phone: request.phone,
        date_of_birth: request.date_of_birth,
        population: request.resident_data?.population,
        user_id: linkedUser?.id,
        organization_id: request.organization_id || user.data?.organization_id,
        status: 'active',
      });
      linkedResidentId = resident.id;

      await base44.asServiceRole.entities.UserAccount.update(userAccount.id, {
        linked_resident_id: resident.id,
      });

      if (request.resident_data?.primary_needs?.length > 0) {
        for (const need of request.resident_data.primary_needs) {
          await base44.asServiceRole.entities.BarrierItem.create({
            global_resident_id: resident.global_resident_id,
            resident_id: resident.id,
            category: 'other',
            title: need,
            description: `Identified during intake: ${need}`,
            status: 'new',
            auto_generated: true,
          }).catch(() => {});
        }
      }
    }

    // If employer, create/link employer record
    let linkedEmployerId;
    if (final_role === 'employer' && request.organization) {
      const employers = await base44.asServiceRole.entities.Employer.filter({ company_name: request.organization });
      if (employers.length > 0) {
        linkedEmployerId = employers[0].id;
      } else {
        const employer = await base44.asServiceRole.entities.Employer.create({
          company_name: request.organization,
          contact_name: `${request.first_name} ${request.last_name}`,
          contact_email: request.email,
          contact_phone: request.phone,
          status: 'pending_review',
        });
        linkedEmployerId = employer.id;
      }
      await base44.asServiceRole.entities.UserAccount.update(userAccount.id, { linked_employer_id: linkedEmployerId });
    }

    // ---- ACTIVATION LINK: derive app URL from the incoming request origin ----
    // This is the CRITICAL fix: never rely on APP_URL env var for the frontend path.
    // The request comes from the frontend, so we can derive the correct origin from the Referer or Origin header.
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || Deno.env.get('APP_URL') || 'https://app.example.com';
    const appUrl = origin.replace(/\/$/, '');
    const activationLink = `${appUrl}/auth/activate?token=${encodeURIComponent(activationToken)}`;

    // Send activation email
    await base44.integrations.Core.SendEmail({
      to: request.email,
      subject: 'Your Reentry & Jobs Account Has Been Approved',
      body: buildActivationEmail(request, activationLink, final_role),
    });

    // Update OnboardingRequest status
    await base44.asServiceRole.entities.OnboardingRequest.update(request_id, {
      status: 'approved',
      approved_by: user.id,
      approved_date: new Date().toISOString(),
      linked_user_id: linkedUser?.id,
      linked_resident_id: linkedResidentId,
      final_assigned_role: final_role,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'onboarding_approved',
      entity_type: 'OnboardingRequest',
      entity_id: request_id,
      performed_by: user.email,
      details: `Approved ${request.email} as ${final_role}. Activation link sent.`,
    }).catch(() => {});

    return Response.json({
      success: true,
      user_account_id: userAccount.id,
      user_id: linkedUser?.id,
      resident_id: linkedResidentId,
      employer_id: linkedEmployerId,
      activation_link: activationLink,
      activation_token: activationToken,
    });
  } catch (error) {
    console.error('Approval error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildActivationEmail(request, activationLink, role) {
  return `
<h2>Welcome to REJ Pathways Hub!</h2>
<p>Your access request has been approved. Your account is ready to activate.</p>
<h3>Your Account</h3>
<p>
  <strong>Email:</strong> ${request.email}<br>
  <strong>Role:</strong> ${role.replace(/_/g, ' ')}<br>
</p>
<h3>Activate Your Account</h3>
<p><a href="${activationLink}" style="background:#1e3a5f;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:10px 0;">Click Here to Activate Your Account</a></p>
<p>Or copy this link: <code>${activationLink}</code></p>
<p>This activation link expires in 7 days. If it expires, contact your admin to resend a new one.</p>
`;
}