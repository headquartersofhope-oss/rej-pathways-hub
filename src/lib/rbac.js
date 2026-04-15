/**
 * Role-Based Access Control helpers.
 * Central source of truth for all permission checks.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  PROGRAM_MANAGER: 'program_manager',
  CASE_MANAGER: 'case_manager',
  INSTRUCTOR: 'instructor',
  STAFF: 'staff',
  RESIDENT: 'resident',
  PROBATION_OFFICER: 'probation_officer',
  REFERRAL_PARTNER: 'referral_partner',
  AUDITOR: 'auditor',
  // Base44 platform default roles treated as admin
  ADMIN: 'admin',
  USER: 'user',
};

/** Returns true for any administrative role with full system access */
export function isAdmin(role) {
  // 'user' is the Base44 platform default role — treat as admin
  return ['admin', 'user', 'super_admin', 'org_admin'].includes(role);
}

/** Returns true for any staff role that can manage residents */
export function isStaff(role) {
  // 'user' is the Base44 platform default role — treat as admin/staff
  return ['admin', 'user', 'super_admin', 'org_admin', 'program_manager', 'case_manager', 'instructor', 'staff',
    'house_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator'].includes(role);
}

export function isCaseManager(role) {
  return role === ROLES.CASE_MANAGER;
}

export function isResident(role) {
  return role === ROLES.RESIDENT;
}

export function isProbationOfficer(role) {
  return role === ROLES.PROBATION_OFFICER;
}

export function isEmployer(role) {
  return role === 'employer';
}

/**
 * Determine if a user can access a specific resident record.
 *
 * Rules:
 * - Admins: full access to all residents
 * - Program managers / instructors / auditors: read access to all
 * - Case managers: only residents assigned to them
 * - Staff: only residents assigned to them (via assigned_case_manager_id or assigned_case_manager)
 * - Residents: only their own linked resident record (matched by user_id or email)
 * - Probation officers: only residents explicitly linked to them (future: referral link)
 */
export function canAccessResident(user, resident) {
  if (!user || !resident) return false;
  const role = user.role;

  // Full admins
  if (isAdmin(role)) return true;

  // Program manager / instructor / auditor — read-all
  if (['program_manager', 'instructor', 'auditor', 'referral_partner'].includes(role)) return true;

  // Case managers / staff — only their caseload
  if (role === ROLES.CASE_MANAGER || role === ROLES.STAFF) {
    return (
      resident.assigned_case_manager_id === user.id ||
      resident.assigned_case_manager === user.id ||
      resident.assigned_case_manager === user.email ||
      resident.assigned_case_manager === user.full_name
    );
  }

  // Residents — only their own record
  if (isResident(role)) {
    return resident.user_id === user.id || resident.email === user.email;
  }

  // Probation officer — read-only access only if explicitly assigned to this resident
  if (isProbationOfficer(role)) {
    return (
      resident.assigned_probation_officer_id === user.id ||
      resident.assigned_probation_officer === user.email ||
      resident.assigned_probation_officer === user.full_name
    );
  }

  // Base44 default 'user' role – treat as staff (no caseload filter yet)
  if (role === 'user') return true;

  return false;
}

/**
 * Returns the set of action permissions for a user on a given resident.
 */
export function getResidentPermissions(user, resident) {
  const role = user?.role;
  const access = canAccessResident(user, resident);

  const fullEdit = isAdmin(role);
  const staffEdit = access && isStaff(role);
  const isPO = access && isProbationOfficer(role);
  const residentSelf = access && isResident(role);

  return {
    canView: access,
    canEditProfile: fullEdit || staffEdit,
    canAddNote: staffEdit,
    canAddTask: staffEdit,
    canAddAppointment: staffEdit,
    canUploadDocument: staffEdit || residentSelf,
    canUpdateDocumentStatus: fullEdit || (staffEdit && !residentSelf),
    canManageIntake: staffEdit,
    canViewCaseNotes: staffEdit || residentSelf,
    canViewConfidentialNotes: staffEdit && !isResident(role),
    canAddProbationNote: isPO,                      // only probation officers can create probation notes
    canViewProbationNotes: fullEdit || staffEdit || isPO, // admins, staff, and POs can view probation notes
    isProbationOfficer: isPO,                       // convenience flag for UI read-only rendering
    isReadOnly: isPO || (access && role === 'auditor'), // general read-only flag
    canAddResident: isAdmin(role) || ['program_manager', 'case_manager'].includes(role),
    canViewSettings: isAdmin(role),
    canViewAllResidents: isAdmin(role) || ['program_manager', 'instructor', 'auditor'].includes(role),
  };
}

/**
 * Filter a residents list based on user role:
 * - Admins / program managers see all
 * - Case managers / staff see only their caseload
 * - Residents see none (they go to their own profile)
 */
export function filterResidentsByAccess(residents, user) {
  if (!user) return [];
  const role = user.role;

  if (isAdmin(role) || ['program_manager', 'instructor', 'auditor', 'user'].includes(role)) {
    return residents;
  }

  if (role === ROLES.CASE_MANAGER || role === ROLES.STAFF) {
    return residents.filter(r =>
      r.assigned_case_manager_id === user.id ||
      r.assigned_case_manager === user.id ||
      r.assigned_case_manager === user.email ||
      r.assigned_case_manager === user.full_name
    );
  }

  if (isResident(role)) return []; // residents don't use this list page

  // Probation officers see only their assigned residents
  if (isProbationOfficer(role)) {
    return residents.filter(r =>
      r.assigned_probation_officer_id === user.id ||
      r.assigned_probation_officer === user.email ||
      r.assigned_probation_officer === user.full_name
    );
  }

  return [];
}