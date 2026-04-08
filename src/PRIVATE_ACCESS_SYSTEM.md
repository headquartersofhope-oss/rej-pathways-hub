# Private Access & Onboarding System

## Overview
This document describes the controlled private-access onboarding, approval, and activation system built for the Reentry & Jobs platform.

## Architecture

### 1. Public Entry Points
- **`/`** → PublicLanding page (login or request access)
- **`/auth/request-access`** → Role-specific intake/onboarding forms
- No internal pages are accessible without authentication

### 2. Request Types

#### Resident Intake
- Collects: name, email, phone, DOB, housing, employment, literacy, digital literacy, needs, emergency contact
- Stored in OnboardingRequest with resident_data nested object
- No immediate account creation

#### Staff/Manager/Officer Request
- Collects: name, email, phone, organization, requested role, reason for access
- Stored in OnboardingRequest
- Requires admin approval

#### Employer Request
- Collects: company name, contact info, requested role (employer)
- Creates/links employer record after approval
- Employer role acts as company administrator

#### Partner Request
- Limited access to partner-specific resources
- Similar flow to staff roles

### 3. AI-Assisted Analysis
**Function:** `analyzeOnboardingRequest`
- Triggered automatically after request submission
- Generates:
  - Summary of the request
  - Recommended role (advisory only)
  - Recommended services/classes (for residents)
  - Concerns/red flags
  - Data quality issues

**Important:** AI does NOT approve access. It informs admin decisions only.

### 4. Admin Approval Queue

**Page:** `/admin/onboarding`

**Features:**
- View all pending requests tabbed by status (pending, needs_info, approved, rejected)
- See AI analysis and recommendations
- Assign final role (overrides requested role if needed)
- Add admin notes
- Approve → creates user account + sends activation email
- Reject → sends rejection notice
- Request more info (move to "needs_info" status)

**Statuses:**
- `pending` → Initial submission, awaiting review
- `needs_info` → Admin requested more information
- `approved` → Admin approved, user account created
- `rejected` → Admin rejected, no account created

### 5. Approval Workflow

**Function:** `approveOnboardingRequest`

When admin approves a request with a final role:

**For Residents:**
1. Create Resident record with basic demographics
2. Create/link User account with role="resident"
3. Create BarrierItem records from identified needs
4. Generate temporary login code (12-char alphanumeric)
5. Send activation email with code

**For Non-Residents:**
1. Create/link User account with assigned role
2. Link to Organization if applicable
3. If employer: create/link Employer record
4. Generate temporary login code
5. Send activation email

**No access is granted until admin approves.**

### 6. Activation & First Login

**Activation Email Contains:**
- Confirmation of approval
- Username (email)
- Temporary login code
- Login link
- Instructions to set permanent password

**First Login Flow:**
1. User visits `/auth/login`
2. Chooses "Use temporary code" option
3. Enters email + temporary code
4. System validates code (24-hour expiry)
5. Forces password creation
6. Routes to role-specific dashboard

### 7. Account Statuses

UserAccount.status tracks:
- `pending` → Initial creation, awaiting approval
- `approved` → Admin approved
- `invited` → Activation email sent
- `first_login_required` → Code used, password not yet set
- `active` → Full access granted
- `suspended` → Temporarily disabled
- `deactivated` → Permanently disabled

### 8. Role-Based Routing

After successful login, user is routed by role:
- **admin** → Admin Dashboard
- **case_manager** → Case Manager Dashboard
- **staff** → Staff Dashboard
- **probation_officer** → Probation Dashboard
- **resident** → Resident Dashboard
- **employer** → Employer Portal
- **partner** → Partner Dashboard (if applicable)

### 9. Resident Data Isolation

**Critical Security:** Residents must never see other residents' data.

**Enforcement:**
- Helper functions in `lib/residentDataAccess.js`
- `canAccessResidentData(targetResidentId)` → validates access
- `queryResidentsScoped(filter)` → auto-scopes to current resident
- All resident-facing reads must use scoped queries
- Server-side validation in backend functions

**Components must use:**
```javascript
import { queryResidentsScoped } from '@/lib/residentDataAccess';

// For resident users, this auto-filters to their own record
const residents = await queryResidentsScoped({ status: 'active' });
```

### 10. Admin Controls

Admin can manage approved users via `/users` (existing user management):
- View all users with status
- Activate/deactivate users
- Reset password / regenerate temporary code
- Resend activation email
- Change role
- Link to resident/employer records
- View approval history

### 11. Employer Visibility

**Admin Console (`/users`):**
- Employer users appear in user list
- Can assign employer role during approval
- Can link to Employer record

**Platform Modules:**
- Employer module visible in sidebar when role = employer
- Employers access via `/employer-portal`
- Minimal navigation (jobs, candidates, messages only)
- No access to resident data or internal systems

### 12. Private Access Rules

**Unauthenticated Users:**
- Can see: PublicLanding only
- Cannot see: dashboards, modules, residents, employers, reporting
- Must click "Request Access" or "Log In"

**Pending/Unapproved Users:**
- Not in User table yet
- Cannot log in
- Status tracked in OnboardingRequest

**Approved but Not Activated:**
- User account exists with status="invited"
- Temporary code valid for 7 days
- Cannot access system until first login

**Activated Users:**
- status="active"
- Full access by role
- Residents see only own data

### 13. Entities

**OnboardingRequest**
- Stores pending intake/access requests
- Includes AI analysis results
- Links to created User and Resident records
- Approval audit trail (approved_by, approved_date, etc.)

**UserAccount**
- Extended user metadata
- Tracks status, temporary code, linked records
- Stores approval dates and activation history
- Admin-controlled flags (suspended, deactivated)

### 14. Backend Functions

**`analyzeOnboardingRequest`**
- Called automatically after request submission
- Uses InvokeLLM for analysis
- Updates OnboardingRequest with AI summary/recommendations

**`approveOnboardingRequest`**
- Called by admin via approval dialog
- Creates user account (via base44.users.inviteUser)
- Creates resident/employer records as needed
- Generates temporary code
- Sends activation email (via SendEmail integration)

## Implementation Checklist

- [x] OnboardingRequest entity
- [x] UserAccount entity
- [x] PublicLanding page
- [x] RequestAccess flow (resident + other roles)
- [x] ResidentIntakeForm component
- [x] RoleRequestForm component
- [x] OnboardingQueue admin page
- [x] OnboardingRequestDetail approval dialog
- [x] analyzeOnboardingRequest function (AI analysis)
- [x] approveOnboardingRequest function (approval workflow)
- [x] App routing (public + private)
- [x] Sidebar integration (admin onboarding queue link)
- [x] Resident data isolation helpers
- [ ] First-login password creation flow (uses built-in auth)
- [ ] Activation email template customization (optional)
- [ ] Temporary code validation in built-in auth
- [ ] Role-based dashboard routing (already exists)

## Configuration Notes

1. **AI Model:** Uses default LLM (gpt-4o-mini) for analysis. Can be upgraded for complex cases.
2. **Temporary Code Expiry:** Set to 7 days. Adjustable in `approveOnboardingRequest.js`.
3. **Email Template:** Basic HTML in `approveOnboardingRequest.js`. Customize as needed.
4. **Resident Data Isolation:** Uses email-based lookup. Ensure emails are unique in Resident table.

## Security Considerations

1. ✅ Temporary codes are 12-character random alphanumeric
2. ✅ Codes expire after 7 days
3. ✅ Admin-only approval prevents unauthorized access
4. ✅ Resident data scoped by ID matching
5. ✅ No cross-resident leakage via queries
6. ✅ Role-based route protection in sidebar
7. ⚠️ Ensure database Row-Level Security (RLS) is configured for resident data
8. ⚠️ Validate all backend functions require auth before returning resident data

## Limitations & Future Work

1. **Password Reset Flow:** Currently relies on built-in auth platform. May need custom flow.
2. **Email Customization:** Consider moving email templates to admin settings.
3. **Bulk Approvals:** Admin can approve one at a time. Could add bulk approval feature.
4. **Multi-org Support:** System is single-org. Multi-org filtering not implemented yet.
5. **Employer Hierarchy:** Single employer users only. Multi-user employer accounts need work.

## Testing Recommendations

1. Submit resident intake → verify in queue → approve → check email sent
2. Submit staff request → verify AI analysis → assign role → check account created
3. Temporary code login → verify first login → force password change
4. Resident login → verify sees only own data, not other residents
5. Admin deactivate user → verify cannot login
6. Rejection flow → verify rejection email works
7. "Needs info" status → verify admin can request more info

---

**Version:** 1.0  
**Last Updated:** 2026-04-08  
**System:** Private Access + Onboarding + Approval Workflow