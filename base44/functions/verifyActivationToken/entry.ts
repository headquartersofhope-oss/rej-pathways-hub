import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { verify } from "https://deno.land/x/djwt@v2.2/mod.ts";

// Public endpoint: verifies a JWT activation token (no session auth required)
// Token is validated cryptographically — no admin-only logic here
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const { token } = await req.json();

        if (!token) {
            return new Response(JSON.stringify({ error: "token is required." }), { status: 400 });
        }

        // Read JWT_SECRET at runtime (never at module level)
        const JWT_SECRET = Deno.env.get('JWT_SECRET');
        if (!JWT_SECRET) {
            console.error('[verifyActivationToken] JWT_SECRET not configured');
            return new Response(JSON.stringify({ error: "System configuration error." }), { status: 500 });
        }

        // Verify JWT signature and expiration
        const payload = await verify(token, JWT_SECRET);

        // Find UserAccount by email using service role (public token flow — no user session)
        const userAccounts = await base44.asServiceRole.entities.UserAccount.filter({
            email: payload.email,
        });

        if (userAccounts.length === 0) {
            return new Response(JSON.stringify({ error: "User account not found." }), { status: 404 });
        }

        const userAccount = userAccounts[0];

        if (userAccount.status !== 'invited' && userAccount.status !== 'pending') {
            return new Response(JSON.stringify({ error: "This activation link has already been used or expired." }), { status: 400 });
        }

        // Return only safe fields needed for activation UI (no sensitive internals)
        return new Response(JSON.stringify({
            email: userAccount.email,
            app_role: userAccount.app_role,
            status: userAccount.status,
            id: userAccount.id,
        }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error('[verifyActivationToken] Error:', e.message);
        return new Response(JSON.stringify({ error: "Invalid or expired activation token." }), { status: 400 });
    }
});