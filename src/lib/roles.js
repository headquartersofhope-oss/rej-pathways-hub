export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  PROGRAM_MANAGER: 'program_manager',
  CASE_MANAGER: 'case_manager',
  INSTRUCTOR: 'instructor',
  RESIDENT: 'resident',
  EMPLOYER: 'employer',
  PROBATION_OFFICER: 'probation_officer',
  REFERRAL_PARTNER: 'referral_partner',
  AUDITOR: 'auditor',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  program_manager: 'Program Manager',
  case_manager: 'Case Manager',
  instructor: 'Instructor',
  resident: 'Resident',
  employer: 'Employer',
  probation_officer: 'Probation/Parole Officer',
  referral_partner: 'Referral Partner',
  auditor: 'Read-Only Auditor',
};

export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ORG_ADMIN,
  ROLES.PROGRAM_MANAGER,
  ROLES.CASE_MANAGER,
  ROLES.INSTRUCTOR,
];

export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ORG_ADMIN,
];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function isAdmin(role) {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}