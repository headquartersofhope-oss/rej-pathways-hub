import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { meeting_title, host_user_id, scheduled_at, meeting_type, description, attendees, resident_id, employer_id } = body;

    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) return Response.json({ error: 'DAILY_API_KEY not configured' }, { status: 500 });

    const slug = (meeting_title || 'meeting').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
    const room_name = slug + '-' + Date.now();

    const scheduledDate = scheduled_at ? new Date(scheduled_at) : new Date();
    const expMs = scheduledDate.getTime() + 2 * 60 * 60 * 1000;
    const exp = Math.floor(expMs / 1000);

    const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + DAILY_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: room_name,
        privacy: 'public',
        properties: { exp, eject_at_room_exp: true, enable_chat: true }
      })
    });

    if (!dailyRes.ok) {
      const err = await dailyRes.text();
      return Response.json({ error: 'Daily.co error: ' + err }, { status: 500 });
    }

    const dailyRoom = await dailyRes.json();

    const meeting = await base44.asServiceRole.entities.VideoMeeting.create({
      title: meeting_title,
      host_id: host_user_id || user.id,
      host_name: user.full_name,
      meeting_type: meeting_type || 'staff_meeting',
      room_name,
      room_url: dailyRoom.url,
      scheduled_at: scheduledDate.toISOString(),
      duration_minutes: 60,
      status: 'scheduled',
      attendees: attendees || [],
      description: description || '',
      resident_id: resident_id || null,
      employer_id: employer_id || null,
      organization_id: user.data ? user.data.organization_id : null,
    });

    if (attendees && attendees.length > 0) {
      for (const attendee of attendees) {
        if (attendee.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: attendee.email,
            subject: 'You are invited: ' + meeting_title,
            body: 'Hello ' + (attendee.name || '') + ',\n\nYou have been invited to a video meeting.\n\nTitle: ' + meeting_title + '\nTime: ' + scheduledDate.toLocaleString() + '\nType: ' + (meeting_type || '').replace(/_/g, ' ') + '\n\nJoin here: ' + dailyRoom.url + '\n\nSee you there!\nPathways Hub Team'
          });
        }
      }
    }

    return Response.json({ success: true, meeting, room_url: dailyRoom.url, room_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});