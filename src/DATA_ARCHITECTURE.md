# Data Architecture: Resident Contact & Profile Fields

## Source of Truth
The **Resident** entity is the authoritative source for all contact and identity information:

| Field | Type | Source | Sync From |
|-------|------|--------|-----------|
| email | string | IntakeAssessment.personal.email | Intake form |
| phone | string | IntakeAssessment.personal.phone | Intake form |
| date_of_birth | date | IntakeAssessment.personal.date_of_birth | Intake form |
| pronouns | enum | IntakeAssessment.personal.pronouns | Intake form |
| gender | enum | IntakeAssessment.personal.gender_identity | Intake form |
| primary_language | enum | IntakeAssessment.personal.primary_language | Intake form |
| emergency_contact_name | string | IntakeAssessment.emergency_contact.name | Intake form |
| emergency_contact_phone | string | IntakeAssessment.emergency_contact.phone | Intake form |

## Data Flow

### 1. Intake Completion
When intake is completed:
1. IntakeAssessment record is created/updated with personal data
2. IntakeForm extracts ALL contact fields from `formData.personal` and `formData.emergency_contact`
3. Fields are written to Resident record via `base44.entities.Resident.update()`
4. Cache is invalidated: `['resident', residentId]` and `['residents']`
5. User is redirected to ResidentProfile

### 2. Resident Profile Edit
When editing fields in ResidentProfile Overview tab:
1. EditableField captures changes to Resident record
2. Calls `base44.entities.Resident.update()` directly
3. Cache is invalidated automatically
4. Display updates immediately

### 3. Backfill Existing Data
For residents with IntakeAssessment but empty Resident fields:
- Backend function `backfillResidentContactData()` runs (admin-only)
- Copies values from IntakeAssessment to Resident record
- Already completed on first run: processed 7 residents, backfilled 1

## Display Components

### ResidentCard (components/shared/ResidentCard.jsx)
Reusable component for displaying resident summaries:
- Shows email, phone from Resident record
- Shows population, risk level, status
- Shows job readiness score and progress
- Used in: Residents list, StaffDashboard, resident lists across app

### ResidentOverviewTab (components/resident/ResidentOverviewTab.jsx)
Detailed profile view with edit capability:
- Identity & Contact section: email, phone, DOB, pronouns, gender, language
- Program Info section: status, population, case manager, exit dates
- Emergency Contact section
- All fields editable by case managers

### IntakeForm (pages/intake/IntakeForm.jsx)
On completion, extracts and writes back:
```javascript
if (formData.personal?.email) residentUpdates.email = formData.personal.email;
if (formData.personal?.phone) residentUpdates.phone = formData.personal.phone;
if (formData.personal?.date_of_birth) residentUpdates.date_of_birth = formData.personal.date_of_birth;
if (formData.personal?.pronouns) residentUpdates.pronouns = formData.personal.pronouns;
if (formData.personal?.gender_identity) residentUpdates.gender = formData.personal.gender_identity;
if (formData.personal?.primary_language) residentUpdates.primary_language = formData.personal.primary_language;
// Emergency contact fields also synced
```

## PersonalStep (components/intake/steps/PersonalStep.jsx)
Captures all identity/profile data:
- Email (required for contact info)
- Phone (required for contact info)
- Date of Birth (identity field)
- Pronouns (with "other" option)
- Gender Identity (multiple options)
- Primary Language (with "other" option)
- Race/Ethnicity (multi-select)
- Interpreter Needed (boolean)

## Verification Checklist

After completing intake for a resident:
- [ ] Email visible on ResidentOverviewTab
- [ ] Phone visible on ResidentOverviewTab
- [ ] Date of Birth visible
- [ ] Pronouns saved correctly
- [ ] Gender saved correctly
- [ ] Primary Language saved correctly
- [ ] Emergency Contact visible
- [ ] Email/Phone visible on ResidentCard in Residents list
- [ ] Refresh page → data still visible
- [ ] Edit email in profile → updates Resident record
- [ ] Check other staff members' view → same data visible

## Architecture Rules

1. **Resident is Source of Truth**: Never read contact fields from IntakeAssessment in UI
2. **Write Back on Completion**: IntakeForm always syncs to Resident on completion
3. **Backfill Existing**: Run backfill function once per deployment for historical data
4. **Cache Invalidation**: Always invalidate `['resident', id]` and `['residents']` after updates
5. **No Stale Data**: Display components read from Resident record, not intake
6. **Profile Edits Direct**: ResidentOverviewTab edits go directly to Resident, no intermediate sync needed

## Related Functions

- `functions/backfillResidentContactData.js` - One-time admin function to sync historical intake data
- `lib/residentIdentity.js` - Utilities for resident identification (global_resident_id)
- `lib/rbac.js` - Role-based access control for editing permissions