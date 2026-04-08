import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { verify } from "https://deno.land/x/djwt@v2.2/mod.ts";

const JWT_SECRET = Deno.env.get('JWT_SECRET');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for activation token verification. Set it in the application environment variables.');
}

Deno.serve(async (req) => {
    const { token } = await req.json();
    const base44 = createClientFromRequest(req);

    try {
        // Verify JWT signature and expiration
        const payload = await verify(token, JWT_SECRET);

        // Find UserAccount by email and role (since we don't store user_account_id in token yet)
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

        // Token is valid, return user account data
        return new Response(JSON.stringify(userAccount), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid or expired activation token." }), { status: 400 });
    }
});