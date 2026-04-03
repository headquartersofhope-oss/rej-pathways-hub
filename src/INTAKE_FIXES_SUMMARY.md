# Intake Form & Resident Profile Fixes Summary

## Issues Fixed

### 1. ✅ Intake Form Field Collection
- **PersonalStep** now explicitly collects:
  - `first_name` (added)
  - `last_name` (added)
  - `preferred_name` (already present)
  - `email` (already present, direct text input)
  - `phone` (already present, direct text input)
  - `date_of_birth` (already present, date input)
  - `pronouns` with "other" option (already present)
  - `primary_language` with "other" option (already present)
  - `gender_identity` (already present)
  - Emergency contact name & phone (separate step)
- All fields collect actual values, not just yes/no responses

### 2. ✅ Write-back to Resident Record
**IntakeForm** now syncs these fields on EVERY save:
- Profile fields during partial saves (step navigation)
- All identity/contact fields on intake completion
- Expected exit date calculation (90 days from intake_date)

Write-back occurs at two points:
1. **Partial save** (`handleSave`): Syncs personal & emergency contact data
2. **Completion** (`handleComplete`): Syncs all fields + calculates expected_exit_date

### 3. ✅ Resident Identity & Contact Display
**ResidentOverviewTab** displays all synced fields:
- Resident ID
- Full Name (first + last)
- Preferred Name
- Email (editable)
- Phone (editable)
- Date of Birth (editable)
- Pronouns (editable)
- Gender (editable)
- Primary Language (editable)
- Emergency Contact (editable)

All fields are now sourced from the Resident record, not from intake.

### 4. ✅ Expected Exit Date Logic
- Auto-calculated as 90 days from `intake_date` when intake is completed
- Stored in `Resident.expected_exit_date`
- Editable in ResidentOverviewTab
- **Backfill function** available: `backfillExpectedExitDates` for existing residents

### 5. ✅ Role-Based Field Visibility
**New utility file**: `lib/fieldVisibility.js`

Defines visibility rules for each role:
- **admin**: Full access to all fields
- **case_manager**: Full access to assigned residents
- **probation_officer**: Limited to identity/name/status only, NO contact info
- **resident**: Can view own identity/contact/program info
- **default**: Minimal/no access

Applied to:
- **ResidentOverviewTab**: Conditionally renders fields based on `userRole` prop
- **ResidentCard**: Conditionally shows email/phone based on `userRole` prop

### 6. ✅ ResidentCard Visibility
- Added `userRole` and `showContact` props
- Contact info (email/phone) only shows if:
  - `showContact={true}` (default)
  - User has permission to view contact fields (via `canViewField`)
- Safe for use in external portals (set `showContact={false}`)

### 7. ✅ Refresh & Sync Behavior
- After partial save: Resident record invalidated, refreshes on next query
- After intake completion: All related caches invalidated
- Profile values persist across page refreshes (stored in Resident record)

### 8. ✅ Verification Steps
To verify the complete flow:

```
1. Start intake for a new resident
2. Enter in Personal step:
   - First name: "John"
   - Last name: "Doe"
   - Preferred name: "Johnny"
   - Email: "john@example.com"
   - Phone: "+1-555-0100"
   - Date of Birth: "1990-01-15"
   - Pronouns: "He/Him"
   - Gender: "Male"
   - Primary Language: "English"
3. Continue through remaining intake steps
4. Complete intake → expected_exit_date set to 90 days later
5. Navigate to Resident Profile
6. Check Identity & Contact section:
   ✓ Resident ID visible
   ✓ Full Name: "John Doe"
   ✓ Preferred Name: "Johnny"
   ✓ Email: "john@example.com"
   ✓ Phone: "+1-555-0100"
   ✓ Date of Birth: "1990-01-15"
   ✓ Pronouns: "He/Him"
   ✓ Gender: "Male"
   ✓ Primary Language: "English"
7. Check Program Info section:
   ✓ Intake Date: today's date
   ✓ Expected Exit: 90 days from today
8. Refresh the page
   ✓ All values still visible
9. Edit email in Identity & Contact
   ✓ Updates immediately
10. Log in as case_manager
    ✓ Still sees all fields
11. Log in as probation_officer
    ✓ Only sees: ID, first/last name, status
    ✗ Does NOT see: email, phone, emergency contact
```

## Files Modified

1. **components/intake/steps/PersonalStep.jsx**
   - Added `first_name` and `last_name` fields

2. **pages/intake/IntakeForm.jsx**
   - Updated `handleSave`: Syncs profile fields during partial saves
   - Updated `handleComplete`: Calculates expected_exit_date (90 days), syncs all fields

3. **components/resident/ResidentOverviewTab.jsx**
   - Added `userRole` prop
   - Added role-based visibility checks using `canViewField`
   - Emergency contact section now conditionally rendered

4. **pages/ResidentProfile.jsx**
   - Passes `userRole={user?.role}` to ResidentOverviewTab

5. **components/shared/ResidentCard.jsx**
   - Added `userRole` and `showContact` props
   - Contact info visibility now respects role-based rules

## Files Created

1. **lib/fieldVisibility.js**
   - `getFieldVisibilityForRole(userRole)`: Get field rules for a role
   - `canViewField(userRole, fieldName, fieldCategory)`: Check if field is visible
   - `filterResidentForRole(resident, userRole)`: Filter resident data by role
   - `getRestrictedFields()`: List of restricted field names
   - `isFieldRestricted(fieldName)`: Check if field is restricted

2. **functions/backfillExpectedExitDates.js**
   - Admin-only function to backfill expected_exit_date for existing residents
   - Calculates 90 days from intake_date for all residents missing expected_exit_date
   - Safe to run multiple times (only updates if field is missing)

## Data Architecture

**Resident record is the source of truth** for:
- Identity: first_name, last_name, preferred_name, date_of_birth, gender, pronouns, primary_language
- Contact: email, phone
- Emergency: emergency_contact_name, emergency_contact_phone
- Program: intake_date, expected_exit_date, status

**IntakeAssessment stores intake survey responses** but profile fields are synced to Resident.

## Role Visibility Rules

| Field | Admin | Case Manager | Probation Officer | Resident | External |
|-------|-------|--------------|-------------------|----------|----------|
| Email | ✓ | ✓ | ✗ | ✓ | ✗ |
| Phone | ✓ | ✓ | ✗ | ✓ | ✗ |
| Date of Birth | ✓ | ✓ | ✗ | ✓ | ✗ |
| Emergency Contact | ✓ | ✓ | ✗ | ✓ | ✗ |
| Expected Exit Date | ✓ | ✓ | ✗ | ✗ | ✗ |
| Identity (name/pronouns) | ✓ | ✓ | ✓ | ✓ | ✗ |

## Testing Checklist

- [ ] Complete intake with all personal fields filled in
- [ ] Verify email/phone appear in ResidentOverviewTab
- [ ] Verify expected_exit_date is 90 days after intake_date
- [ ] Refresh ResidentProfile page
- [ ] Verify all fields persist after refresh
- [ ] Edit email in ResidentOverviewTab
- [ ] Verify update syncs to Resident record
- [ ] Check ResidentCard shows email/phone in internal views
- [ ] Check ResidentCard hides contact info when `showContact={false}`
- [ ] Log in as probation_officer
- [ ] Verify cannot see email/phone/emergency contact in profile
- [ ] Verify can still see first/last name
- [ ] Run backfill function for any existing residents with missing expected_exit_date