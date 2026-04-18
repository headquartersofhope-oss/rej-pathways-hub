/**
 * Role Preview System
 * Simulates what each role sees and can do in the app
 * Used for permission validation, auditing, and testing
 */

export const PREVIEWABLE_ROLES = [
  'admin',
  'manager',
  'case_manager',
  'housing_staff',
  'employment_staff',
  'probation_officer',
  'employer',
  'resident'
];

export const ROLE_VISIBILITY = {
  admin: {
    label: 'Admin',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/admin/control-center', label: '⚡ Control Center', icon: 'Terminal' },
      { path: '/admin/audit', label: '🔬 Audit Center', icon: 'Shield' },
      { path: '/admin/onboarding', label: 'Onboarding Queue', icon: 'ClipboardList' },
      { path: '/organizations', label: 'Organizations', icon: 'Building2' },
      { path: '/sites', label: 'Sites', icon: 'MapPin' },
      { path: '/users', label: 'User Management', icon: 'UserCircle' },
      { path: '/modules', label: 'Module Settings', icon: 'Settings' },
      { path: '/audit-logs', label: 'Audit Logs', icon: 'Shield' },
      { path: '/residents', label: 'All Participants', icon: 'Users' },
      { path: '/intake', label: 'Intake & Assessment', icon: 'ClipboardList' },
      { path: '/case-management', label: 'Case Management', icon: 'FolderOpen' },
      { path: '/job-readiness', label: 'Job Readiness', icon: 'Star' },
      { path: '/job-matching', label: 'Job Matching', icon: 'Zap' },
      { path: '/housing', label: 'Housing Operations', icon: 'BedDouble' },
      { path: '/transportation', label: 'Transportation Hub', icon: 'Car' },
      { path: '/grants', label: 'Grant Tracker', icon: 'DollarSign' },
      { path: '/reporting', label: 'Core Metrics', icon: 'BarChart2' },
      { path: '/learning', label: 'Learning Center', icon: 'GraduationCap' }
    ],
    dataAccess: 'all_records',
    actions: [
      'create_resident',
      'edit_resident',
      'delete_resident',
      'approve_onboarding',
      'manage_users',
      'system_settings',
      'view_audit_logs',
      'assign_case_manager',
      'mark_housing_eligible',
      'assign_housing',
      'issue_certificates'
    ],
    hiddenElements: []
  },

  manager: {
    label: 'Operations Manager',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/manager-portal', label: 'Manager Portal', icon: 'GitBranch' },
      { path: '/residents', label: 'All Participants', icon: 'Users' },
      { path: '/intake', label: 'Intake & Assessment', icon: 'ClipboardList' },
      { path: '/case-management', label: 'Case Management', icon: 'FolderOpen' },
      { path: '/job-readiness', label: 'Job Readiness', icon: 'Star' },
      { path: '/job-matching', label: 'Job Matching', icon: 'Zap' },
      { path: '/housing', label: 'Housing Operations', icon: 'BedDouble' },
      { path: '/transportation', label: 'Transportation Hub', icon: 'Car' },
      { path: '/grants', label: 'Grant Tracker', icon: 'DollarSign' },
      { path: '/reporting', label: 'Core Metrics', icon: 'BarChart2' },
      { path: '/learning', label: 'Learning Center', icon: 'GraduationCap' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'organization_residents',
    actions: [
      'view_residents',
      'assign_case_manager',
      'mark_housing_eligible',
      'assign_housing',
      'view_dashboards',
      'manage_assignments',
      'auto_assign_residents',
      'view_staff_caseloads'
    ],
    hiddenElements: ['admin_settings', 'user_management', 'system_config', 'audit_logs']
  },

  case_manager: {
    label: 'Case Manager',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/residents', label: 'My Residents', icon: 'Users' },
      { path: '/case-management', label: 'Case Management', icon: 'FolderOpen' },
      { path: '/job-readiness', label: 'Job Readiness', icon: 'Star' },
      { path: '/job-matching', label: 'Job Matching', icon: 'Zap' },
      { path: '/intake', label: 'Intake & Assessment', icon: 'ClipboardList' },
      { path: '/learning', label: 'Learning Center', icon: 'GraduationCap' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'assigned_residents_only',
    actions: [
      'view_assigned_residents',
      'create_case_notes',
      'create_service_tasks',
      'update_barriers',
      'view_housing_status',
      'view_job_readiness',
      'access_learning'
    ],
    hiddenElements: [
      'global_dashboards',
      'staff_management',
      'system_settings',
      'other_residents',
      'admin_tools'
    ]
  },

  housing_staff: {
    label: 'Housing Staff',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/housing', label: 'Housing Operations', icon: 'BedDouble' },
      { path: '/residents', label: 'Participants', icon: 'Users' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'housing_relevant_data',
    actions: [
      'view_housing_queue',
      'assign_beds',
      'manage_placements',
      'view_occupancy',
      'manage_houses',
      'view_resident_housing_status'
    ],
    hiddenElements: [
      'employment_controls',
      'case_management',
      'job_readiness',
      'admin_tools',
      'system_settings',
      'learning_center'
    ]
  },

  employment_staff: {
    label: 'Employment Staff',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/job-readiness', label: 'Job Readiness', icon: 'Star' },
      { path: '/job-matching', label: 'Job Matching', icon: 'Zap' },
      { path: '/residents', label: 'Participants', icon: 'Users' },
      { path: '/employers', label: 'Employers', icon: 'Briefcase' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'employment_relevant_data',
    actions: [
      'view_job_readiness',
      'create_job_matches',
      'manage_interviews',
      'view_employment_status',
      'connect_employers',
      'track_employment_outcomes'
    ],
    hiddenElements: [
      'housing_operations',
      'case_management',
      'admin_tools',
      'system_settings'
    ]
  },

  probation_officer: {
    label: 'Probation Officer',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/residents', label: 'Supervised Residents', icon: 'Users' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'assigned_probation_residents',
    actions: [
      'view_probation_residents',
      'create_probation_notes',
      'view_compliance_status',
      'track_conditions',
      'monitor_progress'
    ],
    hiddenElements: [
      'global_dashboards',
      'case_management',
      'housing_operations',
      'job_operations',
      'admin_tools',
      'system_settings',
      'internal_case_notes'
    ]
  },

  employer: {
    label: 'Employer',
    canPreview: true,
    pages: [
      { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/employer-portal', label: 'My Jobs & Candidates', icon: 'Briefcase' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'employer_candidates_only',
    actions: [
      'view_job_candidates',
      'post_jobs',
      'manage_applications',
      'schedule_interviews',
      'communicate_with_staff'
    ],
    hiddenElements: [
      'internal_resident_data',
      'case_management',
      'housing_operations',
      'admin_tools',
      'other_employers_data'
    ]
  },

  resident: {
    label: 'Resident',
    canPreview: true,
    pages: [
      { path: '/', label: 'Home', icon: 'LayoutDashboard' },
      { path: '/my-supports', label: 'My Supports', icon: 'ShieldCheck' },
      { path: '/my-tasks', label: 'My Tasks', icon: 'CheckSquare' },
      { path: '/my-appointments', label: 'My Appointments', icon: 'Calendar' },
      { path: '/my-jobs', label: 'My Jobs', icon: 'Briefcase' },
      { path: '/learning', label: 'Learning Center', icon: 'GraduationCap' },
      { path: '/messages', label: 'Messages', icon: 'MessageSquare' }
    ],
    dataAccess: 'own_data_only',
    actions: [
      'view_own_profile',
      'view_own_tasks',
      'view_own_appointments',
      'view_own_job_matches',
      'access_learning',
      'message_staff'
    ],
    hiddenElements: [
      'other_residents',
      'staff_tools',
      'admin_tools',
      'system_settings',
      'internal_notes',
      'case_management',
      'housing_operations'
    ]
  }
};

/**
 * Check if user can use preview mode
 */
export function canUsePreview(userRole) {
  return ['admin', 'manager'].includes(userRole);
}

/**
 * Get visibility for a specific role
 */
export function getRoleVisibility(role) {
  return ROLE_VISIBILITY[role] || null;
}

/**
 * Simulate data scoping for a role
 * Returns filter params based on role
 */
export function getDataScopingFilter(role, userId, organizationId) {
  switch (role) {
    case 'case_manager':
      return { assigned_case_manager_id: userId };
    case 'probation_officer':
      return { assigned_probation_officer_id: userId };
    case 'resident':
      return { user_id: userId };
    case 'housing_staff':
    case 'employment_staff':
      return { organization_id: organizationId };
    case 'manager':
    case 'admin':
      return { organization_id: organizationId };
    default:
      return null;
  }
}

/**
 * Check if action is visible for a role
 */
export function canPerformAction(role, action) {
  const visibility = ROLE_VISIBILITY[role];
  if (!visibility) return false;
  return visibility.actions.includes(action);
}

/**
 * Get list of hidden UI elements for a role
 */
export function getHiddenElements(role) {
  const visibility = ROLE_VISIBILITY[role];
  if (!visibility) return [];
  return visibility.hiddenElements;
}