import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { create } from "https://deno.land/x/djwt@v2.2/mod.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const JWT_SECRET = Deno.env.get('JWT_SECRET');
    if (!JWT_SECRET) return Response.json({ error: 'System configuration error: JWT_SECRET not set' }, { status: 500 });

    const { user_account_id } = await req.json();
    if (!user_account_id) return Response.json({ error: 'user_account_id is required' }, { status: 400 });

    const userAccount = await base44.asServiceRole.entities.UserAccount.get(user_account_id);
    if (!userAccount) return Response.json({ error: 'User account not found' }, { status: 404 });

    // Generate new JWT token (7 days)
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const activationToken = await create(
      { alg: "HS256", typ: "JWT" },
      { email: userAccount.email, role: userAccount.app_role, exp: expiresAt },
      JWT_SECRET
    );

    // Update UserAccount with fresh token
    await base44.asServiceRole.entities.UserAccount.update(user_account_id, {
      status: 'invited',
      temporary_login_code: activationToken,
      temporary_code_expires: new Date(expiresAt * 1000).toISOString(),
      invitation_resent_count: (userAccount.invitation_resent_count || 0) + 1,
      invitation_sent_date: new Date().toISOString(),
    });

    // Derive app URL from request origin (same fix as approveOnboardingRequest)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || Deno.env.get('APP_URL') || 'https://app.example.com';
    const appUrl = origin.replace(/\/$/, '');
    const activationLink = `${appUrl}/auth/activate?token=${encodeURIComponent(activationToken)}`;

    // Send email
    await base44.integrations.Core.SendEmail({
      to: userAccount.email,
      subject: 'Your Activation Link — REJ Pathways Hub',
      body: `
<h2>Account Activation</h2>
<p>Your activation link has been resent.</p>
<p><strong>Email:</strong> ${userAccount.email}<br><strong>Role:</strong> ${userAccount.app_role?.replace(/_/g, ' ')}</p>
<p><a href="${activationLink}" style="background:#1e3a5f;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:10px 0;">Activate Your Account</a></p>
<p>Or copy this link: <code>${activationLink}</code></p>
<p>This link expires in 7 days.</p>
      `,
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'activation_link_resent',
      entity_type: 'UserAccount',
      entity_id: user_account_id,
      performed_by: user.email,
      details: `Resent activation link for ${userAccount.email}`,
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Activation link resent successfully',
      activation_link: activationLink,
    });
  } catch (error) {
    console.error('Resend error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});