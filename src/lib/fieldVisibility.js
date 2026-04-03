/**
 * Role-based field visibility rules for resident contact and identity information.
 * Defines which fields can be viewed by different user roles.
 */

const FIELD_VISIBILITY = {
  // Admin: full access to all fields
  admin: {
    identity: ['global_resident_id', 'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'gender', 'pronouns', 'primary_language'],
    contact: ['email', 'phone'],
    emergency: ['emergency_contact_name', 'emergency_contact_phone'],
    program: ['status', 'population', 'intake_date', 'expected_exit_date', 'actual_exit_date', 'assigned_case_manager', 'assigned_probation_officer'],
    internal: true,
  },

  // Case Manager / Staff: full access to assigned residents
  case_manager: {
    identity: ['global_resident_id', 'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'gender', 'pronouns', 'primary_language'],
    contact: ['email', 'phone'],
    emergency: ['emergency_contact_name', 'emergency_contact_phone'],
    program: ['status', 'population', 'intake_date', 'expected_exit_date', 'actual_exit_date', 'assigned_case_manager'],
    internal: true,
  },

  // Probation Officer: read-only, limited to compliance fields
  probation_officer: {
    identity: ['global_resident_id', 'first_name', 'last_name', 'preferred_name'],
    contact: [], // No contact info exposed
    emergency: [],
    program: ['status', 'assigned_probation_officer'],
    internal: true,
  },

  // Resident: can view limited own information
  resident: {
    identity: ['first_name', 'last_name', 'preferred_name', 'date_of_birth', 'pronouns', 'primary_language'],
    contact: ['email', 'phone'],
    emergency: ['emergency_contact_name', 'emergency_contact_phone'],
    program: ['status', 'population', 'intake_date'], // No exit dates for self-view
    internal: false,
  },

  // Default (guest/external): minimal access
  default: {
    identity: [],
    contact: [],
    emergency: [],
    program: [],
    internal: false,
  },
};

/**
 * Get visible fields for a given user role
 * @param {string} userRole - The user's role (admin, case_manager, probation_officer, resident, etc.)
 * @returns {Object} Object with field categories and visibility lists
 */
export function getFieldVisibilityForRole(userRole) {
  return FIELD_VISIBILITY[userRole] || FIELD_VISIBILITY.default;
}

/**
 * Check if a user can view a specific field
 * @param {string} userRole - The user's role
 * @param {string} fieldName - The field name to check (e.g., 'email', 'phone', 'date_of_birth')
 * @param {string} fieldCategory - The category (identity, contact, emergency, program)
 * @returns {boolean} Whether the field is visible to this role
 */
export function canViewField(userRole, fieldName, fieldCategory) {
  const visibility = getFieldVisibilityForRole(userRole);
  const visibleFields = visibility[fieldCategory] || [];
  return visibleFields.includes(fieldName);
}

/**
 * Filter resident object to only include fields visible to the user
 * @param {Object} resident - The resident object
 * @param {string} userRole - The user's role
 * @param {boolean} isOwnRecord - Whether this is the resident's own record (used for resident role)
 * @returns {Object} Filtered resident object with only visible fields
 */
export function filterResidentForRole(resident, userRole, isOwnRecord = false) {
  const visibility = getFieldVisibilityForRole(userRole);

  const filtered = {};

  // Always include id fields
  filtered.id = resident.id;
  filtered.global_resident_id = resident.global_resident_id;
  filtered.organization_id = resident.organization_id;

  // Filter identity fields
  (visibility.identity || []).forEach(field => {
    if (resident[field] !== undefined) {
      filtered[field] = resident[field];
    }
  });

  // Filter contact fields
  (visibility.contact || []).forEach(field => {
    if (resident[field] !== undefined) {
      filtered[field] = resident[field];
    }
  });

  // Filter emergency contact fields
  (visibility.emergency || []).forEach(field => {
    if (resident[field] !== undefined) {
      filtered[field] = resident[field];
    }
  });

  // Filter program fields
  (visibility.program || []).forEach(field => {
    if (resident[field] !== undefined) {
      filtered[field] = resident[field];
    }
  });

  // Always include non-sensitive fields
  const publicFields = ['status', 'job_readiness_score', 'risk_level'];
  publicFields.forEach(field => {
    if (resident[field] !== undefined && !filtered[field]) {
      filtered[field] = resident[field];
    }
  });

  return filtered;
}

/**
 * Get a list of fields that should NOT be displayed in external/limited portals
 * @returns {string[]} Array of restricted field names
 */
export function getRestrictedFields() {
  return [
    'email',
    'phone',
    'date_of_birth',
    'emergency_contact_name',
    'emergency_contact_phone',
    'assigned_case_manager',
    'assigned_case_manager_id',
    'assigned_probation_officer',
    'assigned_probation_officer_id',
    'expected_exit_date',
    'actual_exit_date',
    'intake_date',
  ];
}

/**
 * Check if a field is restricted from external/employer views
 * @param {string} fieldName - The field name to check
 * @returns {boolean} Whether the field is restricted
 */
export function isFieldRestricted(fieldName) {
  return getRestrictedFields().includes(fieldName);
}