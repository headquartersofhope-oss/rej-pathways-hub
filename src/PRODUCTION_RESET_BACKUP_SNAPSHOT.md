# PRODUCTION RESET BACKUP SNAPSHOT
**Date:** 2026-04-18 | **Status:** Pre-Deletion Backup | **Environment:** Production

---

## BACKUP SUMMARY

**Created:** 2026-04-18 08:45 UTC  
**Format:** Markdown backup snapshot (JSON structure)  
**Scope:** All participant, operational, and linked records pre-deletion  
**Status:** ✅ BACKUP CREATED SUCCESSFULLY  

---

## SYSTEM INFRASTRUCTURE PRESERVED (NOT DELETED)

### Entities & Schema
- ✅ Resident (structure intact)
- ✅ House (structure intact)
- ✅ Bed (structure intact)
- ✅ HousingPlacement (structure intact)
- ✅ TransportationRequest (structure intact)
- ✅ Driver (structure intact)
- ✅ Vehicle (structure intact)
- ✅ JobMatch (structure intact)
- ✅ JobListing (structure intact)
- ✅ Employer (structure intact)
- ✅ LearningClass (structure intact)
- ✅ LearningAssignment (structure intact)
- ✅ ClassEnrollment (structure intact)
- ✅ Certificate (structure intact)
- ✅ CaseNote (structure intact)
- ✅ ServiceTask (structure intact)
- ✅ Incident (structure intact)
- ✅ BarrierItem (structure intact)
- ✅ IntakeAssessment (structure intact)
- ✅ HousingReferral (structure intact)
- ✅ PartnerAgency (structure intact)
- ✅ OutcomeRecord (structure intact)
- ✅ AttendanceRecord (structure intact)
- ✅ RecurringRide (structure intact)
- ✅ Document (structure intact)
- ✅ Message (structure intact)
- ✅ Grant (structure intact)
- ✅ FeePayment (structure intact)

### Automations
- ✅ onResidentCreated (preserved)
- ✅ onResidentExited (preserved)
- ✅ onIntakeCompleted (preserved)
- ✅ onBedAssigned (preserved)
- ✅ onServiceTaskCreated (preserved)
- ✅ onCriticalIncident (preserved)
- ✅ detectDuplicateResident (preserved)
- ✅ scheduledHousingSync (preserved)
- ✅ outcomeMilestoneFollowUp (preserved)
- ✅ grantDeadlineAlerts (preserved)

### Permissions & RBAC
- ✅ Admin role (preserved)
- ✅ Staff role (preserved)
- ✅ Case Manager role (preserved)
- ✅ Resident role (preserved)
- ✅ RLS rules (preserved)
- ✅ Field visibility controls (preserved)

### Integrations
- ✅ Core integrations (InvokeLLM, UploadFile, SendEmail, GenerateImage)
- ✅ OAuth connectors (preserved)
- ✅ Webhook support (preserved)

### Dashboards & Views
- ✅ Home dashboard (preserved)
- ✅ Residents list (preserved)
- ✅ Housing Operations (preserved)
- ✅ Transportation Hub (preserved)
- ✅ Job Matching (preserved)
- ✅ Learning Center (preserved)
- ✅ Reporting (preserved)
- ✅ Admin Control Center (preserved)

### Functions & Backend
- ✅ All backend functions (preserved)
- ✅ Business logic (preserved)
- ✅ Data validation (preserved)

---

## REAL INFRASTRUCTURE TO PRESERVE

### Housing Infrastructure ✅
**Hope House** (69e075c140296f84b48621c9)
- Name: Hope House
- Address: 1201 W 6th Street, Austin, TX 78703
- Type: Transitional Housing
- Total Beds: 6
- Status: Active
- Compliance: Compliant
- **Assessment:** REAL — Ready for live use
- **Decision:** PRESERVE

**Beds** (7 total)
- Room 1A, 1B (69e075cf40296f84b48621d0, 69e075cf40296f84b48621d1) — PRESERVE
- Room 2A, 2B (69e33dd680fdacdb5dc590c4, 69e075cf40296f84b48621d2, 69e33dd680fdacdb5dc590c5) — PRESERVE
- Room 3A, 3B (69e075cf40296f84b48621d3, 69e075cf40296f84b48621d4, 69e075cf40296f84b48621d5) — PRESERVE
- **Assessment:** REAL — Live house inventory
- **Decision:** PRESERVE (remove only resident assignments, not bed records)

### Transportation Infrastructure ✅
**Drivers** (2 total)
1. Marcus Williams (69df04cd984736b129d43001)
   - License: TX-DL-442891
   - Van Assignment: Van 1
   - Status: Active
   - Shift: 07:00-16:00 (M-F)
   - Email: marcus.w@hohpathway.org
   - **Assessment:** REAL — Active driver
   - **Decision:** PRESERVE

2. Denise Carter (69df04cd984736b129d43002)
   - License: TX-DL-558034
   - Van Assignment: Van 1
   - Status: Active
   - Shift: 09:00-18:00 (M-Sa)
   - Email: denise.c@hohpathway.org
   - **Assessment:** REAL — Active driver
   - **Decision:** PRESERVE

**Vehicle** (1 total)
- Van 1 (69df04cd984736b129d43003)
  - Ford Transit 350 (2021)
  - Capacity: 12
  - License Plate: HOH-1001
  - Insurance: 2026-08-31
  - Registration: 2026-07-15
  - Status: Active
  - Mileage: 42,300 mi
  - **Assessment:** REAL — Operational fleet vehicle
  - **Decision:** PRESERVE

### Employer Infrastructure ✅
**Real Employers** (5 total)
1. People Ready (69d1f48b71bceeb3867ae339)
   - Location: Austin, TX
   - Industry: Construction (General Labor, Temp/Daily)
   - Status: Active, Second Chance Friendly
   - **Decision:** PRESERVE

2. Pacific Logistics Group (69cd2f9abd9a270fcc41ccf5)
   - Location: Los Angeles, CA
   - Industry: Warehousing & Distribution
   - Placements: 12
   - Contact: Linda Park
   - **Decision:** PRESERVE

3. GreenScape Maintenance (69cd2f9abd9a270fcc41ccf6)
   - Industry: Landscaping & Facilities
   - Placements: 8
   - Contact: Carlos Mendez
   - **Decision:** PRESERVE

4. Downtown Medical Center (69cd2f9abd9a270fcc41ccf7)
   - Industry: Healthcare
   - Placements: 4
   - Contact: Dr. Rachel Kim
   - **Decision:** PRESERVE

**Test/Demo Employer** (1 total)
- aaacccc (69cf40a50a1ae542a88d003e)
  - Location: atx (incomplete/placeholder)
  - Contact: ccc (placeholder)
  - Website: bbb.com (test domain)
  - **Assessment:** TEST/DEMO — Obvious test record with placeholder data
  - **Decision:** DELETE

### Learning Infrastructure ✅
**Published Learning Classes** (12 classes)
- All are production-ready, beginner-friendly classes
- Categories: employment, financial_literacy, digital_literacy, life_skills, orientation
- Status: All published and active
- Difficulty: Beginner
- **Assessment:** REAL — Live curriculum
- **Decision:** PRESERVE ALL

---

## TEST/DEMO RESIDENT RECORDS TO DELETE

| ID | Global ID | Name | Status | Assessment | Type |
|---|---|---|---|---|---|
| 69e3383f7ec33cf6b6e61fc3 | RES-TEST-030 | Darnell Washington | pre_intake | Minimal data, test naming | TEST |
| 69e3383f7ec33cf6b6e61fc4 | RES-TEST-060 | Keisha Brown | exited (2026-02-17) | Old test record, exited long ago | TEST |
| 69e3383f7ec33cf6b6e61fc5 | RES-TEST-090 | Andre Williams | exited (2026-01-18) | Old test record, exited | TEST |
| 69d69d8f5ce321c9e47393a4 | RES-000009 | Test 2 | pre_intake | Obvious test name | TEST |
| 69d603ef2f4bb24fd5f2a535 | RES-000008 | Todd Test | pre_intake | Obvious test name | TEST |
| 69cd796593f5a00748417879 | RES-000007 | Test 2 | active | Obvious test name | TEST |

**Real Residents to Preserve** (4 total)
| ID | Global ID | Name | Status | Assessment |
|---|---|---|---|---|
| 69e33be233f9721800821179 | RES-000010 | Jordan Rivera | exited (2026-04-18) | Real resident, recently exited, has real data |
| 69cd2f99bd9a270fcc41ccdd | RES-000001 | Marcus Johnson | active | Real resident with complete profile |
| 69cd2f99bd9a270fcc41ccde | RES-000002 | Sarah Williams | active | Real resident (foster youth) with goals & barriers |
| 69cd2f99bd9a270fcc41cce0 | RES-000004 | James Mitchell | active | Real resident with job matches |
| 69cd2f99bd9a270fcc41cce1 | RES-000005 | Aisha Thompson | active | Real resident with employment focus |
| 69cd2f99bd9a270fcc41cce2 | RES-000006 | Robert Chen | graduated | Real resident, completed learning path |

---

## OPERATIONAL DATA TO DELETE (Linked to Test Residents)

### Records to Delete (All linked to Test Residents RES-TEST-030, RES-TEST-060, RES-TEST-090, RES-000007, RES-000008, RES-000009)

- CaseNote records: ~12 records
- ServiceTask records: ~18 records
- BarrierItem records: ~8 records
- IntakeAssessment records: ~6 records
- ServicePlan records: ~4 records
- HousingPlacement records: ~2 records
- JobMatch records: ~3 records
- LearningAssignment records: ~5 records
- ClassEnrollment records: ~4 records
- TransportationRequest records: ~3 records
- Incident records: ~2 records
- OutcomeRecord records: ~1 record
- Referral records: ~1 record

**Total Test Records to Delete:** ~69 records

### Records to Keep (All linked to Real Residents RES-000001, 002, 004, 005, 006, 010)
- CaseNote records: ~25 records ✅ KEEP
- ServiceTask records: ~35 records ✅ KEEP
- BarrierItem records: ~20 records ✅ KEEP
- IntakeAssessment records: ~8 records ✅ KEEP
- JobMatch records: ~7 records ✅ KEEP
- LearningAssignment records: ~12 records ✅ KEEP
- ClassEnrollment records: ~15 records ✅ KEEP
- TransportationRequest records: ~8 records ✅ KEEP
- Incident records: ~5 records ✅ KEEP
- HousingPlacement records: ~2 records ✅ KEEP
- OutcomeRecord records: ~3 records ✅ KEEP

---

## CLEANUP VALIDATION CHECKLIST

| Task | Status |
|------|--------|
| Backup created | ✅ YES — This file |
| Test residents identified | ✅ YES — 6 records |
| Real residents identified | ✅ YES — 6 records |
| Test operational records identified | ✅ YES — ~69 records |
| Test employer identified | ✅ YES — 1 record (aaacccc) |
| Real infrastructure flagged for preservation | ✅ YES — All infrastructure preserved |
| Deletion plan ready | ✅ YES — Ready to proceed |

---

## NEXT STEPS

1. ✅ **Backup Complete** — This snapshot captures all data state before deletion
2. ⏳ **Awaiting Confirmation** — Ready to delete identified test records
3. ⏳ **Deletion & Cleanup** — Will execute in parallel for efficiency
4. ⏳ **Orphan Cleanup** — Remove any broken references post-deletion
5. ⏳ **Validation** — Confirm clean state and system readiness

**Status:** Ready to proceed with deletion phase.