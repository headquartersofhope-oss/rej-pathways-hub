# Manager Portal Testing Guide

## Overview
Manager Portal provides operational oversight, staff management, and resident assignment functionality for the 'manager' role (non-admin operational management).

---

## PART 1: ROLE CONFIGURATION

### Manager Role Permissions
✅ Created in `lib/rbac.js`:
- `isManager(role)` — checks if user.role === 'manager'
- Manager has `canManageAssignments`, `canApprovePending`, `canMarkHousingEligible`, `canAssignHousing`
- Manager can view ALL residents (like program managers)
- Manager CANNOT access admin settings, audit logs, user management, or system config

### Role Label
✅ Added to `lib/roles.js`:
- Manager role displays as "Operations Manager"
- Added to `STAFF_ROLES` (for sidebar navigation)
- Added to `ALL_ROLES`

### Access Control
✅ Manager Portal (`pages/ManagerPortal.jsx`):
- Only accessible if `user.role === 'manager'`
- Shows error if user lacks manager role
- Enforced at page load

---

## PART 2: MANAGER PORTAL WORKSPACE

### Three Main Tabs

#### 1. Dashboard (`ManagerCommandDashboard`)
Shows critical operational metrics:
- **Unassigned Residents** (red alert)
- **Overdue Tasks** (amber alert)
- **Open Incidents** (orange alert)
- **Status Overview Cards** (6 cards):
  - Pending Intakes
  - Housing Eligible
  - Housing Pending
  - Housed
  - Job Ready
  - Employed

Click any status card to see resident list for that status.

#### 2. Assignments (`CaseloadAssignmentPanel`)
- **List all residents** with current assignment status
- **Search by name** and filter by status
- **Unassigned count** displayed at top
- **One-click assign**: Select resident → Choose case manager → Confirm
- Auto-refresh after assignment
- Shows assigned case manager or "Unassigned" badge

#### 3. Staff (`StaffOversightPanel`)
- **Case manager list** with:
  - Caseload count (assigned residents)
  - Housed/Employed count
  - Overdue task count
  - Utilization % (housed / assigned)
- **Chart**: Caseload distribution per case manager
- **Alerts** for overloaded staff (>20 residents)
- **Summary stats**: Total managers, total assigned, avg caseload, total overdue

---

## PART 3: ASSIGNMENT WORKFLOW

### How Assignment Works

1. **Navigate to Manager Portal**
   - Login as user with role='manager'
   - Click "Manager Portal" in sidebar (under Manager section)

2. **Assignments Tab**
   - See all residents, filtered by status and name
   - "Unassigned" badge shows residents with no assigned case manager

3. **Assign a Resident**
   - Click "Assign" button on any resident
   - Select case manager from dropdown
   - Click "Assign" button to confirm
   - Success toast appears
   - Resident list updates automatically
   - Manager name now shows next to resident

4. **Backend Flow**
   - Manager assigns → `managerAssignResident` function called
   - Function validates manager role, resident, case manager
   - Updates resident.assigned_case_manager_id and .assigned_case_manager
   - Creates audit log entry
   - Response: success message

5. **Data Consistency**
   - Resident record updated correctly
   - Assignment persists across page reloads
   - Case manager ID used as source of truth (not name)
   - Audit log created for tracking

---

## PART 4: TESTING CHECKLIST

### Prerequisites
- Admin creates at least one user with role='manager'
- Admin creates at least 2 case managers (role='case_manager')
- At least 5 residents exist with mixed assignment status

### Test Scenario 1: View Manager Portal
1. ✅ Login as manager user
2. ✅ Sidebar shows "Manager Portal" link under Manager section
3. ✅ Click "Manager Portal"
4. ✅ Redirect to `/manager-portal`
5. ✅ See three tabs: Dashboard, Assignments, Staff

**Expected Result:** Manager Portal loads without errors

### Test Scenario 2: Dashboard Overview
1. ✅ Click Dashboard tab
2. ✅ See critical alert cards (unassigned, overdue, incidents)
3. ✅ See 6 status overview cards
4. ✅ Click any status card (e.g., "Housed")
5. ✅ Resident list appears for that status
6. ✅ Click "Clear" to close resident list

**Expected Result:** Dashboard populates with correct counts and resident filtering works

### Test Scenario 3: Staff Oversight
1. ✅ Click Staff tab
2. ✅ See summary: case manager count, total assigned, avg caseload, overdue tasks
3. ✅ See chart showing caseload distribution
4. ✅ See table with case manager stats:
   - Caseload (colored badge if >20)
   - Placed count
   - Overdue task count
   - Utilization %
5. ✅ Numbers update correctly based on resident assignments

**Expected Result:** Staff panel shows accurate caseload and utilization data

### Test Scenario 4: Assign Unassigned Resident
1. ✅ Click Assignments tab
2. ✅ Note unassigned count at top
3. ✅ Find unassigned resident (red "Unassigned" badge)
4. ✅ Click "Assign" button
5. ✅ Dropdown appears with case managers
6. ✅ Select case manager
7. ✅ Click "Assign"
8. ✅ Success toast appears: "Resident assigned successfully"
9. ✅ Resident list updates
10. ✅ Resident now shows assigned case manager name
11. ✅ Unassigned count decreases by 1

**Expected Result:** Assignment completes successfully, data updates in real-time

### Test Scenario 5: Reassign Existing Resident
1. ✅ Find resident already assigned to Case Manager A
2. ✅ Click "Assign" button
3. ✅ Select different case manager (B)
4. ✅ Confirm assignment
5. ✅ Success toast appears
6. ✅ Resident now shows Case Manager B

**Expected Result:** Reassignment works correctly

### Test Scenario 6: Assignment Persistence
1. ✅ Assign resident X to case manager Y
2. ✅ Refresh page (F5)
3. ✅ See same resident still assigned to same case manager
4. ✅ All assignments survive page reload

**Expected Result:** Assignment persists correctly

### Test Scenario 7: Manager Restrictions
1. ✅ Login as manager
2. ✅ Try to navigate to `/admin/control-center` directly
3. ✅ Should be redirected or denied
4. ✅ No admin settings visible in sidebar
5. ✅ No "Administration" section in sidebar

**Expected Result:** Manager cannot access admin areas

### Test Scenario 8: Audit Logging
1. ✅ Assign a resident
2. ✅ Check AuditLog entity for new entry
3. ✅ Audit log should contain:
   - user_id (manager's ID)
   - action: "manager_assign_resident"
   - entity_type: "Resident"
   - entity_id: resident ID
   - details: resident name, previous/new case manager

**Expected Result:** Audit log created with all details

### Test Scenario 9: Filter & Search
1. ✅ Assignments tab
2. ✅ Search by resident name (type in search box)
3. ✅ Filter by status (dropdown)
4. ✅ Combine filters
5. ✅ Results update correctly

**Expected Result:** Filtering and search work together

### Test Scenario 10: Dashboard Resident Links
1. ✅ Dashboard tab
2. ✅ Click any status card (e.g., "Housed")
3. ✅ Resident list shows
4. ✅ Click on resident (if clickable) or use sidebar to view resident profile
5. ✅ Can see resident assigned case manager in profile

**Expected Result:** Residents in status list show correct assignments

---

## PART 5: INTEGRATION POINTS

### Manager → Resident Assignment
- Manager assigns via Manager Portal
- Resident.assigned_case_manager_id updated
- Resident.assigned_case_manager (name display) updated
- Case manager can now see resident in their caseload

### Manager → Case Manager Visibility
- Manager sees all case managers in assignment dropdown
- Case manager list pulls from User entity (role='case_manager')
- Staff panel shows caseload per case manager

### Manager → Dashboard Metrics
- Dashboard pulls resident data from Resident entity
- Uses filters on status, job_readiness_score, assignment fields
- Real-time counts (re-fetch on tab open, can manually refresh)

### Manager → Audit Trail
- Every assignment creates AuditLog entry
- Tracks who assigned, when, previous/new manager
- Audit logs serve as assignment history

---

## PART 6: KNOWN LIMITATIONS & NOTES

1. **No Bulk Assignment UI Yet**
   - Current implementation: one-by-one assignment
   - Future: Could add bulk assignment checkbox + action

2. **No Reassignment History Panel**
   - Audit logs exist, but not displayed in UI
   - Could add history modal showing all assignments

3. **No Caseload Limit Enforcement**
   - Manager can assign unlimited residents to one case manager
   - Visual alert if caseload >20 (staff panel only)
   - No hard limit enforced

4. **Real-Time vs Refresh**
   - Assignments update immediately (React Query invalidation)
   - Dashboard is "eventual consistency" (refresh every 5-10 sec or on tab open)
   - No WebSocket streaming yet

5. **Resident Intake Approval**
   - Manager can assign residents (even pre-intake)
   - Manager cannot approve onboarding requests (admin only)
   - Could extend to allow manager approvals in future

---

## PART 7: QUICK REFERENCE

### Manager Role
- **Can Do:** View all residents, assign case managers, see dashboards, oversee staff
- **Cannot Do:** Access admin settings, manage system config, approve onboarding, manage users

### Manager Portal URL
- `/manager-portal` — Main dashboard
- Accessible only if user.role === 'manager'

### Sidebar Nav
- Manager Portal appears under "Manager" section (only for manager role)

### Functions
- `managerAssignResident.js` — Handles resident assignment with validation & audit logging

### Components
- `CaseloadAssignmentPanel.jsx` — Assignment UI
- `StaffOversightPanel.jsx` — Staff metrics & caseload chart
- `ManagerCommandDashboard.jsx` — Status overview & metrics

---

## SIGN-OFF CHECKLIST

- [ ] Manager role created and verified
- [ ] Manager Portal accessible at `/manager-portal`
- [ ] Dashboard shows correct resident counts
- [ ] Assignments workflow works end-to-end
- [ ] Staff oversight panel calculates caseloads correctly
- [ ] Reassignment updates correctly
- [ ] Audit logs created for all assignments
- [ ] Manager restrictions enforced (no admin access)
- [ ] Assignment data persists after page reload
- [ ] All UI elements responsive and error-free

---

## NEXT STEPS (Optional Enhancements)

1. Add bulk assignment UI
2. Add reassignment history modal
3. Add manager approval for specific workflow items
4. Add real-time notification of unassigned residents
5. Add caseload limit warnings/enforcement
6. Add assignment email notifications to case managers
7. Add manager performance dashboard (outcomes, retention, etc.)

---

**Status:** ✅ OPERATIONAL