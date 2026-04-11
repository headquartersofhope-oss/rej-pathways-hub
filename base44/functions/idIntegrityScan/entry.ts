import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[ID Scan] Starting ID integrity scan...');

    // Fetch all core entities
    const [residents, intakes, barriers, serviceTasks, jobMatches, jobListings, 
            mockInterviews, resumeRecords, employabilityProfiles, alumni, 
            resourceDistributions, outcomes, classEnrollments] = await Promise.all([
      base44.entities.Resident.list(),
      base44.entities.IntakeAssessment.list(),
      base44.entities.BarrierItem.list(),
      base44.entities.ServiceTask.list(),
      base44.entities.JobMatch.list(),
      base44.entities.JobListing.list(),
      base44.entities.MockInterview.list(),
      base44.entities.ResumeRecord.list(),
      base44.entities.EmployabilityProfile.list(),
      base44.entities.AlumniProfile.list(),
      base44.entities.ResourceDistribution.list(),
      base44.entities.OutcomeRecord.list(),
      base44.entities.ClassEnrollment.list(),
    ]);

    console.log(`[ID Scan] Loaded: ${residents.length} residents, ${intakes.length} intakes, ${barriers.length} barriers`);

    const issues = {
      missingGlobalResidentIds: [],
      missingResidentIds: [],
      orphanedRecords: [],
      inconsistentIds: [],
      fixedCount: 0,
      totalScanned: 0,
    };

    // ===== FIX PHASE 1: Residents without global_resident_id =====
    const residentsNeedingGlobalId = residents.filter(r => !r.global_resident_id);
    console.log(`[ID Scan] ${residentsNeedingGlobalId.length} residents missing global_resident_id`);

    for (const resident of residentsNeedingGlobalId) {
      // Generate GRI-XXXXXX format
      const griNum = String(resident.id).slice(-6).padStart(6, '0');
      const newGRI = `GRI-${griNum}`;
      
      await base44.entities.Resident.update(resident.id, { global_resident_id: newGRI });
      issues.fixedCount++;
      issues.missingGlobalResidentIds.push({
        resident_id: resident.id,
        name: `${resident.first_name} ${resident.last_name}`,
        assigned_gri: newGRI,
      });
    }

    // ===== FIX PHASE 2: Module records without global_resident_id =====
    const residentMap = new Map(residents.map(r => [r.id, r]));

    // IntakeAssessment fixes
    for (const intake of intakes) {
      issues.totalScanned++;
      if (!intake.global_resident_id && intake.resident_id) {
        const resident = residentMap.get(intake.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.IntakeAssessment.update(intake.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'IntakeAssessment', id: intake.id, resident_id: intake.resident_id });
        }
      }
    }

    // BarrierItem fixes
    for (const barrier of barriers) {
      issues.totalScanned++;
      if (!barrier.global_resident_id && barrier.resident_id) {
        const resident = residentMap.get(barrier.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.BarrierItem.update(barrier.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'BarrierItem', id: barrier.id, resident_id: barrier.resident_id });
        }
      }
    }

    // ServiceTask fixes
    for (const task of serviceTasks) {
      issues.totalScanned++;
      if (!task.global_resident_id && task.resident_id) {
        const resident = residentMap.get(task.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.ServiceTask.update(task.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'ServiceTask', id: task.id, resident_id: task.resident_id });
        }
      }
    }

    // JobMatch fixes
    for (const match of jobMatches) {
      issues.totalScanned++;
      if (!match.global_resident_id && match.resident_id) {
        const resident = residentMap.get(match.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.JobMatch.update(match.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'JobMatch', id: match.id, resident_id: match.resident_id });
        }
      }
    }

    // MockInterview fixes
    for (const interview of mockInterviews) {
      issues.totalScanned++;
      if (!interview.global_resident_id && interview.resident_id) {
        const resident = residentMap.get(interview.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.MockInterview.update(interview.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'MockInterview', id: interview.id, resident_id: interview.resident_id });
        }
      }
    }

    // ResumeRecord fixes
    for (const resume of resumeRecords) {
      issues.totalScanned++;
      if (!resume.global_resident_id && resume.resident_id) {
        const resident = residentMap.get(resume.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.ResumeRecord.update(resume.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'ResumeRecord', id: resume.id, resident_id: resume.resident_id });
        }
      }
    }

    // EmployabilityProfile fixes
    for (const profile of employabilityProfiles) {
      issues.totalScanned++;
      if (!profile.global_resident_id && profile.resident_id) {
        const resident = residentMap.get(profile.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.EmployabilityProfile.update(profile.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'EmployabilityProfile', id: profile.id, resident_id: profile.resident_id });
        }
      }
    }

    // AlumniProfile fixes
    for (const alumnus of alumni) {
      issues.totalScanned++;
      if (!alumnus.global_resident_id && alumnus.resident_id) {
        const resident = residentMap.get(alumnus.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.AlumniProfile.update(alumnus.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'AlumniProfile', id: alumnus.id, resident_id: alumnus.resident_id });
        }
      }
    }

    // ResourceDistribution fixes
    for (const dist of resourceDistributions) {
      issues.totalScanned++;
      if (!dist.global_resident_id && dist.resident_id) {
        const resident = residentMap.get(dist.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.ResourceDistribution.update(dist.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'ResourceDistribution', id: dist.id, resident_id: dist.resident_id });
        }
      }
    }

    // OutcomeRecord fixes
    for (const outcome of outcomes) {
      issues.totalScanned++;
      if (!outcome.global_resident_id && outcome.resident_id) {
        const resident = residentMap.get(outcome.resident_id);
        if (resident?.global_resident_id) {
          await base44.entities.OutcomeRecord.update(outcome.id, { 
            global_resident_id: resident.global_resident_id 
          });
          issues.fixedCount++;
        } else {
          issues.orphanedRecords.push({ type: 'OutcomeRecord', id: outcome.id, resident_id: outcome.resident_id });
        }
      }
    }

    // ===== FIX PHASE 3: Delete placeholder/orphaned records =====
    // IntakeAssessment - delete records with placeholder resident_id
    for (const intake of intakes) {
      if (intake.resident_id === ':residentId' || !intake.resident_id || !residentMap.has(intake.resident_id)) {
        try {
          await base44.entities.IntakeAssessment.delete(intake.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'IntakeAssessment', id: intake.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete IntakeAssessment ${intake.id}: ${e.message}`);
        }
      }
    }

    // BarrierItem - delete orphaned
    for (const barrier of barriers) {
      if (barrier.resident_id === ':residentId' || !barrier.resident_id || !residentMap.has(barrier.resident_id)) {
        try {
          await base44.entities.BarrierItem.delete(barrier.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'BarrierItem', id: barrier.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete BarrierItem ${barrier.id}: ${e.message}`);
        }
      }
    }

    // ServiceTask - delete orphaned
    for (const task of serviceTasks) {
      if (task.resident_id === ':residentId' || !task.resident_id || !residentMap.has(task.resident_id)) {
        try {
          await base44.entities.ServiceTask.delete(task.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'ServiceTask', id: task.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete ServiceTask ${task.id}: ${e.message}`);
        }
      }
    }

    // JobMatch - delete orphaned
    for (const match of jobMatches) {
      if (match.resident_id === ':residentId' || !match.resident_id || !residentMap.has(match.resident_id)) {
        try {
          await base44.entities.JobMatch.delete(match.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'JobMatch', id: match.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete JobMatch ${match.id}: ${e.message}`);
        }
      }
    }

    // MockInterview - delete orphaned
    for (const interview of mockInterviews) {
      if (interview.resident_id === ':residentId' || !interview.resident_id || !residentMap.has(interview.resident_id)) {
        try {
          await base44.entities.MockInterview.delete(interview.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'MockInterview', id: interview.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete MockInterview ${interview.id}: ${e.message}`);
        }
      }
    }

    // ResumeRecord - delete orphaned
    for (const resume of resumeRecords) {
      if (resume.resident_id === ':residentId' || !resume.resident_id || !residentMap.has(resume.resident_id)) {
        try {
          await base44.entities.ResumeRecord.delete(resume.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'ResumeRecord', id: resume.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete ResumeRecord ${resume.id}: ${e.message}`);
        }
      }
    }

    // EmployabilityProfile - delete orphaned
    for (const profile of employabilityProfiles) {
      if (profile.resident_id === ':residentId' || !profile.resident_id || !residentMap.has(profile.resident_id)) {
        try {
          await base44.entities.EmployabilityProfile.delete(profile.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'EmployabilityProfile', id: profile.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete EmployabilityProfile ${profile.id}: ${e.message}`);
        }
      }
    }

    // AlumniProfile - delete orphaned
    for (const alumnus of alumni) {
      if (alumnus.resident_id === ':residentId' || !alumnus.resident_id || !residentMap.has(alumnus.resident_id)) {
        try {
          await base44.entities.AlumniProfile.delete(alumnus.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'AlumniProfile', id: alumnus.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete AlumniProfile ${alumnus.id}: ${e.message}`);
        }
      }
    }

    // ResourceDistribution - delete orphaned
    for (const dist of resourceDistributions) {
      if (dist.resident_id === ':residentId' || !dist.resident_id || !residentMap.has(dist.resident_id)) {
        try {
          await base44.entities.ResourceDistribution.delete(dist.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'ResourceDistribution', id: dist.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete ResourceDistribution ${dist.id}: ${e.message}`);
        }
      }
    }

    // OutcomeRecord - delete orphaned
    for (const outcome of outcomes) {
      if (outcome.resident_id === ':residentId' || !outcome.resident_id || !residentMap.has(outcome.resident_id)) {
        try {
          await base44.entities.OutcomeRecord.delete(outcome.id);
          issues.fixedCount++;
          issues.orphanedRecords.push({ type: 'OutcomeRecord', id: outcome.id, action: 'DELETED - placeholder/orphan' });
        } catch (e) {
          console.log(`[ID Scan] Could not delete OutcomeRecord ${outcome.id}: ${e.message}`);
        }
      }
    }

    // ===== VALIDATION PHASE: Check for remaining orphaned records =====
    for (const enr of classEnrollments) {
      issues.totalScanned++;
      if (!enr.resident_id) {
        issues.orphanedRecords.push({ type: 'ClassEnrollment', id: enr.id, warning: 'No resident_id' });
      }
    }

    const residentIds = new Set(residents.map(r => r.id));
    for (const listing of jobListings) {
      issues.totalScanned++;
      if (listing.employer_id && !residentIds.has(listing.employer_id)) {
        // This is okay—employer_id links to Employer, not Resident
      }
    }

    console.log(`[ID Scan] Fixed ${issues.fixedCount} records. Found ${issues.orphanedRecords.length} orphaned records.`);

    return Response.json({
      success: true,
      phase: 'ID_INTEGRITY_SCAN_COMPLETE',
      summary: {
        residentsScanned: residents.length,
        residentsMissingGlobalId: residentsNeedingGlobalId.length,
        fixedGlobalIds: residentsNeedingGlobalId.length,
        totalRecordsScanned: issues.totalScanned,
        totalFixed: issues.fixedCount,
        orphanedRecordsFound: issues.orphanedRecords.length,
      },
      details: {
        missingGlobalResidentIds: issues.missingGlobalResidentIds.slice(0, 10),
        orphanedRecords: issues.orphanedRecords.slice(0, 10),
      },
      message: `ID integrity scan complete. Fixed ${issues.fixedCount} missing IDs. Scanned ${issues.totalScanned} records.`,
    });
  } catch (error) {
    console.error('[ID Scan] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});