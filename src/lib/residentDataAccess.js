/**
 * Resident data access control helpers.
 * Ensures residents can only access their own data.
 */

import { base44 } from '@/api/base44Client';

/**
 * Get the current user's linked resident ID (if they are a resident)
 */
export async function getCurrentResidentId() {
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'resident') {
      return null;
    }

    // Look up resident by user email
    const residents = await base44.entities.Resident.filter({
      email: user.email,
    });

    return residents.length > 0 ? residents[0].id : null;
  } catch {
    return null;
  }
}

/**
 * Verify that a resident can access a specific resident's data
 */
export async function canAccessResidentData(targetResidentId) {
  const currentResidentId = await getCurrentResidentId();

  if (!currentResidentId) {
    // Not a resident, check staff/admin permissions separately
    return false;
  }

  // Residents can only access their own data
  return currentResidentId === targetResidentId;
}

/**
 * Filter resident data to only what the current user can access
 */
export async function filterResidentsForCurrentUser(residents) {
  const user = await base44.auth.me();

  if (!user) {
    return [];
  }

  // Staff and admin can see all residents
  if (user.role !== 'resident') {
    return residents;
  }

  // Residents can only see themselves
  const residentId = await getCurrentResidentId();
  return residents.filter((r) => r.id === residentId);
}

/**
 * Query residents with automatic scoping for current user
 */
export async function queryResidentsScoped(filter = {}) {
  const user = await base44.auth.me();

  if (!user) {
    return [];
  }

  if (user.role !== 'resident') {
    // Staff/admin can query all residents with filter
    return base44.entities.Resident.filter(filter);
  }

  // Residents can only query themselves
  const residentId = await getCurrentResidentId();
  if (!residentId) {
    return [];
  }

  return base44.entities.Resident.filter({
    ...filter,
    id: residentId,
  });
}