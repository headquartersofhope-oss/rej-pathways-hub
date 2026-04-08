/**
 * Re-exports from rbac.js for backward compatibility.
 * New code should import from @/lib/rbac directly.
 */
export {
  ROLES,
  isAdmin,
  isStaff,
  isCaseManager,
  isResident,
  isProbationOfficer,
  isEmployer,
  canAccessResident,
  getResidentPermissions,
  filterResidentsByAccess,
} from '@/lib/rbac';

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  program_manager: 'Program Manager',
  case_manager: 'Case Manager',
  instructor: 'Instructor',
  staff: 'Staff',
  resident: 'Resident',
  employer: 'Employer',
  probation_officer: 'Probation/Parole Officer',
  referral_partner: 'Referral Partner',
  auditor: 'Read-Only Auditor',
};

export const STAFF_ROLES = ['admin', 'super_admin', 'org_admin', 'program_manager', 'case_manager', 'instructor', 'staff'];
export const ADMIN_ROLES = ['admin', 'super_admin', 'org_admin'];

export function isSuperAdmin(role) {
  return role === 'super_admin';
}