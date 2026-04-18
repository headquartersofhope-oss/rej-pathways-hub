/**
 * systemAuditWrite — Production Hardening: Centralized Audit Log Writer
 *
 * Called from frontend or other backend functions to write
 * immutable audit entries. Normal users cannot edit AuditLog records
 * (enforced via entity RLS).
 *
 * POST {
 *   action,         // e.g. "resident_status_changed"
 *   entity_type,    // e.g. "Resident"
 *   entity_id,
 *   details,        // free text description
 *   severity,       // "info" | "warning" | "critical"
 *   old_value,      // optional
 *   new_value,      // optional
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, entity_type, entity_id, details, severity = 'info', old_value, new_value } = body;

    if (!action) return Response.json({ error: 'action is required' }, { status: 400 });
    if (!entity_type) return Response.json({ error: 'entity_type is required' }, { status: 400 });

    const validSeverities = ['info', 'warning', 'critical'];
    const safeSeverity = validSeverities.includes(severity) ? severity : 'info';

    const log = await base44.asServiceRole.entities.AuditLog.create({
      action,
      entity_type,
      entity_id: entity_id || '',
      user_id: user.id,
      user_email: user.email,
      details: details || '',
      severity: safeSeverity,
      old_value: old_value ? JSON.stringify(old_value).slice(0, 500) : '',
      new_value: new_value ? JSON.stringify(new_value).slice(0, 500) : '',
      organization_id: user.organization_id || '',
    });

    return Response.json({ success: true, log_id: log.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});