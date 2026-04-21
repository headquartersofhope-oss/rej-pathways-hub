import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { room_name, display_name, is_owner } = await req.json();
    if (!room_name) return Response.json({ error: 'room_name required' }, { status: 400 });

    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) return Response.json({ error: 'DAILY_API_KEY not configured' }, { status: 500 });

    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name,
          user_name: display_name || user.full_name || 'Guest',
          is_owner: is_owner || false,
          enable_recording: is_owner || false,
        }
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return Response.json({ error: `Daily.co token error: ${err}` }, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const join_url = `https://pathways.daily.co/${room_name}?t=${tokenData.token}`;

    return Response.json({ token: tokenData.token, join_url, room_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});