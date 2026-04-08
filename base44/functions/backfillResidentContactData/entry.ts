import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Backfill resident contact/profile fields from IntakeAssessment records.
 * For any resident with an intake_assessment but missing contact fields,
 * copy the values from the assessment to the Resident record.
 * 
 * ADMIN ONLY - must verify user.role === 'admin'
 * 
 * Returns: { processed: number, backfilled: number, errors: []}
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // RULE 1: Authenticate first
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RULE 2: Admin-only - backfill is system maintenance
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const errors = [];
    let processed = 0;
    let backfilled = 0;

    // RULE 3: Only use asServiceRole after auth + authz verified
    // Fetch all residents
    const residents = await base44.asServiceRole.entities.Resident.list();
    
    for (const resident of residents) {
      processed++;

      try {
        // Check if resident is missing key contact fields
        const hasMissingContactFields = !resident.email || !resident.phone || !resident.date_of_birth;
        if (!hasMissingContactFields) continue; // Skip if already complete

        // Find intake assessment for this resident
        const assessments = await base44.asServiceRole.entities.IntakeAssessment.filter({
          global_resident_id: resident.global_resident_id,
          status: 'completed',
        });

        if (assessments.length === 0) continue; // No intake to backfill from

        const assessment = assessments[0]; // Use most recent
        const updates = {};

        // Backfill missing contact fields
        if (!resident.email && assessment.personal?.email) {
          updates.email = assessment.personal.email;
        }
        if (!resident.phone && assessment.personal?.phone) {
          updates.phone = assessment.personal.phone;
        }
        if (!resident.date_of_birth && assessment.personal?.date_of_birth) {
          updates.date_of_birth = assessment.personal.date_of_birth;
        }

        // Backfill profile fields (overwrite if missing or default)
        if (!resident.pronouns && assessment.personal?.pronouns) {
          updates.pronouns = assessment.personal.pronouns;
        }
        if (!resident.gender && assessment.personal?.gender_identity) {
          updates.gender = assessment.personal.gender_identity;
        }
        if (!resident.primary_language && assessment.personal?.primary_language) {
          updates.primary_language = assessment.personal.primary_language;
        }

        // Backfill emergency contact
        if (!resident.emergency_contact_name && assessment.emergency_contact?.name) {
          updates.emergency_contact_name = assessment.emergency_contact.name;
        }
        if (!resident.emergency_contact_phone && assessment.emergency_contact?.phone) {
          updates.emergency_contact_phone = assessment.emergency_contact.phone;
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Resident.update(resident.id, updates);
          backfilled++;
        }
      } catch (err) {
        errors.push({
          resident_id: resident.id,
          error: err.message,
        });
      }
    }

    return Response.json({
      processed,
      backfilled,
      errors,
      message: `Backfilled ${backfilled}/${processed} residents`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});