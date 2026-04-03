# Intake-to-Resident Identity & Contact Sync — Complete Implementation

**Status:** ✅ COMPLETE  
**Date:** April 3, 2026

---

## Summary

All required identity and contact fields are now:
1. ✅ **Collected** in the intake form with actual input fields (email, phone, date_of_birth, preferred_name, pronouns, language, gender, emergency contact, SSN last 4)
2. ✅ **Written back** to the Resident record on both partial saves (step navigation) and completion
3. ✅ **Displayed** on the Resident Identity & Contact card with role-based visibility
4. ✅ **Backfillable** for existing residents via admin function
5. ✅ **Secured** with restricted display for sensitive fields (ssn_last4)

---

## What Was Changed

### 1. Intake Form — PersonalStep Component
**File:** `components/intake/steps/PersonalStep.jsx`

Added SSN last 4 field with validation:
- Accepts only 4 digits
- Stores safely without full SSN
- Sanitized input (removes non-numeric characters)
- Description field attached to guide users

### 2. Intake Field Row Component
**File:** `components/intake/IntakeFieldRow.jsx`

Enhanced TextField to support:
- `description` prop for helper text
- `maxLength` attribute for input constraints
- Full support for SSN last 4 conditional display

### 3. IntakeForm Write-Back Logic
**File:** `pages/intake/IntakeForm.jsx`

Updated to sync all identity/contact fields:
- On partial save (step navigation): Writes email, phone, date_of_birth, ssn_last4, emergency contact
- On completion: Includes all above + intake_date, expected_exit_date (auto-calculated as 90 days), job_readiness_score, status

**Key calculations:**
```javascript
// On completion:
intake_date = today's date
expected_exit_date = intake_date + 90 days (auto-calculated)
```

### 4. Resident Entity Schema
**File:** `entities/Resident.json`

Added field:
```json
"ssn_last4": {
  "type": "string",
  "description": "Last 4 digits of SSN for identity verification only. Do not display in public views."
}
```

### 5. IntakeAssessment Entity Schema
**File:** `entities/IntakeAssessment.json`

Added identity fields to personal section:
- first_name, last_name, preferred_name, email, phone, date_of_birth, ssn_last4, pronouns, gender_identity, primary_language, interpreter_needed

### 6. Backfill Function
**File:** `functions/backfillIntakeToResident.js`

New admin-only function that:
- Scans completed IntakeAssessment records
- Maps all identity/contact fields to Resident record
- Only updates missing fields (non-destructive)
- Includes gender normalization (transgender_male → male, etc.)
- Returns detailed report of updated residents

**Usage:**
```bash
POST /backend/backfillIntakeToResident
# All residents:
{}
# Specific resident:
{"residentId": "abc123"}
```

### 7. Resident Card Display
**File:** `components/resident/ResidentOverviewTab.jsx`

Updated Identity & Contact card to show:
- Email
- Phone
- Date of Birth
- Pronouns
- Gender
- Primary Language
- SSN Last 4 (admin-only, masked as ●●●●1234)

Role-based visibility ensures ssn_last4 only displays for admin users.

---

## Field Collection Matrix

| Field | Step | Input Type | Write-Back |
|-------|------|-----------|-----------|
| first_name | Personal | Text | Both |
| last_name | Personal | Text | Both |
| preferred_name | Personal | Text | Both |
| email | Personal | Email | Both |
| phone | Personal | Tel | Both |
| date_of_birth | Personal | Date | Both |
| pronouns | Personal | Select | Both |
| gender_identity | Personal | Select | Both |
| primary_language | Personal | Select | Both |
| ssn_last4 | Personal | Text (4 digits) | Both |
| emergency_contact_name | Emergency Contact | Text | Both |
| emergency_contact_phone | Emergency Contact | Tel | Both |
| intake_date | Auto | — | Completion only |
| expected_exit_date | Auto | — | Completion only (90 days) |

---

## Security & Privacy

### SSN Last 4 Handling
- **Storage:** Only last 4 digits stored, full SSN never collected
- **Validation:** Numeric-only input, length 4
- **Display:** Masked format (●●●●1234) and admin-only visibility
- **Use Case:** Identity verification + duplicate prevention support only
- **Never displayed in:** General resident cards, employer views, limited-access portals

### Field Visibility Control
Uses `canViewField()` helper to enforce role-based visibility:
- **Admin:** Full access to all fields including ssn_last4
- **Case Manager:** Access to identity/contact but NOT ssn_last4
- **Employer/Public:** Only name, status, program info (no contact details)

---

## Expected Exit Date Auto-Calculation

When intake is completed:
```javascript
intake_date = today (YYYY-MM-DD)
expected_exit_date = intake_date + 90 days (YYYY-MM-DD)
```

This provides a default 90-day program duration. Staff can manually override on the Resident profile if needed.

---

## Backfill Procedure (for existing residents)

To sync old intake data into Resident records:

1. **In dashboard:** Functions → backfillIntakeToResident
2. **Run with empty payload:** `{}`
3. **Results show:** Each resident updated + fields synced
4. **Non-destructive:** Only fills empty Resident fields

Example result:
```json
{
  "total_assessments": 50,
  "results": [
    {
      "resident_id": "123",
      "name": "John Doe",
      "status": "updated",
      "fields_updated": ["first_name", "email", "phone", "date_of_birth", "gender", "ssn_last4"]
    }
  ]
}
```

---

## Verification Checklist

✅ **Intake form:** Collects email, phone, date_of_birth, pronouns, gender, language, ssn_last4  
✅ **Partial save:** Writes to Resident on every step navigation  
✅ **Completion:** Auto-calculates intake_date and expected_exit_date (+90 days)  
✅ **Write-back:** All fields sync to Resident record correctly  
✅ **Display:** Resident card shows all fields (with role-based ssn_last4 visibility)  
✅ **Backfill:** Admin function syncs existing resident data  
✅ **Security:** SSN last 4 masked and admin-only  

---

## Testing Scenario

1. Open `/intake/{residentId}/form` for a resident
2. Fill PersonalStep with:
   - Email: jane@example.com
   - Phone: +1-555-0123
   - Date of Birth: 1995-05-10
   - SSN Last 4: 1234
3. Click "Next" → data saves to Resident
4. Navigate to `/residents/{residentId}`
5. Verify on Identity & Contact card:
   - ✅ Email displays: jane@example.com
   - ✅ Phone displays: +1-555-0123
   - ✅ DOB displays: 1995-05-10
   - ✅ SSN Last 4 displays (admin only): ●●●●1234
6. Complete intake → intake_date + expected_exit_date auto-populated
7. Verify on profile card:
   - ✅ Intake Date: today
   - ✅ Expected Exit: today + 90 days

---

## Files Modified/Created

**Created:**
- `functions/backfillIntakeToResident.js` — Admin backfill function

**Modified:**
- `components/intake/steps/PersonalStep.jsx` — Added SSN last 4 field
- `components/intake/IntakeFieldRow.jsx` — Enhanced TextField with description + maxLength
- `pages/intake/IntakeForm.jsx` — Added ssn_last4 write-back
- `entities/Resident.json` — Added ssn_last4 field
- `entities/IntakeAssessment.json` — Added identity fields to personal section
- `components/resident/ResidentOverviewTab.jsx` — Added ssn_last4 display (admin-only)

---

## Summary

The intake-to-resident sync is now **fully functional and production-ready**:
- All identity/contact fields collected with real inputs
- All fields written back to Resident on save
- Expected exit date auto-calculated (90 days)
- SSN last 4 collected safely and displayed securely
- Existing residents can be backfilled in bulk
- Role-based field visibility enforced