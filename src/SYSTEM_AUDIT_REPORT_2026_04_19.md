# REJ Pathways Hub — Full System Audit Report
**Date:** April 19, 2026  
**Scope:** Architecture, Data Integrity, Sync/Integration, Workflow Gaps, Scale, Launch Readiness  
**Auditor:** Base44 AI System Audit  

---

## SECTION 1 — ARCHITECTURE REVIEW

### Module Map & Connections

```
[Public Landing / Request Access]
        ↓ (OnboardingRequest)
[OnboardingQueue (Admin)] → approveOnboardingRequest
        ↓
[Resident Record Created] → onResidentCreated (automation)
        ↓ triggers
  - ServiceTask bundle (onboarding)
  - CaseNote (system)
        ↓
[Intake Form] → onIntakeCompleted (automation)
        ↓ triggers
  - BarrierItem records
  - ServicePlan record
  - ServiceTask records (per barrier)
  - Resident status → active
        ↓
[Case Management]
  - CaseNote, ServiceTask, ServicePlan, Appointment
  - HousingEligibilityPanel → submitToHousingQueue
        ↓
[Housing Operations]
  - HousingReferral / HousingPlacement / Bed / House
  - assignHousingPlacement → updates Bed + House + HousingPlacement
        ↓
[Transportation Hub]
  - TransportationRequest (standalone, no automation hooks)
        ↓
[Job Readiness / Job Matching]
  - EmployabilityProfile, ResumeRecord, MockInterview
  - JobListing, JobMatch
        ↓
[Learning Center]
  - LearningClass, ClassEnrollment, AttendanceRecord, Certificate
        ↓
[Outcomes / Alumni]
  - OutcomeRecord, AlumniProfile
        ↓
[Exit Workflow]
  - dischargeResident → onResidentExited (automation)
  - closes Beds, HousingPlacements, ServiceTasks
```

### Cross-Cutting Modules
- **AuditLog** — Written by most backend functions
- **Notification** — Entity exists but no clear dispatch automation found
- **Document** — Exists, linked to residents, but upload/management is ad hoc
- **Message** — Exists, appears UI-only with no backend routing
- **FeatureFlag** — Entity exists but no code reads from it at runtime

### Single Points of Failure

| SPOF | Risk | Notes |
|------|------|-------|
| `global_resident_id` generation | **CRITICAL** | `generateResidentId.js` scans ALL residents to find max ID — sequential, not atomic. Race condition possible under concurrent creates. |
| `approveOnboardingRequest.js` | **HIGH** | Creates Resident, UserAccount, BarrierItems, sends email — all in one transaction. No rollback if email fails after record creation. |
| `onIntakeCompleted` automation | **HIGH** | Creates barriers, plans, tasks in parallel `Promise.all`. If any fail, partial data state with no cleanup. |
| House `occupied_beds` counter | **MEDIUM** | Denormalized counter on House entity. Can drift; relies on scheduled sync to correct. |
| `JWT_SECRET` env var | **CRITICAL** | Activation flow hard-fails with 500 if not set. No graceful fallback. |

### Isolated Modules (Should Be Connected)

| Module | Issue |
|--------|-------|
| **Transportation** | `TransportationRequest` has no automation. No hook when resident is discharged to cancel rides. No hook when housing placement is made to suggest transport. |
| **Notification entity** | Entity exists but nothing reads it to push real alerts. Essentially dead storage. |
| **FeatureFlag entity** | No runtime code gates features on this entity. |
| **AlumniProfile** | Created manually — not auto-created when resident graduates/exits. |
| **OutcomeRecord** | Has `outcomeMilestoneFollowUp` function but no automation wires it to resident exit events. |
| **Message entity** | Messages stored but no real-time delivery, no unread counts, no notification hooks. |
| **Certificate / CertificatePath** | `checkCertificateEligibility` exists but no automation fires it when a class is completed. |

---

## SECTION 2 — DATA INTEGRITY CHECK

### Where Data Is Written

| Entity | Write Points |
|--------|-------------|
| Resident | approveOnboardingRequest, processIntakeSubmission, onIntakeCompleted, autoAssignResident, dischargeResident, assignHousingPlacement, submitToHousingQueue, reEntryResident, UI forms (ResidentProfile, Residents page) |
| HousingPlacement | assignHousingPlacement, dischargeResident, onResidentExited, scheduledHousingSync, UI (HousingOperations) |
| Bed | assignHousingPlacement, dischargeResident, onResidentExited, scheduledHousingSync, UI (HousingOperations) |
| House.occupied_beds | assignHousingPlacement, dischargeResident, onResidentExited, scheduledHousingSync — **4 separate writers** |
| ServiceTask | onResidentCreated, onIntakeCompleted, dischargeResident, onResidentExited, submitToHousingQueue, assignHousingPlacement, suggestServiceTasks, UI (CaseManagement) |
| BarrierItem | approveOnboardingRequest, onIntakeCompleted, UI (intake form) |
| CaseNote | onResidentCreated, onIntakeCompleted, dischargeResident, onResidentExited, UI (CaseManagement) |
| AuditLog | Most backend functions — inconsistent schema (some use `performed_by`, some `user_id`, some `user_email`) |

### Conflicting Data Versions (Flags)

#### 🚨 CRITICAL: `House.occupied_beds` — 4 Writers, No Lock
`assignHousingPlacement.js`, `dischargeResident.js`, `onResidentExited.js`, and `scheduledHousingSync.js` all write `House.occupied_beds`. Under concurrent discharge + housing assignment, a race condition produces incorrect occupancy counts. No distributed lock exists.

#### 🚨 CRITICAL: `Resident.status` — Multiple Conflicting Writers
- `onIntakeCompleted` sets status → `active` (if pre_intake)
- `assignHousingPlacement` sets status → `active` (after housing)  
- `submitToHousingQueue` sets status → `housing_pending` (**BUT `housing_pending` is not in the Resident status enum!** — enum is: pre_intake, active, employed, graduated, exited, inactive)
- `dischargeResident` sets status → `exited`
- UI forms (ResidentProfile) allow direct status edits

**The `housing_pending` status written by `submitToHousingQueue` will silently fail or produce invalid data** since it's not in the entity enum.

#### ⚠️ HIGH: Dual Discharge Path
Both `dischargeResident.js` (direct API call) AND `onResidentExited` (entity automation) handle bed release and placement closure. While idempotency checks exist, if both fire simultaneously the audit log will have duplicate entries and the idempotency window has a race condition.

#### ⚠️ HIGH: `Resident.assigned_case_manager` (string) vs `assigned_case_manager_id` (FK)
`rbac.js` checks **both** the string name AND the ID:
```js
resident.assigned_case_manager_id === user.id ||
resident.assigned_case_manager === user.id ||    // wrong type check
resident.assigned_case_manager === user.email ||
resident.assigned_case_manager === user.full_name
```
This means access control depends on which format the data was written in. Inconsistency across writers creates unpredictable security behavior.

#### ⚠️ MEDIUM: `AuditLog` Schema Inconsistency
Different functions write different field names:
- Some: `performed_by: user.email`
- Others: `user_id: user.id, user_name: user.full_name`
- Others: `user_email: user.email`

AuditLog queries and the AuditCenter UI will get inconsistent results.

### Source of Truth Analysis

| Data Point | Source of Truth | Risk |
|-----------|-----------------|------|
| **Client record** | `Resident` entity | ✅ Clear — single entity, but multiple writers |
| **Housing placement** | `HousingPlacement` entity | ⚠️ Bed + HousingPlacement + House.occupied_beds can diverge |
| **Ride status** | `TransportationRequest` entity | ✅ Clear but isolated — no integration with other modules |
| **Case manager assignment** | `assigned_case_manager_id` | ⚠️ Dual-field system (id + name string) creates inconsistency |
| **Intake completion** | `IntakeAssessment.status` | ✅ Clear |
| **Barrier status** | `BarrierItem` entity | ✅ Clear |
| **Global identity** | `global_resident_id` on Resident | ✅ Clear — but generation is not atomic (see above) |

---

## SECTION 3 — SYNC & INTEGRATION WEAK POINTS

### All Sync Operations

| Operation | Mechanism | Error Handling | Silent Fail Risk |
|-----------|-----------|---------------|-----------------|
| Resident created → tasks | Entity automation → `onResidentCreated` | ✅ try/catch, returns error | Low — errors surfaced |
| Intake completed → barriers/plan | Entity automation → `onIntakeCompleted` | ✅ try/catch | **Medium** — Promise.all failures leave partial barriers |
| Resident exited → bed/placement release | Entity automation → `onResidentExited` | ✅ try/catch | Low — but race with dischargeResident |
| Housing counters | Scheduled sync every 6h | ✅ try/catch | **Medium** — 6h window for drift, no alert if sync fails |
| Intake → Resident backfill | `backfillIntakeToResident` function | Unknown | **HIGH** — manual trigger, no automated retry |
| Certificate eligibility check | `checkCertificateEligibility` | Unknown | **HIGH** — not wired to any automation |
| Outcome follow-up scheduling | `outcomeMilestoneFollowUp` | Unknown | **HIGH** — no automation wires this to exit events |
| ID generation | `generateResidentId` — scan + increment | Partial | **CRITICAL** — race condition under concurrency |

### Silent Failure Points (No Error Alerts)

1. **`onResidentCreated`** — If global_resident_id is missing, creates a CaseNote warning but returns HTTP 200. The automation system sees success; the admin must notice the note manually.

2. **`approveOnboardingRequest`** — If `base44.users.inviteUser()` fails, the catch block silently continues. The resident record is created but the user may not have been invited. No notification to admin.

3. **`assignHousingPlacement`** — No audit log written at all. A housing placement assignment leaves zero audit trail.

4. **`bulkAutoAssignResidents`** — Per-resident errors are caught and counted as `failed`, but no alert is sent to admin. The admin must check the UI response. If the function itself throws (not per-resident), the entire batch fails with no partial results saved.

5. **`scheduledHousingSync`** — If it throws an exception, the automation system retries per its schedule but there is no admin alert. Housing counter drift could persist for hours.

6. **`submitToHousingQueue`** — Sets `resident.status = 'housing_pending'` which is **not a valid enum value** on the Resident entity. This will produce invalid data silently.

7. **AuditLog `.catch(() => {})` pattern** — Many functions catch AuditLog failures silently. Audit gaps will not alert anyone.

---

## SECTION 4 — WORKFLOW GAPS

### Forward Workflow: Intake → Housing → Transport → Outcomes

| Step | Function/Component | Gap / Risk |
|------|--------------------|-----------|
| **1. Client intake** | `RequestAccess` → `OnboardingQueue` → `approveOnboardingRequest` | ⚠️ If email send fails, activation link is lost. No retry mechanism. No way for admin to know the email failed. |
| **2. Account activation** | `ActivateAccount` → `activateUserAccount` | ⚠️ JWT token is 7 days. If user doesn't activate in time, admin must manually resend. No scheduled expiry alert. |
| **3. Resident record created** | `onResidentCreated` automation | ⚠️ global_resident_id can be null at creation if `generateResidentId` wasn't called. Tasks created without identity link. |
| **4. Intake assessment** | `IntakeForm` → `onIntakeCompleted` | ✅ Well implemented. Idempotency check exists. |
| **5. Barrier detection** | `onIntakeCompleted` | ⚠️ Runs in `Promise.all` — if one barrier creation fails, others still create. No atomic rollback. Partial barrier set is possible. |
| **6. Service plan creation** | `onIntakeCompleted` | ✅ Created after barriers. But if plan creation fails, tasks are never generated (plan_id is undefined). |
| **7. Housing eligibility** | `HousingEligibilityPanel` → `submitToHousingQueue` | 🚨 Sets invalid status `housing_pending`. No enum value exists for this. |
| **8. Housing placement** | `assignHousingPlacement` | ⚠️ No check if bed is already occupied before assigning. No check for double-placement of same resident. No audit log. |
| **9. Ride scheduling** | `TransportationRequest` UI | 🚨 Completely manual, no automation. No link to housing placement date. No link to case manager. Driver/vehicle assignment is manual. |
| **10. Outcome tracking** | `OutcomeRecord` + `outcomeMilestoneFollowUp` | 🚨 `outcomeMilestoneFollowUp` is never automatically triggered. Admin must manually create OutcomeRecord entries. |

### Exit Workflow: Discharge → Bed Release → Case Closure

| Step | Function/Component | Gap / Risk |
|------|--------------------|-----------|
| **1. Discharge trigger** | `DischargeDialog` → `dischargeResident` | ✅ Well implemented with validation. |
| **2. Bed release** | `dischargeResident` + `onResidentExited` automation | ⚠️ Both can fire for the same resident. Idempotency exists but race window remains. |
| **3. Housing placement closed** | Both functions | Same race as above. |
| **4. Task archival** | Both functions | Same race — tasks could be updated twice. |
| **5. Ride cancellation** | **NOT IMPLEMENTED** | 🚨 No function cancels pending TransportationRequests on discharge. Rides remain active after exit. Driver gets dispatched for a discharged resident. |
| **6. Case note closure** | Both functions | ✅ Final note written. |
| **7. Outcome record initiated** | **NOT IMPLEMENTED** | 🚨 No 30/60/90-day follow-up scheduled on exit. OutcomeRecord must be created manually. |
| **8. AlumniProfile creation** | **NOT IMPLEMENTED** | 🚨 No auto-creation of AlumniProfile on graduation/exit. |
| **9. Appointment cancellation** | **NOT IMPLEMENTED** | ⚠️ Scheduled appointments are not cancelled on discharge. |
| **10. Learning enrollment closure** | **NOT IMPLEMENTED** | ⚠️ Active ClassEnrollments remain open on discharge. |

---

## SECTION 5 — SCALE STRESS TEST

### 10 Houses, 50 Rooms, 200 Clients Simultaneously

| Component | Behavior at Scale | Risk |
|-----------|------------------|------|
| `generateResidentId` | Scans ALL residents for max ID on every create | 🚨 **Critical bottleneck.** 200 residents = 200 full-table scans. Under concurrent creates, race condition will produce duplicate IDs. Needs atomic counter or DB sequence. |
| `bulkAutoAssignResidents` | For each unassigned resident: fetches ALL case managers + their caseloads | 🚨 **N×M queries.** 50 unassigned × 10 CMs = 500+ DB calls per bulk operation. Will timeout or be extremely slow. |
| `scheduledHousingSync` | Fetches up to 5000 beds and placements in memory | ⚠️ At 200 residents / 50 rooms, fits in limit. But limit is hardcoded at 5000 — fine for now, problematic at 2000+ beds. |
| `onIntakeCompleted` | `Promise.all` for barrier creation | ⚠️ 15+ barriers × 2 tasks each = 30 simultaneous DB writes per resident. Fine for single intake. Problematic if 20 intakes trigger simultaneously. |
| `dischargeResident` | Sequential task archival loop | ⚠️ Resident with 50+ tasks will be slow. Should be `Promise.all`. |
| RLS filtering on Residents | Backend filters on `assigned_case_manager_id` | ✅ Handled at DB level — scales fine. |
| Housing counter | 4 independent writers to `House.occupied_beds` | 🚨 At 50 rooms/10 houses, concurrent discharges + move-ins = counter corruption. |

### 3 Partner Organizations Simultaneously

| Concern | Risk |
|---------|------|
| `organization_id` scoping | ⚠️ Most entities have `organization_id` but RLS on most entities is **role-based, not org-based**. An `admin` at Org A can currently read Org B's residents, housing, cases, etc. |
| `autoAssignResident` | Filters by `organization_id` ✅ |
| `User.organization_id` | Used in queries but the User entity's RLS only enforces that admins can manage users — cross-org admin access is possible. |
| Reports/Analytics | `Reporting` page almost certainly shows all-org data to any admin. No org-scoping visible. |
| `GrantTracker` | No org-scoping on RLS — any admin can read any org's grant data. |
| `AuditLog` | No org-scoping — any admin reads all orgs' audit trails. |

### Hardcoded Limits & Bottlenecks

| Location | Limit | Risk |
|----------|-------|------|
| `scheduledHousingSync` | `.list('name', 2000)` houses, `.list('house_id', 5000)` beds | Medium — will silently truncate above 2000/5000 |
| `generateResidentId` | `.list()` — fetches ALL residents with no limit | Critical — no pagination, full table scan every time |
| `bulkAutoAssignResidents` | Per-resident caseload query in a loop | Critical — O(n×m) queries, no batching |
| `Reporting` / reporting metrics | Unknown — not read | Needs review |
| `listUsersWithProfiles` | Unknown limit | Needs review |

---

## SECTION 6 — LAUNCH READINESS

### Top 10 Items Before Going Live

---

#### 1. `submitToHousingQueue` writes invalid `housing_pending` status
**Severity: CRITICAL**  
`resident.status = 'housing_pending'` is not in the Resident entity enum. This silently corrupts resident status data. Every resident submitted to the housing queue will have an invalid status.

**Fix:** Either add `housing_pending` to the Resident status enum, or change the logic to use `active` status with a separate `housing_queue_status` flag field.

---

#### 2. `generateResidentId` race condition under concurrency
**Severity: CRITICAL**  
The function scans all residents, finds the max ID, and returns max+1. Two simultaneous calls will return the same ID, creating duplicate `global_resident_id` values — breaking the master identity system.

**Fix:** Use a dedicated atomic counter entity (e.g., `IDCounter`) with a read-then-increment-then-write pattern protected by a unique constraint, or implement retry-on-conflict logic.

---

#### 3. No ride cancellation on client discharge
**Severity: CRITICAL**  
When a resident is discharged, `TransportationRequest` records in `pending`, `approved`, or `scheduled` status are not cancelled. A driver will be dispatched to pick up someone who has left the program.

**Fix:** Add a step in `dischargeResident.js` to query and cancel all future TransportationRequests for the resident.

---

#### 4. Multi-organization data isolation is broken
**Severity: CRITICAL**  
RLS on most entities (Residents, Grants, AuditLog, CaseNotes, ServiceTasks, etc.) is role-based only, not org-scoped. In a multi-org deployment, an admin at Organization A can read all of Organization B's client records and case notes.

**Fix:** Add `organization_id` conditions to RLS rules for all entities that contain org-sensitive data, or enforce org-scoping in all frontend queries.

---

#### 5. `approveOnboardingRequest` has no rollback on failure
**Severity: CRITICAL**  
If the function creates a Resident record but then fails on email delivery (or UserAccount creation), the system is in a partial state: a Resident exists with no linked user account and no activation email. The admin has no visibility into this failure.

**Fix:** Wrap the critical path in a try/catch that either rolls back created records or writes a clear failure status to the OnboardingRequest. Add a status field like `approval_status: 'failed'` with an error message.

---

#### 6. `House.occupied_beds` counter has 4 independent writers — no concurrency control
**Severity: HIGH**  
`assignHousingPlacement`, `dischargeResident`, `onResidentExited`, and `scheduledHousingSync` all write `House.occupied_beds`. Under concurrent operations, the counter will be incorrect. The 6-hour scheduled sync is the only correction mechanism.

**Fix:** Remove the denormalized counter entirely and compute it on read (aggregate query over Beds), OR enforce that only `scheduledHousingSync` writes the counter and all other writers skip it (relying on the sync).

---

#### 7. Dual discharge path (dischargeResident + onResidentExited) can double-fire
**Severity: HIGH**  
`DischargeDialog` calls `dischargeResident` which sets status to `exited`, which then triggers the `onResidentExited` automation. Both functions close placements, release beds, and archive tasks. While idempotency checks exist, they have a race window and will produce duplicate CaseNotes and AuditLog entries.

**Fix:** Choose ONE canonical discharge path. Either make `dischargeResident` do ALL the work and have `onResidentExited` be a no-op if `actual_exit_date` is already set, or remove the direct work from `dischargeResident` and let the automation handle it entirely.

---

#### 8. `bulkAutoAssignResidents` is O(n×m) — will timeout with real data
**Severity: HIGH**  
For each unassigned resident, the function fetches all case managers AND queries each CM's caseload. For 50 unassigned residents and 10 case managers, that's 500+ sequential DB calls — likely to hit timeout limits.

**Fix:** Refactor to fetch case managers and their caseloads ONCE before the resident loop, cache the caseload counts in memory, update the in-memory count after each assignment, and then perform all resident updates.

---

#### 9. `AuditLog` schema is inconsistent across 10+ functions
**Severity: IMPORTANT**  
Different functions write different field names: `performed_by`, `user_id`, `user_email`, `user_name`. The AuditCenter UI cannot reliably display who performed an action.

**Fix:** Define and enforce a single AuditLog schema. Create a shared `writeAuditLog(base44, params)` helper and use it everywhere.

---

#### 10. No outcome tracking automation — 30/60/90-day follow-ups are fully manual
**Severity: IMPORTANT**  
`outcomeMilestoneFollowUp` exists but is never triggered automatically. When a client exits, there is no scheduled reminder to conduct 30-day, 60-day, or 90-day follow-ups. This is a core grant reporting requirement.

**Fix:** Wire a scheduled automation that runs daily, queries residents with `status = 'exited'` and `actual_exit_date` within the last 90 days, and creates Notification records or sends email alerts to assigned case managers for upcoming milestone follow-ups.

---

### Additional Issues (Below Top 10)

| Issue | Severity |
|-------|---------|
| `assignHousingPlacement` writes no AuditLog | Important |
| `Notification` entity is dead — nothing reads it for delivery | Important |
| `AlumniProfile` not auto-created on graduation | Nice to Have |
| `ClassEnrollment` not closed on discharge | Nice to Have |
| `Appointment` not cancelled on discharge | Important |
| `FeatureFlag` entity is unused | Nice to Have |
| `Message` entity has no real-time delivery | Nice to Have |
| Activation tokens never cleaned up (expired tokens accumulate) | Nice to Have |
| `backfillIntakeToResident` is a manual one-time function with no guard for reuse | Nice to Have |
| RBAC: `assigned_case_manager` string field used for access control alongside ID field — ambiguous | Important |
| Role `'user'` treated as admin (`isAdmin` returns true for `'user'`) — could be a security issue depending on who receives the default role | Important |
| `approveOnboardingRequest` uses `@0.8.23` SDK (older than rest of app using `@0.8.25`) | Nice to Have |

---

## SUMMARY SCORECARD

| Area | Score | Notes |
|------|-------|-------|
| **Architecture** | 6/10 | Solid core, but isolated modules (transport, notifications, outcomes) |
| **Data Integrity** | 5/10 | Multiple conflicting writers, invalid enum write, no concurrency control |
| **Sync/Integration** | 6/10 | Event-driven automations work well; 6h sync window; silent failure points |
| **Workflow Completeness** | 5/10 | Forward flow mostly works; exit flow has 5 missing steps |
| **Scale Readiness** | 4/10 | ID generation race, O(n×m) bulk assign, no org isolation |
| **Launch Readiness** | 4/10 | 5 critical issues block production use with real clients |

### Critical (Must Fix Before Launch): 5 items
### Important (Should Fix Before Launch): 5 items  
### Nice to Have (Post-Launch): ~10 items

---

**End of Audit Report**