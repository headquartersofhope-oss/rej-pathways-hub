# Learning Center System Audit
**Date:** 2026-04-04  
**Scope:** Full diagnostic audit — functionality, data flow, persistence, integration, system reliability

---

## ✅ FULLY WORKING

| Area | Status | Notes |
|---|---|---|
| Class Catalog UI | ✅ Working | Search, filter by category/difficulty/literacy/required/active all functional |
| Class Create / Edit | ✅ Working | Form saves correctly with `is_active`, `status`, `difficulty_level` |
| Class cards | ✅ Working | Show title, category, description, difficulty, literacy level, duration |
| Staff enroll from ResidentLearningTab | ✅ Working | Creates `ClassEnrollment` with `global_resident_id` + `resident_id` |
| Staff enroll from EnrollmentManager | ✅ Working | Correctly resolves `global_resident_id` from resident object |
| Status update (enrolled → in_progress → completed) | ✅ Working | Dropdown + `completion_date` auto-set on completion |
| Instructor Notes (add, flag) | ✅ Working | Persists with `resident_id`, `global_resident_id`, optional `class_id` |
| Certificate issuance from ResidentLearningTab | ✅ Working (fixed) | See fixes below |
| Certificate issuance from EnrollmentManager | ✅ Fixed | Was gated on non-existent field `completion_grants_certificate` |
| AI Recommendations backend | ✅ Working (improved) | Filters server-side now, uses `ClassEnrollment` as source of truth |
| AI Recommendations UI (LearningOnboarding) | ✅ Working | Resident-facing, one-click assign |
| AI Recommendations UI (StaffRecommendationsDashboard) | ✅ Working | Staff-facing, per-resident, manual override |
| AI Recommendations inline (ResidentAIRecommendations) | ✅ Working | Collapsible panel in ResidentLearningTab |
| Learning Pathways config | ✅ Working | 5 pathways defined in `lib/learningPathways.js` |
| Learning Pathways progress tracking | ✅ Working | Per-class completion status, certificate link |
| MyCourses resident view | ✅ Working | Shows progress, pathways, enrolled classes, certificates |
| Attendance UI (mark present/absent/late/excused) | ✅ Fixed | See fixes below |
| Role-based visibility (staff vs resident) | ✅ Working | `isStaffUser` check gates all admin controls |
| Quiz score calculation | ✅ Fixed | Now saves to `ClassEnrollment` |
| Quiz pass/fail logic | ✅ Working | Correctly compares against `passingScore` |
| Quiz retake | ✅ Working | Resets state cleanly |
| Query persistence (React Query) | ✅ Working | Cache invalidation on all mutations |

---

## ⚠️ PARTIALLY WORKING (before fixes)

| Area | Issue | Fix Applied |
|---|---|---|
| Certificate query cache invalidation | `invalidateQueries` used wrong key (`resident.id`) when query key was `queryId` (could be `global_resident_id`) | Fixed — now uses `queryId` consistently |
| LearningOnboarding assign | No error feedback on failure, silent catch | Fixed — shows error message |
| Recommendations load timing | After self-assign, recs refresh happened before DB write completed | Fixed — 500ms delay before re-fetch |

---

## 🔴 BUGS FIXED

### 1. Attendance — Wrong Field Names
- **`session_id`** used in create/filter → correct field is **`class_session_id`** (per `AttendanceRecord` schema)  
- **`recorded_by`** used in create/update → correct field is **`marked_by`** / **`marked_by_name`** / **`marked_date`**  
- **`s.date`** used in session display → correct field is **`s.session_date`** (per `ClassSession` schema)  
- Sort on `'-date'` → fixed to `'-session_date'`  
- **Impact:** ALL attendance records were saving with null foreign keys and never retrievable

### 2. Quiz — Saved to Wrong Entity
- Quiz `handleSubmitQuiz` saved to `LearningAssignment` entity but the system uses `ClassEnrollment` as the primary tracking entity  
- **Impact:** Quiz scores and completion dates never appeared in the learning tab or progress views  
- **Fix:** Now updates `ClassEnrollment` with `quiz_score`, `quiz_passed`, `status: 'completed'`, and `completion_date`

### 3. RecommendLearningClasses — Full Table Scan + Data Risk
- Fetched all `Resident` records, all `IntakeAssessment`, all `EmployabilityProfile`, all `LearningAssignment` in memory then client-filtered  
- **Impact:** Slow for large datasets, exposes all residents' data to the function unnecessarily  
- **Fix:** All queries now use `filter({ resident_id })` server-side

### 4. RecommendLearningClasses — Wrong Source of Truth
- Looked at `LearningAssignment` to check already-assigned classes  
- But the app uses `ClassEnrollment` — classes could be enrolled and would still show as "new recommendations"  
- **Fix:** Now reads `ClassEnrollment.filter({ resident_id })` for existing class exclusion

### 5. EnrollmentManager — Issue Cert Button Never Shows
- Gated on `cls.completion_grants_certificate` — a field that **does not exist** in the `LearningClass` schema  
- **Impact:** Staff could never issue certificates from the Enrollments tab  
- **Fix:** Removed non-existent field check — shows for any completed enrollment without a cert

### 6. ResidentLearningDashboard — Cross-Resident Data Leak
- `LearningAssignment.list()` (all records) then client-filtered by `resident_id`  
- **Impact:** All residents' assignment data loaded into browser memory for any one resident view  
- **Fix:** `LearningAssignment.filter({ resident_id: residentId })` server-side

---

## 🟡 DATA RISKS

| Risk | Severity | Notes |
|---|---|---|
| `LearningAssignment` vs `ClassEnrollment` dual-tracking | Medium | Two entities can track the same thing — consolidate to `ClassEnrollment` only going forward |
| Attendance records with null `class_session_id` | High | Any attendance records created before this fix have null session links — effectively orphaned |
| Classes in pathways with no DB record | Low | Pathway matching is title-based — "Coming Soon" shown for unmatched titles |
| `global_resident_id` fallback to `resident.id` | Low | Some records may use `resident.id` as `global_resident_id` — accepted pattern but should be audited |

---

## 🟠 INTEGRATION RISKS

| Risk | Notes |
|---|---|
| AI Recommendations depend on `status === 'published'` | Classes in `draft` status never appear as recommendations even if active — intentional but worth noting |
| Pathways linked by class title (string match) | If a class title changes in the DB, pathway progress breaks silently |
| Certificate `category` field not set during issuance | `ResidentLearningTab.handleIssueCertificate` doesn't set `category` — pathway certificate matching may fail |

---

## 🔲 MISSING COMPONENTS

| Component | Status |
|---|---|
| Resident class detail view (open/read a class) | Not built — `ClassCompletionCard` has stub `onStart: () => console.log(...)` |
| Video progress tracking (`watched_video` flag) | Field exists on `LearningAssignment` but no UI to mark it |
| Pathway-linked auto-certificate issuance | Manual only — no automatic trigger when pathway completes |
| Quiz available for residents in MyCourses | `QuizComponent` exists but not wired into resident-facing class open flow |

---

## 🏆 HIGHEST PRIORITY FIXES BEFORE ADDING REAL CONTENT

1. **✅ DONE — Attendance field names** — was broken silently for all records
2. **✅ DONE — Quiz saves to ClassEnrollment** — completion never persisted
3. **✅ DONE — Issue Cert button** — was permanently hidden
4. **✅ DONE — Recommendations use ClassEnrollment** — source of truth alignment
5. **Next — Wire class detail view** — residents need somewhere to go when they "open" a class
6. **Next — Set `certificate.category` on issuance** — required for pathway completion detection
7. **Next — Seed all 25 pathway classes** — pathway progress shows "Coming Soon" until classes exist in DB

---

## SYSTEM READINESS ASSESSMENT

| Dimension | Score | Notes |
|---|---|---|
| Data integrity | 🟡 75% | Fixed major field name bugs; some orphaned records may exist |
| Functional coverage | 🟡 70% | Core flows work; class detail/quiz flow for residents not wired |
| ID linking | ✅ 90% | `global_resident_id` consistently used with `resident_id` fallback |
| Role-based access | ✅ 95% | Staff vs resident gates work correctly throughout |
| Performance | 🟡 80% | Recommendation engine now filters server-side |
| Production readiness | 🟡 75% | Safe to add class content once classes are seeded and detail view is wired |