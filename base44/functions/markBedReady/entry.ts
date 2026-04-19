/**
 * markBedReady — Transitions a bed from "needs_cleaning" → "available"
 *
 * Auth pattern: authenticate → authorize → validate state → action → audit log
 *
 * Required roles: admin, staff (housing staff)
 * Required body: { bed_id }
 * Optional body: { notes }
 *
 * Flow:
 *   1. Authenticate user
 *   2. Authorize: admin or staff only
 *   3. Fetch bed, validate it is in "needs_cleaning" state
 *   4. Update bed status → "available"
 *   5. Recalculate House.occupied_beds
 *   6. Write AuditLog
 *   7. Create Notification records for case managers in same organization
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Authorize: only admin or staff (housing staff) ─────────────────────
    const allowedRoles = ['admin', 'user', 'staff', 'program_manager'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json(
        { error: 'Forbidden: housing staff or admin role required to mark a bed ready' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { bed_id, notes } = body;

    if (!bed_id) {
      return Response.json({ error: 'bed_id is required' }, { status: 400 });
    }

    // ── 3. Fetch bed and validate state ───────────────────────────────────────
    const bed = await base44.asServiceRole.entities.Bed.get(bed_id);
    if (!bed) {
      return Response.json({ error: 'Bed not found' }, { status: 404 });
    }

    if (bed.status !== 'needs_cleaning') {
      return Response.json(
        {
          error: `Bed is not in needs_cleaning state (current status: "${bed.status}"). Only needs_cleaning beds can be marked ready.`,
          current_status: bed.status,
        },
        { status: 409 }
      );
    }

    const markedAt = new Date().toISOString();

    // ── 4. Update bed status → available ─────────────────────────────────────
    await base44.asServiceRole.entities.Bed.update(bed_id, {
      status: 'available',
      notes: notes
        ? `${bed.notes ? bed.notes + ' | ' : ''}[Ready] ${notes} — cleared by ${user.full_name || user.email} on ${markedAt.split('T')[0]}`
        : bed.notes,
    });

    // ── 5. Recalculate House.occupied_beds ────────────────────────────────────
    if (bed.house_id) {
      const allBeds = await base44.asServiceRole.entities.Bed.filter({ house_id: bed.house_id });
      // Count occupied (needs_cleaning is NOT occupied — it's in turnover)
      const actualOccupied = allBeds.filter(b => b.id !== bed_id && b.status === 'occupied').length;
      await base44.asServiceRole.entities.House.update(bed.house_id, {
        occupied_beds: actualOccupied,
      });
    }

    // ── 6. Write AuditLog ─────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'bed_marked_ready',
      entity_type: 'Bed',
      entity_id: bed_id,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      details: `Bed "${bed.bed_label}" in "${bed.house_name}" marked ready (available) after cleaning by ${user.full_name || user.email}. Notes: ${notes || 'none'}`,
      severity: 'info',
      organization_id: bed.organization_id || '',
    }).catch(err => console.warn('[markBedReady] AuditLog write failed:', err.message));

    // ── 7. Notify case managers in same organization ───────────────────────────
    // Fetch all case managers in the organization
    let notifiedCount = 0;
    try {
      const orgId = bed.organization_id;
      if (orgId) {
        const caseManagers = await base44.asServiceRole.entities.User.filter({
          role: 'case_manager',
          organization_id: orgId,
        });

        await Promise.all(
          caseManagers.map(cm =>
            base44.asServiceRole.entities.Notification.create({
              user_id: cm.id,
              title: 'Bed Now Available',
              message: `Bed "${bed.bed_label}" at ${bed.house_name} has been cleaned and is now available for placement.`,
              type: 'housing',
              entity_type: 'Bed',
              entity_id: bed_id,
              is_read: false,
              created_at: markedAt,
            }).catch(() => {})
          )
        );
        notifiedCount = caseManagers.length;
      }
    } catch (notifyErr) {
      // Notification failure must not block the main operation
      console.warn('[markBedReady] Notification dispatch failed:', notifyErr.message);
    }

    return Response.json({
      success: true,
      bed_id,
      bed_label: bed.bed_label,
      house_name: bed.house_name,
      previous_status: 'needs_cleaning',
      new_status: 'available',
      marked_by: user.full_name || user.email,
      marked_at: markedAt,
      case_managers_notified: notifiedCount,
      message: `Bed "${bed.bed_label}" is now available for new placement`,
    });
  } catch (error) {
    console.error('[markBedReady] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});