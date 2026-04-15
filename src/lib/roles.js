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
  org_admin: 'Executive Admin',
  program_manager: 'Program Manager',
  case_manager: 'Case Manager',
  house_manager: 'House Manager',
  employment_specialist: 'Employment Specialist',
  grant_manager: 'Grant Manager',
  transportation_coordinator: 'Transportation Coordinator',
  instructor: 'Instructor',
  staff: 'Staff',
  resident: 'Participant',
  employer: 'Employer Partner',
  probation_officer: 'Probation/Parole Officer',
  referral_partner: 'Referral Partner',
  auditor: 'Board Reviewer',
  admin: 'Administrator',
  user: 'Administrator',
};

export const STAFF_ROLES = ['admin', 'super_admin', 'org_admin', 'program_manager', 'case_manager', 'instructor', 'staff'];
export const ADMIN_ROLES = ['admin', 'super_admin', 'org_admin'];
export const ALL_ROLES = ['super_admin', 'org_admin', 'program_manager', 'case_manager', 'house_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator', 'instructor', 'staff', 'resident', 'employer', 'probation_officer', 'referral_partner', 'auditor', 'admin', 'user'];

export function isSuperAdmin(role) {
  return role === 'super_admin';
}