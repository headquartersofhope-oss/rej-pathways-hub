# Smart Auto-Assignment & Role Preview — Quick Reference

## AUTO-ASSIGNMENT

### Single Resident
```javascript
const response = await base44.functions.invoke('autoAssignResident', {
  resident_id: 'xyz',
  organization_id: 'org-123',
  reason: 'resident_activated', // or 'intake_completed', 'manual_trigger'
  caseload_threshold: 25
});
// Returns: { success, assigned_case_manager, assigned_caseload }
```

### Bulk Residents
```javascript
const response = await base44.functions.invoke('bulkAutoAssignResidents', {
  organization_id: 'org-123',
  caseload_threshold: 25
});
// Returns: { success, assigned, failed, details[] }
```

### From UI
- Admin Control Center → Auto-Assign tab
- Set threshold, click "Auto-Assign All Unassigned"

---

## ROLE PREVIEW

### Enable Preview
```javascript
import { useRolePreview } from '@/lib/RolePreviewContext';

const { isPreviewActive, setPreviewRole, exitPreview } = useRolePreview();

// Enable preview as specific role
setPreviewRole('case_manager');

// Exit preview
exitPreview();
```

### Check Visibility
```javascript
import { canPerformAction, getHiddenElements } from '@/lib/rolePreview';

if (canPerformAction('case_manager', 'delete_resident')) {
  // Show delete button
}

const hidden = getHiddenElements('case_manager');
// ['global_dashboards', 'staff_management', ...]
```

### From UI
- Admin Control Center → Role Preview tab
- Toggle "Enable Preview"
- Select role from dropdown
- See what that role can access

---

## ENTITY FIELDS (Resident)

**Assignment Fields:**
- `assigned_case_manager_id` — User.id (source of truth)
- `assigned_case_manager` — Display name
- `assignment_method` — "auto" or "manual"
- `assignment_timestamp` — ISO datetime
- `assigned_by_user_id` — Who made manual assignment
- `auto_assignment_reason` — Why auto-assigned

**Example:**
```json
{
  "assigned_case_manager_id": "user-123",
  "assigned_case_manager": "John Doe",
  "assignment_method": "auto",
  "assignment_timestamp": "2026-04-18T10:30:00Z",
  "auto_assignment_reason": "resident_activated"
}
```

---

## AUDIT LOGS

**Auto-Assignment Success:**
```json
{
  "action": "resident_auto_assigned",
  "entity_type": "Resident",
  "details": {
    "resident_name": "Jane Smith",
    "assigned_case_manager": "John Doe",
    "assigned_caseload": 15,
    "reason": "resident_activated"
  }
}
```

**Auto-Assignment Failed:**
```json
{
  "action": "auto_assignment_failed_all_overloaded",
  "details": {
    "reason": "All case managers at or over caseload threshold"
  }
}
```

---

## PERMISSIONS

**Who can use auto-assignment:**
- Admin ✅
- Manager ✅
- Others ❌

**Who can use role preview:**
- Admin ✅
- Manager ✅
- Others ❌

---

## ROLE ACCESS MATRIX

| Role | Pages | Data Access | Can Delete | Can Approve |
|------|-------|-------------|-----------|------------|
| Admin | All | All records | ✅ | ✅ |
| Manager | Operational | Org residents | ❌ | ❌ |
| Case Manager | Limited | Assigned only | ❌ | ❌ |
| Housing Staff | Housing | Housing data | ❌ | ❌ |
| Employment Staff | Job-related | Employment data | ❌ | ❌ |
| Probation Officer | Limited | Supervised only | ❌ | ❌ |
| Employer | Employer portal | Candidates only | ❌ | ❌ |
| Resident | Self-service | Own data | ❌ | ❌ |

---

## TROUBLESHOOTING

**No eligible case managers:**
- Verify case managers exist and have role='case_manager'
- Verify they're in same organization as resident

**All case managers at threshold:**
- Increase caseload_threshold parameter
- Or add more case managers to organization
- Check audit logs for "auto_assignment_failed_all_overloaded"

**Preview mode not showing correct data:**
- Verify user role is 'admin' or 'manager'
- Check RLS rules are correct on entities
- Verify data filters applied correctly

**Audit log missing:**
- Check AuditLog entity exists
- Verify auto-assignment completed (not failed)
- Check organization_id is correct

---

## FILES

**Backend Functions:**
- `functions/autoAssignResident.js` — Single resident
- `functions/bulkAutoAssignResidents.js` — Bulk residents

**Libraries:**
- `lib/rolePreview.js` — Role definitions
- `lib/RolePreviewContext.jsx` — React context

**Components:**
- `components/admin/RolePreviewPanel.jsx` — Preview UI
- `components/admin/AutoAssignmentControl.jsx` — Assignment UI

**Entity:**
- `entities/Resident.json` — Updated with assignment fields

**Pages:**
- `pages/admin/AdminControlCenter.jsx` — New tabs for auto-assign and preview

---

**Status: Production Ready ✅**