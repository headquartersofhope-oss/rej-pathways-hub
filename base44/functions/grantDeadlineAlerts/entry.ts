/**
 * grantDeadlineAlerts — Week 3 Automation 2
 *
 * Runs daily. Finds active grants with deadlines within 14 days and creates
 * notifications for grant managers/admins with escalating urgency.
 *
 * Alert windows:
 *   14 days  → priority: medium
 *    7 days  → priority: high
 *    3 days  → priority: urgent
 *
 * Tracks last_alerted_date in grant notes to prevent same-day duplicate alerts.
 * Checks both application_deadline and next_report_due_date.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function priorityForDays(days) {
  if (days <= 3)  return 'urgent';
  if (days <= 7)  return 'high';
  if (days <= 14) return 'medium';
  return null;
}

function alertWindowLabel(days) {
  if (days <= 0)  return 'OVERDUE';
  if (days <= 3)  return '3-day warning';
  if (days <= 7)  return '7-day warning';
  return '14-day warning';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is a scheduled function — use service role only
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch all active grants (not closed/denied)
    const allGrants = await base44.asServiceRole.entities.Grant.list();
    const activeGrants = allGrants.filter(g =>
      g.status && !['closed', 'denied', 'prospect'].includes(g.status)
    );

    // Fetch all users for admin + grant manager targeting
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    const alertsSent = [];
    const skipped = [];

    for (const grant of activeGrants) {
      const grantId = grant.id;
      const grantName = grant.grant_name || 'Unnamed Grant';
      const orgId = grant.organization_id || '';
      const grantManagerId = grant.grant_manager_id || null;

      // Parse last_alerted_date from notes field (stored as JSON marker)
      const notesRaw = grant.notes || '';
      const alertMarkerMatch = notesRaw.match(/\[ALERT_DATE:(\d{4}-\d{2}-\d{2})\]/);
      const lastAlertedDate = alertMarkerMatch ? alertMarkerMatch[1] : null;

      // Skip if already alerted today
      if (lastAlertedDate === todayStr) {
        skipped.push({ grant_id: grantId, grant_name: grantName, reason: 'already_alerted_today' });
        continue;
      }

      // Collect deadlines to check: application_deadline and next_report_due_date
      const deadlines = [];
      if (grant.application_deadline) {
        deadlines.push({ date: grant.application_deadline, type: 'application_deadline' });
      }
      if (grant.next_report_due_date) {
        deadlines.push({ date: grant.next_report_due_date, type: 'reporting_deadline' });
      }
      if (grant.report_due_date && grant.report_due_date !== grant.next_report_due_date) {
        deadlines.push({ date: grant.report_due_date, type: 'report_due' });
      }

      // Find the most urgent deadline within 14 days
      let triggeredDeadlines = [];
      for (const dl of deadlines) {
        const days = daysUntil(dl.date);
        if (days === null) continue;
        const priority = priorityForDays(days);
        if (priority !== null) {
          triggeredDeadlines.push({ ...dl, days, priority });
        }
      }

      if (triggeredDeadlines.length === 0) {
        skipped.push({ grant_id: grantId, grant_name: grantName, reason: 'no_deadlines_within_14_days' });
        continue;
      }

      // Pick the most urgent deadline for this grant (lowest days remaining)
      triggeredDeadlines.sort((a, b) => a.days - b.days);
      const primary = triggeredDeadlines[0];

      // Build notification target set
      const notifySet = new Map();
      for (const admin of adminUsers) {
        notifySet.set(admin.id, { user: admin, reason: 'admin' });
      }
      if (grantManagerId) {
        const gm = allUsers.find(u => u.id === grantManagerId);
        if (gm && !notifySet.has(gm.id)) {
          notifySet.set(gm.id, { user: gm, reason: 'grant_manager' });
        }
      }

      const deadlineLabel = primary.type === 'application_deadline' ? 'Application Deadline'
        : primary.type === 'reporting_deadline' ? 'Report Due'
        : 'Report Due Date';

      const urgencyLabel = alertWindowLabel(primary.days);
      const daysText = primary.days <= 0 ? `OVERDUE by ${Math.abs(primary.days)} day(s)`
        : `${primary.days} day(s) remaining`;

      // Send email notifications
      const grantAlerts = [];
      for (const [, { user, reason }] of notifySet) {
        if (!user.email) continue;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            from_name: 'Pathways Hub Grants',
            subject: `⚠️ Grant Deadline Alert [${urgencyLabel}]: ${grantName}`,
            body: `<p><strong>Grant Deadline Alert — ${urgencyLabel}</strong></p>
<p>A grant deadline requires your attention.</p>
<ul>
<li><strong>Grant:</strong> ${grantName}</li>
<li><strong>Deadline Type:</strong> ${deadlineLabel}</li>
<li><strong>Due Date:</strong> ${primary.date}</li>
<li><strong>Status:</strong> ${daysText}</li>
${triggeredDeadlines.length > 1 ? `<li><strong>Note:</strong> ${triggeredDeadlines.length} deadlines approaching for this grant</li>` : ''}
</ul>
<p>Please log in to Pathways Hub to review and take action.</p>`,
          });
          grantAlerts.push({ user_id: user.id, email: user.email, reason });
        } catch (e) {
          console.warn(`[grantDeadlineAlerts] Email failed for user ${user.id}: ${e.message}`);
        }
      }

      // Update grant notes to stamp today's alert date (idempotency marker)
      try {
        const updatedNotes = lastAlertedDate
          ? notesRaw.replace(/\[ALERT_DATE:\d{4}-\d{2}-\d{2}\]/, `[ALERT_DATE:${todayStr}]`)
          : notesRaw + `\n[ALERT_DATE:${todayStr}]`;
        await base44.asServiceRole.entities.Grant.update(grantId, { notes: updatedNotes.trim() });
      } catch (e) {
        console.warn(`[grantDeadlineAlerts] Could not stamp alert date on grant ${grantId}: ${e.message}`);
      }

      alertsSent.push({
        grant_id: grantId,
        grant_name: grantName,
        deadline_type: primary.type,
        deadline_date: primary.date,
        days_remaining: primary.days,
        priority: primary.priority,
        notifications_sent: grantAlerts.length,
        all_triggered_deadlines: triggeredDeadlines.map(d => ({ type: d.type, date: d.date, days: d.days })),
      });
    }

    return Response.json({
      success: true,
      run_date: todayStr,
      grants_checked: activeGrants.length,
      alerts_sent: alertsSent.length,
      skipped: skipped.length,
      detail: alertsSent,
      skipped_detail: skipped,
    });

  } catch (error) {
    console.error('[grantDeadlineAlerts] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});