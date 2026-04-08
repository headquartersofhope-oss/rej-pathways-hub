import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { verify } from "https://deno.land/x/djwt@v2.2/mod.ts";

const JWT_SECRET = Deno.env.get('JWT_SECRET');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for account activation. Set it in the application environment variables.');
}

Deno.serve(async (req) => {
    const { token, password } = await req.json();
    const base44 = createClientFromRequest(req);

    try {
        // Verify JWT and get payload
        const payload = await verify(token, JWT_SECRET);

        // Find UserAccount by email
        const userAccounts = await base44.asServiceRole.entities.UserAccount.filter({
            email: payload.email,
        });

        if (userAccounts.length === 0) {
            return new Response(JSON.stringify({ error: "User account not found." }), { status: 404 });
        }

        const userAccount = userAccounts[0];

        if (userAccount.status !== 'invited' && userAccount.status !== 'pending') {
            return new Response(JSON.stringify({ error: "Activation link is invalid or has already been used." }), { status: 400 });
        }

        // Update platform user password
        if (userAccount.user_id) {
            await base44.asServiceRole.auth.updateUser(userAccount.user_id, { password });
        }

        // Update UserAccount status
        await base44.asServiceRole.entities.UserAccount.update(userAccount.id, {
            status: 'active',
            activated_date: new Date().toISOString(),
            login_code_used: true,
            temporary_login_code: null,
            temporary_code_expires: null,
        });

        // Log the activation event
        if (userAccount.user_id) {
            await base44.asServiceRole.entities.AuditLog.create({
                event_type: 'user_activated',
                user_id: userAccount.user_id,
                details: `User ${userAccount.email} activated their account with role ${userAccount.app_role}.`,
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error('Activation error:', e);
        return new Response(JSON.stringify({ error: "Failed to activate account or invalid token." }), { status: 500 });
    }
});