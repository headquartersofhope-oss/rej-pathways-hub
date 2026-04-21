import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { meeting_id, notes } = await req.json();
    if (!meeting_id) return Response.json({ error: 'meeting_id required' }, { status: 400 });

    const updated = await base44.asServiceRole.entities.VideoMeeting.update(meeting_id, {
      status: 'completed',
      ended_at: new Date().toISOString(),
      notes: notes || undefined,
    });

    return Response.json({ success: true, meeting: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});