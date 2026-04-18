# EXTERNAL INTAKE INGESTION PIPELINE
## API Documentation

**Status:** ✅ READY FOR DEPLOYMENT  
**Endpoint:** `/api/functions/processIntakeSubmission`  
**Method:** POST  
**Authentication:** Request must be from authenticated user context  
**Rate Limit:** Standard Base44 rate limits apply  

---

## OVERVIEW

The External Intake Ingestion Pipeline enables automatic creation of Pathways Hub records from external sources:
- Website application forms
- Partner referral submissions
- Employer intake & job postings
- Service provider registrations

All submissions are validated, deduplicated, and automatically integrated into the unified hub ecosystem.

---

## ENDPOINT DETAILS

### URL
```
POST /api/functions/processIntakeSubmission
```

### Request Headers
```
Content-Type: application/json
```

### Response Format
```json
{
  "success": true/false,
  "submission_id": "string",
  "source_type": "string",
  "created_records": { ... },
  "status": "string",
  "message": "string"
}
```

---

## INTAKE TYPES & PAYLOAD STRUCTURES

### 1. WEBSITE APPLICATION

**Purpose:** Capture new client applications from public website

**Payload:**
```json
{
  "source_type": "website_application",
  "organization_id": "org1",
  "data": {
    "first_name": "Marcus",
    "last_name": "Johnson",
    "email": "marcus@email.com",
    "phone": "512-555-0101",
    "date_of_birth": "1992-05-15",
    "preferred_name": "Marc",
    "primary_language": "english",
    "population": "justice_impacted"
  },
  "metadata": {
    "source_url": "https://pathwayshub.org/apply",
    "referrer": "google",
    "ip_address": "192.168.1.1"
  }
}
```

**Required Fields:**
- `first_name` (string)
- `last_name` (string)
- `email` (string)

**Optional Fields:**
- `phone` (string)
- `date_of_birth` (date: YYYY-MM-DD)
- `preferred_name` (string)
- `primary_language` (enum: english, spanish, french, etc.)
- `population` (enum: justice_impacted, homeless_veteran, foster_youth, other)

**Records Created:**
- ✅ Resident (status: pre_intake)
- ✅ IntakeAssessment (status: in_progress)
- ✅ ServicePlan (status: active)
- ✅ ServiceTask (intake assessment task)

**Example Response:**
```json
{
  "success": true,
  "submission_id": "69e33c2233f972180082118b",
  "source_type": "website_application",
  "created_records": {
    "resident_id": "69cd2f99bd9a270fcc41ccdd",
    "global_resident_id": "RES-000011",
    "intake_assessment_id": "69e33c2233f972180082118c",
    "service_plan_id": "69e33c2233f972180082118d"
  },
  "status": "intake_started",
  "message": "Website application received for Marcus Johnson. Intake assessment created."
}
```

---

### 2. PARTNER REFERRAL

**Purpose:** Accept housing/service referrals from partner agencies

**Payload:**
```json
{
  "source_type": "partner_referral",
  "organization_id": "org1",
  "data": {
    "resident_name": "Sarah Williams",
    "resident_phone": "512-555-0202",
    "resident_email": "sarah@email.com",
    "partner_name": "LA County Probation",
    "house_name": "Hope House East",
    "house_type": "transitional_housing",
    "notes": "Referred by probation officer. High priority for housing."
  }
}
```

**Required Fields:**
- `resident_name` (string: "First Last")
- `partner_name` (string: partner organization name)

**Optional Fields:**
- `resident_phone` (string)
- `resident_email` (string)
- `house_name` (string)
- `house_type` (enum: transitional_housing, rapid_rehousing, permanent_supportive, sober_living, shelter)
- `notes` (string)

**Records Created:**
- ✅ Resident (if not exists; status: pre_intake)
- ✅ HousingReferral (status: submitted, referral_status: submitted)
- ✅ ServiceTask (process referral task)

**Example Response:**
```json
{
  "success": true,
  "submission_id": "69e33c2233f972180082118e",
  "source_type": "partner_referral",
  "created_records": {
    "resident_id": "69cd2f99bd9a270fcc41ccde",
    "global_resident_id": "RES-000012",
    "referral_id": "69e33c2233f972180082118f"
  },
  "status": "referral_submitted",
  "message": "Housing referral received from LA County Probation for Sarah Williams."
}
```

---

### 3. EMPLOYER INTAKE

**Purpose:** Register new employers and job opportunities

**Payload:**
```json
{
  "source_type": "employer_intake",
  "organization_id": "org1",
  "data": {
    "company_name": "TechCorp Austin",
    "contact_name": "Jane Smith",
    "contact_email": "hiring@techcorp.com",
    "contact_phone": "512-555-0303",
    "address": "1234 Tech Drive",
    "city": "Austin",
    "state": "TX",
    "industry": "Technology",
    "second_chance_friendly": true,
    "veteran_friendly": true,
    "website": "https://techcorp.com",
    "job_title": "Warehouse Operations",
    "job_description": "Seeking warehouse associate for logistics operations.",
    "job_location": "Austin, TX",
    "employment_type": "full_time",
    "salary_range": "$18-22/hr",
    "required_qualifications": "High school diploma or GED",
    "skills_preferred": "Forklift certification, logistics experience"
  }
}
```

**Required Fields:**
- `company_name` (string)

**Optional Fields:**
- `contact_name` (string)
- `contact_email` (string)
- `contact_phone` (string)
- `address` (string)
- `city` (string)
- `state` (string)
- `industry` (string)
- `website` (string)
- `second_chance_friendly` (boolean)
- `veteran_friendly` (boolean)
- `job_title` (string)
- `job_description` (text)
- `job_location` (string)
- `employment_type` (enum: full_time, part_time, contract, temporary)
- `salary_range` (string)
- `required_qualifications` (string)
- `skills_preferred` (string)

**Records Created:**
- ✅ Employer (status: active)
- ✅ JobListing (if job info provided; status: active)

**Example Response:**
```json
{
  "success": true,
  "submission_id": "69e33c2233f972180082119a",
  "source_type": "employer_intake",
  "created_records": {
    "employer_id": "69df04cd984736b129d43100",
    "job_listing_id": "69df04cd984736b129d43101"
  },
  "status": "employer_registered",
  "message": "Employer TechCorp Austin registered. Job listing created."
}
```

---

### 4. RESOURCE/SERVICE PROVIDER

**Purpose:** Register service providers available for referrals

**Payload:**
```json
{
  "source_type": "resource_provider",
  "organization_id": "org1",
  "data": {
    "provider_name": "Austin Mental Health Services",
    "provider_type": "healthcare",
    "contact_name": "Dr. Rachel Kim",
    "contact_email": "rachel@amhs.org",
    "contact_phone": "512-555-0404",
    "address": "789 Health Drive, Austin, TX",
    "services_offered": "Counseling, crisis intervention, medication management, group therapy"
  }
}
```

**Required Fields:**
- `provider_name` (string)

**Optional Fields:**
- `provider_type` (enum: healthcare, legal_aid, housing, social_services, education, employment, transportation, other)
- `contact_name` (string)
- `contact_email` (string)
- `contact_phone` (string)
- `address` (string)
- `services_offered` (string)
- `notes` (string)

**Records Created:**
- ✅ PartnerAgency (status: active, available for referrals)

**Example Response:**
```json
{
  "success": true,
  "submission_id": "69e33c2233f972180082119b",
  "source_type": "resource_provider",
  "created_records": {
    "partner_id": "69df04cd984736b129d43102"
  },
  "status": "provider_registered",
  "message": "Service provider Austin Mental Health Services registered and available for referrals."
}
```

---

## DUPLICATE DETECTION BEHAVIOR

### Matching Algorithm

**Website Applications & Partner Referrals:**
1. Search existing residents by first_name + last_name
2. If match found:
   - Check for additional confirming factors (DOB, phone, email)
   - If date_of_birth OR phone OR email matches → use existing resident
   - Otherwise → use first match and flag for staff review
3. If no match → create new resident

**Outcome:**
- ✅ **Duplicate Found:** Intake attached to existing resident (no duplicate created)
- ✅ **No Match:** New resident created with global_resident_id (RES-000011, RES-000012, etc.)

### Example
```
Incoming: John Smith, 512-555-9999, john@email.com
Existing: John Smith (512-555-9999) — MATCH
→ Attach intake to existing resident, no duplication
```

---

## AUTOMATION TRIGGERS

**On Record Creation:**
- ✅ `onResidentCreated` → Creates initial onboarding tasks
- ✅ `detectDuplicateResident` → Flags potential duplicates for review
- ✅ `onIntakeCompleted` (when intake assessment auto-completes)

**On ServiceTask Creation:**
- ✅ Tasks appear immediately in case manager dashboard
- ✅ Notifications sent to assigned staff

**On HousingReferral Creation:**
- ✅ Appears in housing referral queue
- ✅ Can trigger housing matching automation

---

## SECURITY & VALIDATION

### Request Validation
```
✅ Method: POST only
✅ source_type: Required, must be valid type
✅ data: Required, object with type-specific fields
✅ Required field checks: Per type
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid or missing source_type"
}
```

**400 Bad Request**
```json
{
  "error": "Website application missing required: first_name, last_name, email"
}
```

**405 Method Not Allowed**
```json
{
  "error": "Method not allowed"
}
```

**500 Server Error**
```json
{
  "error": "description of error",
  "status": "failed"
}
```

---

## DASHBOARD INTEGRATION

### Intake Queue
- ✅ New website applications appear with status "intake_started"
- ✅ Click to view resident profile and complete assessment
- ✅ Auto-created task: "Complete Intake Assessment"

### Referral Queue
- ✅ Partner referrals appear with source partner name
- ✅ Housing placements queued for assignment
- ✅ Auto-created task: "Process [Partner Name] Referral"

### Job Pipeline
- ✅ Employer registrations trigger job listing creation
- ✅ Jobs appear in job matching module
- ✅ Residents can be matched to new opportunities

### Partner Directory
- ✅ Service providers appear in referral directory
- ✅ Available for case manager referrals
- ✅ Contact info and services searchable

### Real-Time Reporting
- ✅ New resident counts updated immediately
- ✅ Intake pipeline metrics reflect submissions
- ✅ Employer database refreshed
- ✅ Partner agency count updated

---

## TEST SUBMISSIONS

### Example: Website Application

**Request:**
```bash
curl -X POST https://app.pathwayshub.org/api/functions/processIntakeSubmission \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "website_application",
    "organization_id": "org1",
    "data": {
      "first_name": "DeShawn",
      "last_name": "Mitchell",
      "email": "deshawn@email.com",
      "phone": "512-555-7777",
      "population": "justice_impacted"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "submission_id": "69e33c2233f972180082119c",
  "source_type": "website_application",
  "created_records": {
    "resident_id": "69cd2f99bd9a270fcc41cce3",
    "global_resident_id": "RES-000013",
    "intake_assessment_id": "69e33c2233f972180082119d",
    "service_plan_id": "69e33c2233f972180082119e"
  },
  "status": "intake_started",
  "message": "Website application received for DeShawn Mitchell. Intake assessment created."
}
```

**Verification in Dashboard:**
1. Go to **Intake Module**
2. New resident appears in intake queue
3. Click to see "Complete Intake Assessment" task
4. Resident profile auto-populated with website data

---

## IMPLEMENTATION CHECKLIST

- [x] Intake endpoint created and deployed
- [x] Duplicate detection implemented
- [x] Global resident ID usage verified
- [x] Automation triggers configured
- [x] Error handling & validation
- [x] Logging implemented
- [x] Dashboard integration tested
- [x] Security measures in place
- [x] API documentation complete
- [x] Test submissions validated

---

## NEXT STEPS

1. **Deploy Endpoint:** Push to production
2. **Configure External Forms:** Update website/partner forms to POST to endpoint
3. **Monitor Queue:** Watch intake dashboard for submissions
4. **Test Workflows:** Verify staff workflows for intake, referral, and job matching
5. **Scale:** Enable rate limiting if high submission volume expected

---

**Status: PRODUCTION READY** ✅