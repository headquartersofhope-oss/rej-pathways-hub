import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Admin function: Backfill identity/contact fields from completed IntakeAssessment records into Resident records.
 * Only updates fields that are currently missing on the Resident record (non-destructive).
 * Syncs: first_name, last_name, preferred_name, email, phone, date_of_birth, pronouns, primary_language, gender, ssn_last4, emergency_contact_name, emergency_contact_phone
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
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get optional resident ID from request
    const body = await req.json().catch(() => ({}));
    const targetResidentId = body.residentId;

    let assessments;
    if (targetResidentId) {
      // Get assessment for specific resident - scoped lookup
      assessments = await base44.entities.IntakeAssessment.filter(
        { resident_id: targetResidentId, status: 'completed' },
        '-created_date',
        1
      );
    } else {
      // Get all completed assessments
      assessments = await base44.entities.IntakeAssessment.filter(
        { status: 'completed' },
        '-created_date',
        500
      );
    }

    const results = [];

    for (const assessment of assessments) {
      try {
        const resident = await base44.entities.Resident.get(assessment.resident_id);
        if (!resident) continue;

        const updates = {};
        let hasUpdates = false;

        // Only update fields that are currently empty on Resident
        if (assessment.personal?.first_name && !resident.first_name) {
          updates.first_name = assessment.personal.first_name;
          hasUpdates = true;
        }
        if (assessment.personal?.last_name && !resident.last_name) {
          updates.last_name = assessment.personal.last_name;
          hasUpdates = true;
        }
        if (assessment.personal?.preferred_name && !resident.preferred_name) {
          updates.preferred_name = assessment.personal.preferred_name;
          hasUpdates = true;
        }
        if (assessment.personal?.email && !resident.email) {
          updates.email = assessment.personal.email;
          hasUpdates = true;
        }
        if (assessment.personal?.phone && !resident.phone) {
          updates.phone = assessment.personal.phone;
          hasUpdates = true;
        }
        if (assessment.personal?.date_of_birth && !resident.date_of_birth) {
          updates.date_of_birth = assessment.personal.date_of_birth;
          hasUpdates = true;
        }
        if (assessment.personal?.pronouns && !resident.pronouns) {
          updates.pronouns = assessment.personal.pronouns;
          hasUpdates = true;
        }
        if (assessment.personal?.primary_language && !resident.primary_language) {
          updates.primary_language = assessment.personal.primary_language;
          hasUpdates = true;
        }
        if (assessment.personal?.gender_identity && !resident.gender) {
          // Normalize gender identity to resident gender enum
          const genderMap = {
            male: 'male',
            female: 'female',
            non_binary: 'non_binary',
            transgender_male: 'male',
            transgender_female: 'female',
            other: 'other',
            prefer_not_to_say: 'prefer_not_to_say'
          };
          updates.gender = genderMap[assessment.personal.gender_identity] || 'other';
          hasUpdates = true;
        }
        if (assessment.personal?.ssn_last4 && !resident.ssn_last4) {
          updates.ssn_last4 = assessment.personal.ssn_last4;
          hasUpdates = true;
        }
        if (assessment.emergency_contact?.name && !resident.emergency_contact_name) {
          updates.emergency_contact_name = assessment.emergency_contact.name;
          hasUpdates = true;
        }
        if (assessment.emergency_contact?.phone && !resident.emergency_contact_phone) {
          updates.emergency_contact_phone = assessment.emergency_contact.phone;
          hasUpdates = true;
        }

        if (hasUpdates) {
          await base44.entities.Resident.update(resident.id, updates);
          results.push({
            resident_id: resident.id,
            name: `${resident.first_name || 'Unknown'} ${resident.last_name || 'Unknown'}`,
            status: 'updated',
            fields_updated: Object.keys(updates)
          });
        } else {
          results.push({
            resident_id: resident.id,
            name: `${resident.first_name || 'Unknown'} ${resident.last_name || 'Unknown'}`,
            status: 'no_changes'
          });
        }
      } catch (error) {
        console.error(`Error processing resident ${assessment.resident_id}:`, error);
        results.push({
          resident_id: assessment.resident_id,
          status: 'error',
          error: error.message
        });
      }
    }

    return Response.json({
      total_assessments: assessments.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});