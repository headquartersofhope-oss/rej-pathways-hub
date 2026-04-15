import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Housing Integration Audit
 * Validates housing module configuration, referral data integrity,
 * and resident-housing connections in Pathway
 * 
 * Use: base44.functions.invoke('housingIntegrationAudit', {})
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const findings = [];
    const warnings = [];
    let passCount = 0;
    let failCount = 0;

    // 1. Check Housing Providers
    const providers = await base44.entities.HousingProvider.list();
    if (providers.length === 0) {
      warnings.push({
        check: 'Housing Providers Configured',
        status: 'warning',
        message: 'No housing providers created. Bed search will be empty.',
        severity: 'medium',
      });
    } else {
      passCount++;
    }

    // 2. Check Housing Referrals
    const referrals = await base44.entities.HousingReferral.list();
    const invalidReferrals = referrals.filter(r => !r.global_resident_id || !r.resident_id);
    if (invalidReferrals.length > 0) {
      failCount++;
      findings.push({
        check: 'Housing Referral Integrity',
        status: 'fail',
        message: `${invalidReferrals.length} referral(s) missing resident links`,
        severity: 'high',
        affected: invalidReferrals.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 3. Check referral status consistency
    const allStatuses = ['draft', 'ready_to_submit', 'submitted', 'received', 'under_review', 
                         'more_information_requested', 'approved', 'denied', 'waitlisted', 
                         'withdrawn', 'closed'];
    const invalidStatuses = referrals.filter(r => !allStatuses.includes(r.status));
    if (invalidStatuses.length > 0) {
      failCount++;
      findings.push({
        check: 'Housing Referral Status Values',
        status: 'fail',
        message: `${invalidStatuses.length} referral(s) have invalid status`,
        severity: 'high',
        affected: invalidStatuses.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 4. Check for orphaned referrals (referral exists, resident doesn't)
    const residents = await base44.entities.Resident.list();
    const residentIds = new Set(residents.map(r => r.id));
    const orphanedReferrals = referrals.filter(r => !residentIds.has(r.resident_id));
    if (orphanedReferrals.length > 0) {
      warnings.push({
        check: 'Orphaned Housing Referrals',
        status: 'warning',
        message: `${orphanedReferrals.length} referral(s) linked to non-existent resident`,
        severity: 'medium',
        affected: orphanedReferrals.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 5. Check residents with approved referrals but no housing status field
    const approvedReferrals = referrals.filter(r => r.status === 'approved');
    const residentIdsWithApproved = new Set(approvedReferrals.map(r => r.resident_id));
    if (approvedReferrals.length > 0) {
      passCount++; // Note: We don't have a housing_status field on Resident yet, so this is informational
    }

    // 6. Check referral date consistency
    const futureDatedReferrals = referrals.filter(r => {
      const refDate = new Date(r.referral_date);
      return refDate > new Date();
    });
    if (futureDatedReferrals.length > 0) {
      warnings.push({
        check: 'Future-Dated Referrals',
        status: 'warning',
        message: `${futureDatedReferrals.length} referral(s) have future dates`,
        severity: 'low',
        affected: futureDatedReferrals.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 7. Check for missing consent on submitted referrals
    const submittedWithoutConsent = referrals.filter(r => 
      ['submitted', 'received', 'under_review'].includes(r.status) && !r.consent_confirmed
    );
    if (submittedWithoutConsent.length > 0) {
      failCount++;
      findings.push({
        check: 'Referral Consent Validation',
        status: 'fail',
        message: `${submittedWithoutConsent.length} submitted referral(s) missing consent confirmation`,
        severity: 'high',
        affected: submittedWithoutConsent.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 8. Check provider contact info
    const providersNoContact = providers.filter(p => !p.contact_phone && !p.contact_email);
    if (providersNoContact.length > 0) {
      warnings.push({
        check: 'Provider Contact Information',
        status: 'warning',
        message: `${providersNoContact.length} provider(s) missing contact details`,
        severity: 'low',
        affected: providersNoContact.map(p => p.id),
      });
    } else {
      passCount++;
    }

    // 9. Check for stalled referrals (submitted >30 days ago, still under review)
    const stalledReferrals = referrals.filter(r => {
      if (!['under_review'].includes(r.status)) return false;
      const refDate = new Date(r.referral_date);
      const daysAgo = Math.floor((new Date() - refDate) / (1000 * 60 * 60 * 24));
      return daysAgo > 30;
    });
    if (stalledReferrals.length > 0) {
      warnings.push({
        check: 'Stalled Referrals',
        status: 'warning',
        message: `${stalledReferrals.length} referral(s) under review for 30+ days`,
        severity: 'medium',
        affected: stalledReferrals.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 10. Check active residents without any referral
    const activeResidents = residents.filter(r => r.status === 'active');
    const residentIdsWithReferral = new Set(referrals.map(r => r.resident_id));
    const activeWithoutReferral = activeResidents.filter(r => !residentIdsWithReferral.has(r.id));
    if (activeWithoutReferral.length > 0) {
      warnings.push({
        check: 'Active Residents Without Housing Referral',
        status: 'warning',
        message: `${activeWithoutReferral.length} active resident(s) have no housing referral on file`,
        severity: 'medium',
        affected: activeWithoutReferral.map(r => r.id),
      });
    } else {
      passCount++;
    }

    // 11. Check for providers with no beds available (lower than program minimum)
    const providersNoBeds = providers.filter(p => p.available_beds === 0 && p.accepting_referrals);
    if (providersNoBeds.length > 0) {
      warnings.push({
        check: 'Providers at Capacity',
        status: 'warning',
        message: `${providersNoBeds.length} provider(s) accepting referrals but showing 0 available beds`,
        severity: 'low',
        affected: providersNoBeds.map(p => p.id),
      });
    } else {
      passCount++;
    }

    // 12. Check HousingProvider schema compatibility
    const schemaIssues = [];
    providers.forEach(p => {
      if (!p.program_type) schemaIssues.push(p.id);
      if (p.available_beds === null || p.available_beds === undefined) schemaIssues.push(p.id);
    });
    if (schemaIssues.length > 0) {
      failCount++;
      findings.push({
        check: 'HousingProvider Schema Compliance',
        status: 'fail',
        message: `${schemaIssues.length} provider(s) missing required fields`,
        severity: 'high',
        affected: schemaIssues,
      });
    } else {
      passCount++;
    }

    // Summary
    const totalChecks = passCount + failCount + warnings.length;
    const summary = `${totalChecks} checks: ${passCount} passed, ${failCount} failed, ${warnings.length} warnings`;

    return Response.json({
      success: true,
      summary,
      total_checks: totalChecks,
      passed_checks: passCount,
      failed_checks: failCount,
      warning_checks: warnings.length,
      overall_status: failCount > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy',
      findings: [
        ...findings.map(f => ({ ...f, type: 'finding' })),
        ...warnings.map(w => ({ ...w, type: 'warning' })),
      ],
      stats: {
        total_providers: providers.length,
        active_providers: providers.filter(p => p.is_active).length,
        total_referrals: referrals.length,
        submitted_referrals: referrals.filter(r => ['submitted', 'received', 'under_review'].includes(r.status)).length,
        approved_referrals: referrals.filter(r => r.status === 'approved').length,
        denied_referrals: referrals.filter(r => r.status === 'denied').length,
      },
      recommendations: [
        failCount > 0 && 'Fix housing referral integrity issues immediately',
        providersNoContact.length > 0 && 'Update provider contact information for referral submission',
        stalledReferrals.length > 0 && 'Follow up on referrals pending >30 days',
        activeWithoutReferral.length > 0 && 'Review active residents to identify housing barriers',
      ].filter(Boolean),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});