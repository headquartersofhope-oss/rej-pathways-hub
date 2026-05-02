/**
 * auditLog
 *
 * Helper function for SOC2-grade audit trail writes.
 * Wraps AuditLog.create with consistent fields + IP capture.
 *
 * Call from any other function:
 *   await base44.functions.invoke('auditLog', {
 *     action: 'resident_assigned_housing',
 *     entity_type: 'Resident',
 *     entity_id: 'res_123',
 *     details: 'Assigned to Hope House, Bed 2A',
 *     old_value: JSON.stringify({ status: 'pre_intake' }),
 *     new_value: JSON.stringify({ status: 'active' }),
 *     severity: 'info'  // info | warning | critical
 *   });
 *
 * Or from frontend:
 *   await base44.functions.invoke('auditLog', { action, entity_type, entity_id, details });
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      action,
      entity_type = '',
      entity_id = '',
      details = '',
      old_value = '',
      new_value = '',
      severity = 'info',
      organization_id = null,
    } = body;

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    // Capture user context if available
    let user_id = '';
    let user_email = '';
    try {
      const me = await base44.auth.me();
      user_id = me?.id || '';
      user_email = me?.email || '';
    } catch (_) {
      // Anonymous or system call — leave empty
    }

    // Capture IP
    const ipAddress =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      '';

    const log = await base44.asServiceRole.entities.AuditLog.create({
      action,
      entity_type,
      entity_id,
      details,
      old_value: typeof old_value === 'string' ? old_value : JSON.stringify(old_value),
      new_value: typeof new_value === 'string' ? new_value : JSON.stringify(new_value),
      severity,
      user_id,
      user_email,
      ip_address: ipAddress,
      organization_id,
    });

    return Response.json({ success: true, log_id: log.id });

  } catch (error) {
    console.error('[auditLog] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
