/**
 * runSystemAudit — Admin-only. Runs structured checks across the app,
 * stores results in AuditRun + AuditFinding entities, returns a full report.
 *
 * Supported audit_type values:
 *   quick_health | full_system | role_permission | onboarding_activation
 *   data_integrity | module_communication | learning_pathway | housing_employer
 *   reporting_consistency
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const { audit_type = 'full_system' } = await req.json();

    // Create the run record
    const run = await base44.asServiceRole.entities.AuditRun.create({
      audit_type,
      started_at: new Date().toISOString(),
      run_by: user.email,
      overall_status: 'running',
      total_checks: 0,
      passed_checks: 0,
      failed_checks: 0,
      warning_checks: 0,
      skipped_checks: 0,
    });

    const findings = [];
    const addFinding = (f) => findings.push({ ...f, audit_run_id: run.id });

    // ── Helper: safe entity list ──────────────────────────────────────────
    const safeList = async (entity, filter, limit = 200) => {
      try {
        if (filter) return await base44.asServiceRole.entities[entity].filter(filter);
        return await base44.asServiceRole.entities[entity].list('-created_date', limit);
      } catch (e) {
        return null; // null = entity unreachable
      }
    };

    // ── CHECKS ────────────────────────────────────────────────────────────

    const runQuickHealth = async () => {
      const entities = [
        'Resident', 'OnboardingRequest', 'UserAccount', 'CaseNote',
        'ServicePlan', 'LearningClass', 'LearningAssignment', 'BarrierItem',
        'HousingReferral', 'HousingProvider', 'AuditLog', 'Employer', 'JobListing',
      ];
      for (const e of entities) {
        const data = await safeList(e, null, 1);
        addFinding({
          module_name: 'System Health',
          check_name: `Entity Reachable: ${e}`,
          severity: data === null ? 'critical' : 'info',
          status: data === null ? 'failed' : 'passed',
          issue_code: data === null ? 'ENTITY_UNREACHABLE' : null,
          issue_summary: data === null ? `Entity ${e} could not be queried` : `${e} is readable`,
          recommended_fix: data === null ? `Check RLS rules and entity schema for ${e}` : null,
        });
      }

      // Check AuditRun / AuditFinding entities exist
      for (const e of ['AuditRun', 'AuditFinding']) {
        const d = await safeList(e, null, 1);
        addFinding({
          module_name: 'Audit System',
          check_name: `Audit Entity: ${e}`,
          severity: d === null ? 'high' : 'info',
          status: d === null ? 'failed' : 'passed',
          issue_summary: d === null ? `${e} entity not available` : `${e} entity ready`,
        });
      }
    };

    const runOnboardingActivation = async () => {
      const requests = await safeList('OnboardingRequest', null, 100);
      if (requests === null) {
        addFinding({ module_name: 'Onboarding', check_name: 'OnboardingRequest readable', severity: 'critical', status: 'failed', issue_summary: 'Cannot read OnboardingRequest entity' });
        return;
      }

      const pending = requests.filter(r => r.status === 'pending');
      addFinding({
        module_name: 'Onboarding',
        check_name: 'Pending Onboarding Requests',
        severity: pending.length > 5 ? 'high' : pending.length > 0 ? 'medium' : 'info',
        status: pending.length > 5 ? 'warning' : 'passed',
        issue_summary: `${pending.length} pending onboarding requests`,
        recommended_fix: pending.length > 0 ? 'Review and approve/reject pending requests in the Onboarding Queue' : null,
      });

      const accounts = await safeList('UserAccount', null, 200);
      if (accounts === null) {
        addFinding({ module_name: 'Onboarding', check_name: 'UserAccount readable', severity: 'critical', status: 'failed', issue_summary: 'Cannot read UserAccount entity' });
        return;
      }

      const invited = accounts.filter(a => a.status === 'invited');
      const now = new Date();
      const expired = invited.filter(a => a.temporary_code_expires && new Date(a.temporary_code_expires) < now);
      const missingToken = invited.filter(a => !a.temporary_login_code);

      addFinding({
        module_name: 'Onboarding',
        check_name: 'Pending Activations',
        severity: invited.length > 10 ? 'medium' : 'info',
        status: invited.length > 0 ? 'warning' : 'passed',
        issue_summary: `${invited.length} accounts in 'invited' state (not yet activated)`,
        recommended_fix: invited.length > 0 ? 'Use Queue Center → resend activation links as needed' : null,
      });

      if (expired.length > 0) {
        addFinding({
          module_name: 'Onboarding',
          check_name: 'Expired Activation Tokens',
          severity: 'high',
          status: 'failed',
          issue_code: 'EXPIRED_TOKENS',
          issue_summary: `${expired.length} activation token(s) are expired`,
          technical_details: expired.map(a => a.email).join(', '),
          recommended_fix: 'Go to Queue Center and use Resend Activation Link for each expired account',
        });
      } else {
        addFinding({ module_name: 'Onboarding', check_name: 'Expired Activation Tokens', severity: 'info', status: 'passed', issue_summary: 'No expired tokens found' });
      }

      if (missingToken.length > 0) {
        addFinding({
          module_name: 'Onboarding',
          check_name: 'Missing Activation Tokens',
          severity: 'critical',
          status: 'failed',
          issue_code: 'MISSING_TOKEN',
          issue_summary: `${missingToken.length} invited account(s) have no activation token`,
          technical_details: missingToken.map(a => a.email).join(', '),
          recommended_fix: 'Use Resend Activation Link for each affected account to generate a valid token',
        });
      } else {
        addFinding({ module_name: 'Onboarding', check_name: 'Missing Activation Tokens', severity: 'info', status: 'passed', issue_summary: 'All invited accounts have tokens' });
      }

      const orphanedAccounts = accounts.filter(a => a.app_role === 'resident' && !a.linked_resident_id);
      if (orphanedAccounts.length > 0) {
        addFinding({
          module_name: 'Onboarding',
          check_name: 'Resident Accounts Without Resident Record',
          severity: 'high',
          status: 'warning',
          issue_code: 'ORPHANED_RESIDENT_ACCOUNT',
          issue_summary: `${orphanedAccounts.length} resident account(s) not linked to a Resident record`,
          technical_details: orphanedAccounts.map(a => a.email).join(', '),
          recommended_fix: 'Run the backfill function or manually link UserAccount.linked_resident_id to the correct Resident.id',
        });
      } else {
        addFinding({ module_name: 'Onboarding', check_name: 'Resident Accounts Without Resident Record', severity: 'info', status: 'passed', issue_summary: 'All resident accounts linked' });
      }
    };

    const runDataIntegrity = async () => {
      const residents = await safeList('Resident', null, 500);
      if (residents === null) {
        addFinding({ module_name: 'Data Integrity', check_name: 'Resident records readable', severity: 'critical', status: 'failed', issue_summary: 'Cannot read Resident entity' });
        return;
      }

      const noGRI = residents.filter(r => !r.global_resident_id);
      addFinding({
        module_name: 'Data Integrity',
        check_name: 'Residents Missing global_resident_id',
        severity: noGRI.length > 0 ? 'high' : 'info',
        status: noGRI.length > 0 ? 'failed' : 'passed',
        issue_code: noGRI.length > 0 ? 'MISSING_GRI' : null,
        issue_summary: noGRI.length > 0 ? `${noGRI.length} resident(s) missing global_resident_id` : 'All residents have global_resident_id',
        technical_details: noGRI.length > 0 ? `IDs: ${noGRI.map(r => r.id).slice(0, 10).join(', ')}` : null,
        recommended_fix: noGRI.length > 0 ? 'Run the backfillIntakeToResident or idIntegrityScan function to assign global IDs' : null,
      });

      const noOrg = residents.filter(r => !r.organization_id);
      addFinding({
        module_name: 'Data Integrity',
        check_name: 'Residents Missing organization_id',
        severity: noOrg.length > 0 ? 'medium' : 'info',
        status: noOrg.length > 0 ? 'warning' : 'passed',
        issue_summary: noOrg.length > 0 ? `${noOrg.length} resident(s) missing organization_id` : 'All residents have organization_id',
        recommended_fix: noOrg.length > 0 ? 'Update resident records with the correct organization_id' : null,
      });

      // Barriers
      const barriers = await safeList('BarrierItem', null, 500);
      if (barriers !== null) {
        const orphanedBarriers = barriers.filter(b => !b.resident_id || !b.global_resident_id);
        addFinding({
          module_name: 'Data Integrity',
          check_name: 'Orphaned BarrierItems',
          severity: orphanedBarriers.length > 0 ? 'medium' : 'info',
          status: orphanedBarriers.length > 0 ? 'warning' : 'passed',
          issue_summary: orphanedBarriers.length > 0 ? `${orphanedBarriers.length} barrier item(s) missing resident link` : 'All barrier items linked',
          recommended_fix: orphanedBarriers.length > 0 ? 'Review orphaned barrier items and link to correct resident' : null,
        });
      }

      // Assessments
      const assessments = await safeList('IntakeAssessment', null, 200);
      if (assessments !== null) {
        const unlinked = assessments.filter(a => !a.resident_id);
        addFinding({
          module_name: 'Data Integrity',
          check_name: 'IntakeAssessment → Resident linkage',
          severity: unlinked.length > 0 ? 'high' : 'info',
          status: unlinked.length > 0 ? 'warning' : 'passed',
          issue_summary: unlinked.length > 0 ? `${unlinked.length} assessment(s) not linked to resident` : 'All assessments linked',
          recommended_fix: unlinked.length > 0 ? 'Run backfill function or manually link assessments to resident records' : null,
        });
      }

      // Case notes
      const caseNotes = await safeList('CaseNote', null, 200);
      if (caseNotes !== null) {
        const missingOrg = caseNotes.filter(n => !n.organization_id);
        addFinding({
          module_name: 'Data Integrity',
          check_name: 'CaseNote → organization_id',
          severity: missingOrg.length > 0 ? 'medium' : 'info',
          status: missingOrg.length > 0 ? 'warning' : 'passed',
          issue_summary: missingOrg.length > 0 ? `${missingOrg.length} case note(s) missing organization_id (may cause cross-org leakage)` : 'All case notes have organization_id',
          recommended_fix: missingOrg.length > 0 ? 'Backfill organization_id on case notes to ensure org isolation' : null,
        });
      }

      // Housing Referrals
      const referrals = await safeList('HousingReferral', null, 200);
      if (referrals !== null) {
        const noConsent = referrals.filter(r => r.status !== 'draft' && !r.consent_confirmed);
        addFinding({
          module_name: 'Data Integrity',
          check_name: 'Submitted Referrals Without Consent',
          severity: noConsent.length > 0 ? 'high' : 'info',
          status: noConsent.length > 0 ? 'failed' : 'passed',
          issue_code: noConsent.length > 0 ? 'REFERRAL_NO_CONSENT' : null,
          issue_summary: noConsent.length > 0 ? `${noConsent.length} non-draft referral(s) have no consent flag` : 'All active referrals have consent confirmed',
          recommended_fix: noConsent.length > 0 ? 'Review referral records and confirm consent before further processing' : null,
        });
      }
    };

    const runModuleCommunication = async () => {
      // Learning → Assignments
      const classes = await safeList('LearningClass', null, 100);
      const assignments = await safeList('LearningAssignment', null, 500);
      if (classes !== null && assignments !== null) {
        const classIds = new Set(classes.map(c => c.id));
        const orphanedAssignments = assignments.filter(a => a.class_id && !classIds.has(a.class_id));
        addFinding({
          module_name: 'Module Communication',
          check_name: 'LearningAssignment → LearningClass linkage',
          severity: orphanedAssignments.length > 0 ? 'high' : 'info',
          status: orphanedAssignments.length > 0 ? 'failed' : 'passed',
          issue_code: orphanedAssignments.length > 0 ? 'ORPHANED_ASSIGNMENT' : null,
          issue_summary: orphanedAssignments.length > 0
            ? `${orphanedAssignments.length} assignment(s) reference non-existent class IDs`
            : `All ${assignments.length} assignments reference valid classes`,
          recommended_fix: orphanedAssignments.length > 0 ? 'Delete or re-link orphaned assignments to valid LearningClass records' : null,
        });

        const completedNoDate = assignments.filter(a => a.status === 'completed' && !a.completion_date);
        addFinding({
          module_name: 'Module Communication',
          check_name: 'Completed Assignments Missing Completion Date',
          severity: completedNoDate.length > 0 ? 'medium' : 'info',
          status: completedNoDate.length > 0 ? 'warning' : 'passed',
          issue_summary: completedNoDate.length > 0 ? `${completedNoDate.length} completed assignment(s) missing completion_date` : 'All completions have dates',
          recommended_fix: completedNoDate.length > 0 ? 'Backfill completion_date on completed assignments' : null,
        });
      }

      // Certificate paths → classes
      const certPaths = await safeList('CertificatePath', null, 50);
      if (certPaths !== null && classes !== null) {
        const classIds = new Set(classes.map(c => c.id));
        const brokenPaths = certPaths.filter(cp => cp.required_class_ids?.some(id => !classIds.has(id)));
        addFinding({
          module_name: 'Module Communication',
          check_name: 'CertificatePath → LearningClass integrity',
          severity: brokenPaths.length > 0 ? 'high' : 'info',
          status: brokenPaths.length > 0 ? 'failed' : 'passed',
          issue_code: brokenPaths.length > 0 ? 'BROKEN_CERT_PATH' : null,
          issue_summary: brokenPaths.length > 0 ? `${brokenPaths.length} certificate path(s) reference deleted classes` : 'All certificate paths have valid class references',
          recommended_fix: brokenPaths.length > 0 ? 'Update CertificatePath.required_class_ids to reference existing LearningClass records' : null,
        });
      }

      // Job Listings → Employers
      const jobListings = await safeList('JobListing', null, 200);
      const employers = await safeList('Employer', null, 200);
      if (jobListings !== null && employers !== null) {
        const employerIds = new Set(employers.map(e => e.id));
        const noEmployer = jobListings.filter(j => j.employer_id && !employerIds.has(j.employer_id));
        addFinding({
          module_name: 'Module Communication',
          check_name: 'JobListing → Employer linkage',
          severity: noEmployer.length > 0 ? 'medium' : 'info',
          status: noEmployer.length > 0 ? 'warning' : 'passed',
          issue_summary: noEmployer.length > 0 ? `${noEmployer.length} job listing(s) reference non-existent employer records` : `All ${jobListings.length} job listings have valid employer links`,
          recommended_fix: noEmployer.length > 0 ? 'Review orphaned job listings and link to correct employer or remove' : null,
        });
      }

      // JobMatch → Residents
      const jobMatches = await safeList('JobMatch', null, 200);
      const residents = await safeList('Resident', null, 500);
      if (jobMatches !== null && residents !== null) {
        const residentIds = new Set(residents.map(r => r.id));
        const orphanedMatches = jobMatches.filter(m => !residentIds.has(m.resident_id));
        addFinding({
          module_name: 'Module Communication',
          check_name: 'JobMatch → Resident linkage',
          severity: orphanedMatches.length > 0 ? 'medium' : 'info',
          status: orphanedMatches.length > 0 ? 'warning' : 'passed',
          issue_summary: orphanedMatches.length > 0 ? `${orphanedMatches.length} job match(es) reference non-existent residents` : 'All job matches linked to valid residents',
          recommended_fix: orphanedMatches.length > 0 ? 'Review and clean up orphaned job match records' : null,
        });
      }

      // Service plans
      const servicePlans = await safeList('ServicePlan', null, 200);
      if (servicePlans !== null && residents !== null) {
        const residentIds = new Set(residents.map(r => r.id));
        const orphanedPlans = servicePlans.filter(p => p.resident_id && !residentIds.has(p.resident_id));
        addFinding({
          module_name: 'Module Communication',
          check_name: 'ServicePlan → Resident linkage',
          severity: orphanedPlans.length > 0 ? 'medium' : 'info',
          status: orphanedPlans.length > 0 ? 'warning' : 'passed',
          issue_summary: orphanedPlans.length > 0 ? `${orphanedPlans.length} service plan(s) with missing resident link` : 'All service plans linked',
          recommended_fix: orphanedPlans.length > 0 ? 'Review and clean up orphaned service plan records' : null,
        });
      }
    };

    const runPermissions = async () => {
      // UserAccount role validity
      const accounts = await safeList('UserAccount', null, 200);
      const validRoles = ['admin', 'case_manager', 'staff', 'probation_officer', 'employer', 'partner', 'resident'];
      if (accounts !== null) {
        const invalidRoles = accounts.filter(a => a.app_role && !validRoles.includes(a.app_role));
        addFinding({
          module_name: 'Role & Permissions',
          check_name: 'UserAccount role validity',
          severity: invalidRoles.length > 0 ? 'high' : 'info',
          status: invalidRoles.length > 0 ? 'failed' : 'passed',
          issue_code: invalidRoles.length > 0 ? 'INVALID_ROLE' : null,
          issue_summary: invalidRoles.length > 0 ? `${invalidRoles.length} account(s) have invalid role values` : 'All account roles are valid',
          technical_details: invalidRoles.length > 0 ? invalidRoles.map(a => `${a.email}: ${a.app_role}`).join(', ') : null,
          recommended_fix: invalidRoles.length > 0 ? 'Update invalid role values to one of: ' + validRoles.join(', ') : null,
        });

        const deactivated = accounts.filter(a => a.status === 'deactivated' || a.status === 'suspended');
        addFinding({
          module_name: 'Role & Permissions',
          check_name: 'Suspended/Deactivated Accounts',
          severity: deactivated.length > 0 ? 'low' : 'info',
          status: deactivated.length > 0 ? 'warning' : 'passed',
          issue_summary: deactivated.length > 0 ? `${deactivated.length} account(s) are suspended or deactivated` : 'No suspended accounts',
        });

        // Residents without assigned case manager
        const residents = await safeList('Resident', null, 500);
        if (residents !== null) {
          const activeResidents = residents.filter(r => r.status === 'active' || r.status === 'employed');
          const unassigned = activeResidents.filter(r => !r.assigned_case_manager_id);
          addFinding({
            module_name: 'Role & Permissions',
            check_name: 'Active Residents Without Case Manager',
            severity: unassigned.length > 0 ? 'medium' : 'info',
            status: unassigned.length > 0 ? 'warning' : 'passed',
            issue_summary: unassigned.length > 0 ? `${unassigned.length} active resident(s) have no assigned case manager` : 'All active residents have case managers assigned',
            recommended_fix: unassigned.length > 0 ? 'Assign a case manager to each active resident via the Resident profile' : null,
          });
        }
      }

      // HousingReferral org isolation check
      const referrals = await safeList('HousingReferral', null, 200);
      if (referrals !== null) {
        const noOrg = referrals.filter(r => !r.organization_id);
        addFinding({
          module_name: 'Role & Permissions',
          check_name: 'HousingReferral Organization Isolation',
          severity: noOrg.length > 0 ? 'high' : 'info',
          status: noOrg.length > 0 ? 'failed' : 'passed',
          issue_code: noOrg.length > 0 ? 'REFERRAL_NO_ORG' : null,
          issue_summary: noOrg.length > 0 ? `${noOrg.length} referral(s) missing organization_id — cross-org isolation broken` : 'All referrals have organization_id for isolation',
          recommended_fix: noOrg.length > 0 ? 'Backfill organization_id on housing referrals to restore org isolation' : null,
        });
      }
    };

    const runLearningPathway = async () => {
      const classes = await safeList('LearningClass', null, 200);
      const published = classes?.filter(c => c.status === 'published' && c.is_active);
      addFinding({
        module_name: 'Learning & Pathway',
        check_name: 'Published Active Classes',
        severity: (published?.length ?? 0) === 0 ? 'high' : 'info',
        status: (published?.length ?? 0) === 0 ? 'warning' : 'passed',
        issue_summary: (published?.length ?? 0) === 0 ? 'No published active learning classes — residents cannot enroll' : `${published.length} published active classes available`,
        recommended_fix: (published?.length ?? 0) === 0 ? 'Publish at least one LearningClass to enable the learning module' : null,
      });

      const certPaths = await safeList('CertificatePath', null, 50);
      addFinding({
        module_name: 'Learning & Pathway',
        check_name: 'Certificate Paths Configured',
        severity: (certPaths?.length ?? 0) === 0 ? 'medium' : 'info',
        status: (certPaths?.length ?? 0) === 0 ? 'warning' : 'passed',
        issue_summary: (certPaths?.length ?? 0) === 0 ? 'No certificate paths configured' : `${certPaths.length} certificate path(s) defined`,
        recommended_fix: (certPaths?.length ?? 0) === 0 ? 'Run seedCertificatePaths or create certificate paths via Learning Center' : null,
      });

      const assignments = await safeList('LearningAssignment', null, 500);
      if (assignments !== null) {
        const passed = assignments.filter(a => a.status === 'passed' || a.status === 'completed');
        const failed = assignments.filter(a => a.status === 'failed');
        addFinding({
          module_name: 'Learning & Pathway',
          check_name: 'Learning Assignment Completion Status',
          severity: 'info',
          status: 'passed',
          issue_summary: `${assignments.length} total assignments: ${passed.length} passed/completed, ${failed.length} failed, ${assignments.length - passed.length - failed.length} in progress`,
        });
      }
    };

    const runHousingEmployer = async () => {
      const providers = await safeList('HousingProvider', null, 50);
      addFinding({
        module_name: 'Housing & Employer',
        check_name: 'Housing Providers Configured',
        severity: (providers?.length ?? 0) === 0 ? 'medium' : 'info',
        status: (providers?.length ?? 0) === 0 ? 'warning' : 'passed',
        issue_summary: (providers?.length ?? 0) === 0 ? 'No housing providers configured — availability summary will be empty' : `${providers.length} provider(s) configured`,
        recommended_fix: (providers?.length ?? 0) === 0 ? 'Add at least one HousingProvider record to enable the availability summary' : null,
      });

      const employers = await safeList('Employer', null, 100);
      addFinding({
        module_name: 'Housing & Employer',
        check_name: 'Employer Records',
        severity: (employers?.length ?? 0) === 0 ? 'low' : 'info',
        status: 'passed',
        issue_summary: `${employers?.length ?? 0} employer record(s) in system`,
      });

      const jobListings = await safeList('JobListing', null, 200);
      const active = jobListings?.filter(j => j.status === 'active');
      addFinding({
        module_name: 'Housing & Employer',
        check_name: 'Active Job Listings',
        severity: (active?.length ?? 0) === 0 ? 'medium' : 'info',
        status: (active?.length ?? 0) === 0 ? 'warning' : 'passed',
        issue_summary: (active?.length ?? 0) === 0 ? 'No active job listings — job matching unavailable' : `${active.length} active job listing(s)`,
        recommended_fix: (active?.length ?? 0) === 0 ? 'Add job listings to enable job matching for residents' : null,
      });
    };

    const runReportingConsistency = async () => {
      const residents = await safeList('Resident', null, 500);
      const outcomes = await safeList('OutcomeRecord', null, 200);
      if (residents !== null && outcomes !== null) {
        const employed = residents.filter(r => r.status === 'employed');
        const hiredMatches = await safeList('JobMatch', null, 500);
        const hiredCount = hiredMatches?.filter(m => m.status === 'hired')?.length ?? 0;
        addFinding({
          module_name: 'Reporting',
          check_name: 'Employed Status vs Hired Job Matches',
          severity: Math.abs(employed.length - hiredCount) > 5 ? 'medium' : 'info',
          status: Math.abs(employed.length - hiredCount) > 5 ? 'warning' : 'passed',
          issue_summary: `${employed.length} residents with status=employed, ${hiredCount} job matches with status=hired`,
          recommended_fix: Math.abs(employed.length - hiredCount) > 5 ? 'Check that resident status is updated when job match status changes to hired' : null,
        });
      }

      const auditLogs = await safeList('AuditLog', null, 100);
      addFinding({
        module_name: 'Reporting',
        check_name: 'Audit Log Activity',
        severity: (auditLogs?.length ?? 0) === 0 ? 'medium' : 'info',
        status: (auditLogs?.length ?? 0) === 0 ? 'warning' : 'passed',
        issue_summary: (auditLogs?.length ?? 0) === 0 ? 'No audit log entries — logging may not be functioning' : `${auditLogs.length} audit log entries found (sample of 100)`,
        recommended_fix: (auditLogs?.length ?? 0) === 0 ? 'Verify backend functions are calling AuditLog.create on major actions' : null,
      });
    };

    // ── DISPATCH ────────────────────────────────────────────────────────
    const runAll = audit_type === 'full_system';

    if (runAll || audit_type === 'quick_health') await runQuickHealth();
    if (runAll || audit_type === 'onboarding_activation') await runOnboardingActivation();
    if (runAll || audit_type === 'data_integrity') await runDataIntegrity();
    if (runAll || audit_type === 'module_communication') await runModuleCommunication();
    if (runAll || audit_type === 'role_permission') await runPermissions();
    if (runAll || audit_type === 'learning_pathway') await runLearningPathway();
    if (runAll || audit_type === 'housing_employer') await runHousingEmployer();
    if (runAll || audit_type === 'reporting_consistency') await runReportingConsistency();

    // ── SAVE FINDINGS ───────────────────────────────────────────────────
    for (const f of findings) {
      await base44.asServiceRole.entities.AuditFinding.create(f).catch(() => {});
    }

    // ── COMPUTE SUMMARY ─────────────────────────────────────────────────
    const total = findings.length;
    const passed = findings.filter(f => f.status === 'passed').length;
    const failed = findings.filter(f => f.status === 'failed').length;
    const warnings = findings.filter(f => f.status === 'warning').length;
    const skipped = findings.filter(f => f.status === 'skipped').length;
    const criticals = findings.filter(f => f.severity === 'critical' && f.status !== 'passed');
    const overall = failed > 0 ? (criticals.length > 0 ? 'failed' : 'warning') : warnings > 0 ? 'warning' : 'passed';

    // ── AI SUMMARY ──────────────────────────────────────────────────────
    const failedSummary = findings
      .filter(f => f.status !== 'passed')
      .map(f => `[${f.severity.toUpperCase()}] ${f.module_name} / ${f.check_name}: ${f.issue_summary}`)
      .join('\n');

    let aiSummary = '';
    try {
      aiSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a system auditor for a nonprofit workforce & reentry case management app called REJ Pathways Hub.

An automated audit just ran. Here are the findings that are NOT passing:

${failedSummary || 'No issues found — all checks passed.'}

Based on these findings:
1. Identify the 3 biggest risks to system stability or data safety
2. List the top 5 immediate action items for the admin
3. Identify any security/permission risks
4. Provide a one-paragraph daily summary
5. Provide a weekly priorities paragraph

Keep it concise, direct, and actionable. Format with clear sections.`,
      });
    } catch {
      aiSummary = 'AI summary unavailable. Review findings manually.';
    }

    // ── UPDATE RUN ───────────────────────────────────────────────────────
    const completedAt = new Date().toISOString();
    const summary = `${total} checks: ${passed} passed, ${failed} failed, ${warnings} warnings. Overall: ${overall.toUpperCase()}`;

    await base44.asServiceRole.entities.AuditRun.update(run.id, {
      completed_at: completedAt,
      overall_status: overall,
      summary,
      total_checks: total,
      passed_checks: passed,
      failed_checks: failed,
      warning_checks: warnings,
      skipped_checks: skipped,
      ai_summary: typeof aiSummary === 'string' ? aiSummary : JSON.stringify(aiSummary),
    });

    return Response.json({
      success: true,
      run_id: run.id,
      overall_status: overall,
      summary,
      total_checks: total,
      passed_checks: passed,
      failed_checks: failed,
      warning_checks: warnings,
      findings: findings.filter(f => f.status !== 'passed'),
      ai_summary: aiSummary,
    });
  } catch (error) {
    console.error('[runSystemAudit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});