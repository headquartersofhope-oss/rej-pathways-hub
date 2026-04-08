import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { create } from "https://deno.land/x/djwt@v2.2/mod.ts";

const JWT_SECRET = Deno.env.get('JWT_SECRET');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for generating activation links. Set it in the application environment variables.');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admin can resend
        if (user?.role !== 'admin') {
            return Response.json(
                { error: 'Only admins can resend activation links' },
                { status: 403 }
            );
        }

        const { user_account_id } = await req.json();

        if (!user_account_id) {
            return Response.json(
                { error: 'user_account_id is required' },
                { status: 400 }
            );
        }

        // Fetch the user account
        const userAccount = await base44.asServiceRole.entities.UserAccount.get(user_account_id);

        if (!userAccount) {
            return Response.json({ error: 'User account not found' }, { status: 404 });
        }

        // Generate new JWT activation token (valid for 7 days)
        const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
        const activationToken = await create(
            { alg: "HS256", typ: "JWT" },
            {
                email: userAccount.email,
                role: userAccount.app_role,
                exp: expiresAt,
            },
            JWT_SECRET
        );

        // Update UserAccount with new token
        await base44.asServiceRole.entities.UserAccount.update(user_account_id, {
            status: 'invited',
            temporary_login_code: activationToken,
            temporary_code_expires: new Date(expiresAt * 1000).toISOString(),
            invitation_resent_count: (userAccount.invitation_resent_count || 0) + 1,
        });

        // Build activation link
        const activationLink = `${Deno.env.get('APP_URL') || 'https://app.example.com'}/auth/activate?token=${encodeURIComponent(activationToken)}`;

        // Send email
        await base44.integrations.Core.SendEmail({
            to: userAccount.email,
            subject: 'Activation Link - Reentry & Jobs',
            body: `
<h2>Account Activation</h2>

<p>Your activation link has been resent.</p>

<h3>Your Account</h3>
<p>
  <strong>Email:</strong> ${userAccount.email}<br>
  <strong>Role:</strong> ${userAccount.app_role.replace(/_/g, ' ')}<br>
</p>

<h3>Next Steps</h3>
<ol>
  <li><a href="${activationLink}">Click here to activate your account</a></li>
  <li>Create a secure password</li>
  <li>Start using the system</li>
</ol>

<p>This activation link will expire in 7 days.</p>
            `,
        });

        // Log the action
        await base44.asServiceRole.entities.AuditLog.create({
            event_type: 'activation_link_resent',
            user_id: user.id,
            details: `Resent activation link for ${userAccount.email}`,
        });

        return Response.json({
            success: true,
            message: 'Activation link resent successfully',
        });
    } catch (error) {
        console.error('Resend error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});