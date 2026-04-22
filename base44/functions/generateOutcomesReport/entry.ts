import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { period_start, period_end } = body;

    if (!period_start || !period_end) {
      return Response.json({ error: 'period_start and period_end are required' }, { status: 400 });
    }

    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all data in parallel
    const [residents, housingPlacements, housingReferrals, learningAssignments, transportRides] = await Promise.all([
      base44.asServiceRole.entities.Resident.list(),
      base44.asServiceRole.entities.HousingPlacement.list(),
      base44.asServiceRole.entities.HousingReferral.list(),
      base44.asServiceRole.entities.LearningAssignment.list(),
      base44.asServiceRole.entities.TransportationRequest.list(),
    ]);

    // --- 1. Total clients served: residents created in period ---
    const clientsInPeriod = residents.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate;
    });
    const total_clients_served = clientsInPeriod.length;

    // --- 2. Clients housed: reached 'housing_pending', 'employed', or 'graduated' status ---
    const housedStatuses = ['housing_pending', 'employed', 'graduated', 'exited'];
    const clients_housed = residents.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate && housingPlacements.some(p =>
        p.resident_id === r.id && ['placed', 'approved', 'move_in_ready'].includes(p.placement_status)
      );
    }).length;

    // --- 3. Average days intake to housing ---
    const intakeToHousingDays = [];
    for (const resident of residents) {
      if (!resident.intake_date) continue;
      const placement = housingPlacements.find(p =>
        p.resident_id === resident.id && p.move_in_date
      );
      if (!placement) continue;
      const intake = new Date(resident.intake_date);
      const moveIn = new Date(placement.move_in_date);
      const days = (moveIn - intake) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 1000) intakeToHousingDays.push(days);
    }
    const average_days_intake_to_housing = intakeToHousingDays.length > 0
      ? Math.round((intakeToHousingDays.reduce((a, b) => a + b, 0) / intakeToHousingDays.length) * 10) / 10
      : 0;

    // --- 4. Employment placements in period ---
    const employment_placements = residents.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate && ['employed', 'graduated'].includes(r.status);
    }).length;

    // --- 5. 90-day employment retention ---
    // Residents who were employed and still active 90+ days later
    const ninetyDaysAgo = new Date(endDate);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const employment_90_day_retention = residents.filter(r => {
      const created = new Date(r.created_date);
      return created <= ninetyDaysAgo && ['employed', 'graduated'].includes(r.status);
    }).length;

    // --- 6. Life skills completions ---
    const completedAssignments = learningAssignments.filter(a => {
      const completed = a.completion_date ? new Date(a.completion_date) : null;
      return completed && completed >= startDate && completed <= endDate &&
        ['completed', 'passed'].includes(a.status);
    });
    const life_skills_classes_completed = completedAssignments.length;

    // --- 7. Average life skills completion rate ---
    const residentAssignmentMap = {};
    for (const a of learningAssignments) {
      if (!residentAssignmentMap[a.resident_id]) {
        residentAssignmentMap[a.resident_id] = { total: 0, completed: 0 };
      }
      residentAssignmentMap[a.resident_id].total++;
      if (['completed', 'passed'].includes(a.status)) {
        residentAssignmentMap[a.resident_id].completed++;
      }
    }
    const rates = Object.values(residentAssignmentMap)
      .filter(r => r.total > 0)
      .map(r => (r.completed / r.total) * 100);
    const average_life_skills_completion_rate = rates.length > 0
      ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
      : 0;

    // --- 8. Transport rides completed ---
    const transport_rides_completed = transportRides.filter(r => {
      const rideDate = new Date(r.requested_date);
      return rideDate >= startDate && rideDate <= endDate && r.status === 'completed';
    }).length;

    // --- 9. Transport barrier flags ---
    const transport_barrier_flags = residents.filter(r =>
      r.barriers && r.barriers.some(b =>
        b.toLowerCase().includes('transport')
      )
    ).length;

    // --- 10. Referrals submitted ---
    const referrals_submitted = housingReferrals.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate;
    }).length;

    // --- 11. Referrals approved ---
    const referrals_approved = housingReferrals.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate && r.status === 'approved';
    }).length;

    // --- 12. Average days referral to placement ---
    const referralToDays = [];
    for (const ref of housingReferrals) {
      if (!ref.submitted_date || !ref.decision_date) continue;
      const submitted = new Date(ref.submitted_date);
      const decision = new Date(ref.decision_date);
      const days = (decision - submitted) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 500) referralToDays.push(days);
    }
    const average_days_referral_to_placement = referralToDays.length > 0
      ? Math.round((referralToDays.reduce((a, b) => a + b, 0) / referralToDays.length) * 10) / 10
      : 0;

    // --- 13. Active residents at end of period ---
    const active_residents_end_of_period = residents.filter(r => {
      const created = new Date(r.created_date);
      return created <= endDate && r.status === 'active';
    }).length;

    // --- 14. Successful exits ---
    const exits_successful = residents.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate && r.status === 'graduated';
    }).length;

    // --- 15. Unsuccessful exits ---
    const exits_unsuccessful = residents.filter(r => {
      const created = new Date(r.created_date);
      return created >= startDate && created <= endDate && r.status === 'exited' && r.status !== 'graduated';
    }).length;

    const metrics = {
      total_clients_served,
      clients_housed,
      average_days_intake_to_housing,
      employment_placements,
      employment_90_day_retention,
      life_skills_classes_completed,
      average_life_skills_completion_rate,
      transport_rides_completed,
      transport_barrier_flags,
      referrals_submitted,
      referrals_approved,
      average_days_referral_to_placement,
      active_residents_end_of_period,
      exits_successful,
      exits_unsuccessful,
      recidivism_unknown: "Long-term recidivism tracking requires 6-12 month follow-up post-exit. Contact alumni coordinators for updated data."
    };

    return Response.json({ success: true, metrics, period_start, period_end });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});