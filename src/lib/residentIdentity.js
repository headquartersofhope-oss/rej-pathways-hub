/**
 * REJ Pathways Hub — Global Resident Identity Architecture
 * =========================================================
 *
 * IDENTITY CONTRACT
 * -----------------
 * Every person in this system has ONE primary identity field:
 *
 *   Resident.global_resident_id  (e.g. "GRI-000042")
 *
 * This is the master person identifier used:
 *   - Across all modules within this app
 *   - Across all future connected apps (housing, nonprofit, donor CRM, compliance, reporting)
 *   - As the stable reference that never changes, regardless of which system creates a record
 *
 * RULE: One resident = one global_resident_id
 *
 * MODULE RECORD IDs
 * -----------------
 * Each module creates its own internal records with their own record IDs.
 * These are record IDs ONLY — they do NOT represent person identity.
 * Every module record MUST store global_resident_id as a linked reference.
 *
 * Current module record types:
 *   intake_record_id       → IntakeAssessment.id
 *   barrier_record_id      → BarrierItem.id
 *   service_plan_id        → ServicePlan.id
 *   service_task_id        → ServiceTask.id
 *   document_record_id     → Document.id
 *
 * Planned future module record types (reserved):
 *   case_note_id           → CaseNote.id           (Case Management module)
 *   appointment_id         → Appointment.id         (Scheduling module)
 *   class_enrollment_id    → ClassEnrollment.id     (Learning module)
 *   certificate_id         → Certificate.id         (Learning module)
 *   resume_record_id       → Resume.id              (Job Readiness module)
 *   interview_record_id    → Interview.id           (Job Matching module)
 *   application_id         → JobApplication.id      (Job Matching module)
 *   placement_id           → Placement.id           (Employer Portal module)
 *   retention_record_id    → RetentionRecord.id     (Employer Portal module)
 *   compliance_checkin_id  → ComplianceCheckin.id   (Compliance/GPS module)
 *
 * FUTURE SYSTEM EXPANSION
 * -----------------------
 * When connecting to external systems (housing, donor CRM, etc.), those systems
 * should store global_resident_id as their foreign key back to this identity record.
 * Do NOT create new identity fields in those systems. Use global_resident_id as the
 * single cross-system person identifier.
 */

/**
 * Generate a new global_resident_id.
 * Format: GRI-XXXXXX (zero-padded 6-digit sequence)
 *
 * Usage: call this when creating a new Resident record.
 * The sequence number should be derived from the total resident count + 1,
 * or from a dedicated counter to ensure uniqueness.
 *
 * @param {number} sequence - The next sequence number (e.g. total residents + 1)
 * @returns {string} e.g. "GRI-000001"
 */
export function generateGlobalResidentId(sequence) {
  const padded = String(sequence).padStart(6, '0');
  return `GRI-${padded}`;
}

/**
 * Validate that a string looks like a valid global_resident_id.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidGlobalResidentId(id) {
  return typeof id === 'string' && /^GRI-\d{6}$/.test(id);
}

/**
 * Build the standard module record identity block.
 * Every new module record should spread this into its create payload.
 *
 * @param {object} resident - The full Resident object
 * @returns {{ global_resident_id: string, resident_id: string }}
 */
export function residentIdentityBlock(resident) {
  return {
    global_resident_id: resident.global_resident_id || '',
    resident_id: resident.id,
  };
}