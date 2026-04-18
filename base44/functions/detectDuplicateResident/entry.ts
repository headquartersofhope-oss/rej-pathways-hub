/**
 * detectDuplicateResident — Week 3 Automation 4
 *
 * Two modes:
 *   1. Called directly from frontend BEFORE creating a resident (check mode)
 *      POST { mode: "check", candidate: { first_name, last_name, date_of_birth, phone, email } }
 *      Returns: { is_duplicate: bool, confidence: low/medium/high, matches: [...] }
 *
 *   2. Fires as entity automation on Resident create (flag mode)
 *      POST { event: { entity_id: ... }, data: { ... } }
 *      If duplicate suspected: creates admin review CaseNote and ServiceTask
 *      Does NOT merge or delete records silently
 *
 * Scoring:
 *   last_name match     = 1 pt
 *   first_name match    = 1 pt
 *   DOB match           = 2 pts
 *   phone match         = 2 pts
 *   email match         = 2 pts
 *
 *   Score >= 5 → high confidence duplicate
 *   Score >= 3 → medium confidence (possible)
 *   Score < 3  → no flag (single-field name collisions ignored)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalize(str) {
  return (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePhone(str) {
  return (str || '').toString().replace(/\D/g, '');
}

function scoreDuplicate(candidate, existing) {
  let score = 0;
  const reasons = [];

  const fn1 = normalize(candidate.first_name);
  const fn2 = normalize(existing.first_name);
  const ln1 = normalize(candidate.last_name);
  const ln2 = normalize(existing.last_name);

  if (ln1 && ln2 && ln1 === ln2) { score += 1; reasons.push('last_name'); }
  if (fn1 && fn2 && fn1 === fn2) { score += 1; reasons.push('first_name'); }

  const dob1 = (candidate.date_of_birth || '').toString().trim();
  const dob2 = (existing.date_of_birth || '').toString().trim();
  if (dob1 && dob2 && dob1 === dob2) { score += 2; reasons.push('date_of_birth'); }

  const ph1 = normalizePhone(candidate.phone);
  const ph2 = normalizePhone(existing.phone);
  if (ph1.length >= 7 && ph2.length >= 7 && ph1 === ph2) { score += 2; reasons.push('phone'); }

  const em1 = normalize(candidate.email);
  const em2 = normalize(existing.email);
  if (em1 && em2 && em1 === em2) { score += 2; reasons.push('email'); }

  return { score, reasons };
}

function confidenceLevel(score) {
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'none';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Determine mode: direct check vs entity automation
    const isEntityAutomation = !!body.event;
    const isCheckMode = body.mode === 'check';

    // ─────────────────────────────────────────────────────────────
    // MODE 1: Pre-creation check from frontend
    // ─────────────────────────────────────────────────────────────
    if (isCheckMode) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const candidate = body.candidate || {};
      if (!candidate.first_name && !candidate.last_name) {
        return Response.json({ error: 'candidate.first_name or last_name required' }, { status: 400 });
      }

      const allResidents = await base44.asServiceRole.entities.Resident.list();
      const matches = [];

      for (const existing of allResidents) {
        const { score, reasons } = scoreDuplicate(candidate, existing);
        const confidence = confidenceLevel(score);
        if (confidence !== 'none') {
          matches.push({
            resident_id: existing.id,
            global_resident_id: existing.global_resident_id || '',
            name: `${existing.first_name || ''} ${existing.last_name || ''}`.trim(),
            status: existing.status || '',
            organization_id: existing.organization_id || '',
            score,
            confidence,
            matching_fields: reasons,
          });
        }
      }

      matches.sort((a, b) => b.score - a.score);
      const topConfidence = matches.length > 0 ? matches[0].confidence : 'none';

      return Response.json({
        is_duplicate: matches.length > 0,
        confidence: topConfidence,
        match_count: matches.length,
        matches: matches.slice(0, 5), // max 5 results
      });
    }

    // ─────────────────────────────────────────────────────────────
    // MODE 2: Entity automation — fires after Resident created
    // ─────────────────────────────────────────────────────────────
    if (isEntityAutomation) {
      const { event } = body;
      const newResidentId = event?.entity_id;

      if (!newResidentId) {
        return Response.json({ error: 'Missing entity_id in event payload' }, { status: 400 });
      }

      // Fetch the newly created resident
      let newResident;
      try {
        newResident = await base44.asServiceRole.entities.Resident.get(newResidentId);
      } catch (e) {
        return Response.json({ skipped: true, reason: `Resident not found: ${newResidentId}` });
      }

      const orgId = newResident.organization_id || '';
      const globalResidentId = newResident.global_resident_id || '';
      const residentName = `${newResident.first_name || ''} ${newResident.last_name || ''}`.trim();

      // Fetch all OTHER residents to compare
      const allResidents = await base44.asServiceRole.entities.Resident.list();
      const otherResidents = allResidents.filter(r => r.id !== newResidentId);

      const matches = [];
      for (const existing of otherResidents) {
        const { score, reasons } = scoreDuplicate(newResident, existing);
        const confidence = confidenceLevel(score);
        if (confidence !== 'none') {
          matches.push({
            resident_id: existing.id,
            global_resident_id: existing.global_resident_id || '',
            name: `${existing.first_name || ''} ${existing.last_name || ''}`.trim(),
            status: existing.status || '',
            score,
            confidence,
            matching_fields: reasons,
          });
        }
      }

      if (matches.length === 0) {
        return Response.json({ skipped: true, reason: 'No duplicates detected', resident_id: newResidentId });
      }

      matches.sort((a, b) => b.score - a.score);
      const topMatch = matches[0];

      // Create admin-review ServiceTask (do NOT merge, do NOT delete)
      const reviewTaskTitle = `[DUPLICATE REVIEW] ${residentName} (${globalResidentId})`;
      let reviewTask = null;
      try {
        reviewTask = await base44.asServiceRole.entities.ServiceTask.create({
          resident_id: newResidentId,
          global_resident_id: globalResidentId,
          organization_id: orgId,
          title: reviewTaskTitle,
          description: `Possible duplicate participant detected. New record: ${globalResidentId} (${residentName}). Top match: ${topMatch.global_resident_id} (${topMatch.name}) — Confidence: ${topMatch.confidence}, Score: ${topMatch.score}/8, Matching fields: ${topMatch.matching_fields.join(', ')}. ${matches.length} potential match(es) found. Admin review required before record is used in case management.`,
          category: 'admin_review',
          status: 'pending',
          priority: topMatch.confidence === 'high' ? 'urgent' : 'high',
          is_resident_visible: false,
          requires_staff_action: true,
          due_date: new Date().toISOString().split('T')[0],
        });
      } catch (e) {
        console.warn(`[detectDuplicateResident] Review task creation failed: ${e.message}`);
      }

      // Write system CaseNote on new resident
      try {
        await base44.asServiceRole.entities.CaseNote.create({
          resident_id: newResidentId,
          global_resident_id: globalResidentId,
          organization_id: orgId,
          staff_id: 'system',
          staff_name: 'Pathways Automation',
          note_type: 'general',
          description: `[Auto][DUPLICATE WARNING] Possible duplicate detected on record creation. Top match: ${topMatch.name} (${topMatch.global_resident_id}), confidence: ${topMatch.confidence}. Admin must review and resolve. Task ID: ${reviewTask?.id || 'N/A'}.`,
          is_confidential: true,
        });
      } catch (e) {
        console.warn(`[detectDuplicateResident] CaseNote failed: ${e.message}`);
      }

      // Notify all admins via email
      const allUsers = await base44.asServiceRole.entities.User.list();
      const adminUsers = allUsers.filter(u => u.role === 'admin');
      for (const admin of adminUsers) {
        if (!admin.email) continue;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            from_name: 'Pathways Hub Data Quality',
            subject: `⚠️ Duplicate Participant Warning: ${residentName} (${globalResidentId})`,
            body: `<p><strong>Possible Duplicate Participant Detected</strong></p>
<p>A new resident record may be a duplicate of an existing participant. Admin review required.</p>
<ul>
<li><strong>New Record:</strong> ${residentName} (${globalResidentId})</li>
<li><strong>Top Match:</strong> ${topMatch.name} (${topMatch.global_resident_id})</li>
<li><strong>Confidence:</strong> ${topMatch.confidence}</li>
<li><strong>Matching Fields:</strong> ${topMatch.matching_fields.join(', ')}</li>
<li><strong>Total Matches Found:</strong> ${matches.length}</li>
</ul>
<p><strong>Do NOT merge records without a review. A review task has been created in Pathways Hub.</strong></p>`,
          });
        } catch (e) {
          console.warn(`[detectDuplicateResident] Admin email failed: ${e.message}`);
        }
      }

      return Response.json({
        success: true,
        duplicate_detected: true,
        new_resident_id: newResidentId,
        global_resident_id: globalResidentId,
        match_count: matches.length,
        top_match: topMatch,
        review_task_id: reviewTask?.id || null,
        admins_notified: adminUsers.length,
      });
    }

    return Response.json({ error: 'Invalid request: must include mode="check" or event payload' }, { status: 400 });

  } catch (error) {
    console.error('[detectDuplicateResident] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});