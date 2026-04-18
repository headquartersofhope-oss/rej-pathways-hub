/**
 * generateResidentId — Atomic global_resident_id generator
 *
 * Runs server-side to eliminate the client-side race condition in nextGlobalResidentId().
 * Scans all existing Resident records, finds the highest RES-XXXXXX, and returns the next one.
 * Because this runs sequentially on the backend, concurrent UI submissions cannot collide.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only staff and admins can create residents
    if (!['admin', 'staff', 'case_manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all residents (service role to bypass RLS for accurate max scan)
    const residents = await base44.asServiceRole.entities.Resident.list();

    let max = 0;
    for (const r of residents) {
      if (r.global_resident_id && /^RES-\d{6}$/.test(r.global_resident_id)) {
        const n = parseInt(r.global_resident_id.slice(4), 10);
        if (n > max) max = n;
      }
    }

    const next = max + 1;
    const global_resident_id = `RES-${String(next).padStart(6, '0')}`;

    return Response.json({ global_resident_id, sequence: next });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});