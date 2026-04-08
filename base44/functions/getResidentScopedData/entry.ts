/**
 * getResidentScopedData — Consolidated scoped read for a resident's own data.
 * Returns a summary payload for the resident dashboard and sub-pages.
 *
 * Auth rules:
 * - Must be authenticated as role=resident
 * - Returns only records linked to the authenticated user's resident record
 * - No cross-resident leakage possible
 *
 * Payload types (requested via body.type):
 *   dashboard    — full summary for the dashboard
 *   classes      — assigned/completed classes + progress
 *   certificates — earned certificates
 *   tasks        — visible tasks + next steps
 *   appointments — upcoming + past appointments
 *   jobs         — job matches (staff_approved only)
 *   supports     — active barrier items + linked tasks
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'resident') {
      return Response.json({ error: 'Forbidden: this endpoint is for residents only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type || 'dashboard';

    // Find resident record linked to this user
    const residents = await base44.asServiceRole.entities.Resident.filter({ user_id: user.id });
    const resident = residents[0];

    if (!resident) {
      // Resident account exists but profile not linked yet — safe 404
      return Response.json({ error: 'Resident profile not found. Contact your case manager.', code: 'NO_RESIDENT_PROFILE' }, { status: 404 });
    }

    const rid = resident.id;

    // Helper — safe resident profile (strip sensitive internal fields)
    const safeResident = {
      id: resident.id,
      global_resident_id: resident.global_resident_id,
      first_name: resident.first_name,
      last_name: resident.last_name,
      preferred_name: resident.preferred_name,
      status: resident.status,
      job_readiness_score: resident.job_readiness_score,
      missing_documents: resident.missing_documents || [],
      goals: resident.goals || [],
      // Intentionally excluded: ssn_last4, notes, risk_level, assigned_case_manager_id, barriers (raw), etc.
    };

    if (type === 'classes') {
      const [enrollments, assignments] = await Promise.all([
        base44.asServiceRole.entities.ClassEnrollment.filter({ resident_id: rid }),
        base44.asServiceRole.entities.LearningAssignment.filter({ resident_id: rid }),
      ]);
      return Response.json({ resident: safeResident, enrollments, assignments });
    }

    if (type === 'certificates') {
      const certs = await base44.asServiceRole.entities.Certificate.filter({ resident_id: rid });
      return Response.json({ resident: safeResident, certificates: certs });
    }

    if (type === 'tasks') {
      const tasks = await base44.asServiceRole.entities.ServiceTask.filter({ resident_id: rid, is_resident_visible: true });
      return Response.json({ resident: safeResident, tasks });
    }

    if (type === 'appointments') {
      const appointments = await base44.asServiceRole.entities.Appointment.filter({ resident_id: rid });
      return Response.json({ resident: safeResident, appointments });
    }

    if (type === 'jobs') {
      const matches = await base44.asServiceRole.entities.JobMatch.filter({ resident_id: rid, staff_approved: true });
      return Response.json({ resident: safeResident, job_matches: matches });
    }

    if (type === 'supports') {
      const [barriers, tasks] = await Promise.all([
        base44.asServiceRole.entities.BarrierItem.filter({ resident_id: rid }),
        base44.asServiceRole.entities.ServiceTask.filter({ resident_id: rid, is_resident_visible: true }),
      ]);
      return Response.json({ resident: safeResident, barriers, tasks });
    }

    // type === 'dashboard' — fetch all summary data
    const [enrollments, certificates, tasks, appointments, jobMatches] = await Promise.all([
      base44.asServiceRole.entities.ClassEnrollment.filter({ resident_id: rid }),
      base44.asServiceRole.entities.Certificate.filter({ resident_id: rid }),
      base44.asServiceRole.entities.ServiceTask.filter({ resident_id: rid, is_resident_visible: true }),
      base44.asServiceRole.entities.Appointment.filter({ resident_id: rid }),
      base44.asServiceRole.entities.JobMatch.filter({ resident_id: rid, staff_approved: true }),
    ]);

    return Response.json({
      resident: safeResident,
      enrollments,
      certificates,
      tasks,
      appointments,
      job_matches: jobMatches,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});