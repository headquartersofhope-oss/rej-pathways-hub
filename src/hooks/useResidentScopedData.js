/**
 * useResidentScopedData — React Query hook wrapping the getResidentScopedData backend function.
 *
 * Provides scoped reads for the resident UI without full-table scans.
 * Falls back gracefully if resident profile isn't linked yet.
 *
 * Usage:
 *   const { data, isLoading, noProfile } = useResidentScopedData('tasks', user);
 *
 * Types: 'dashboard' | 'classes' | 'certificates' | 'tasks' | 'appointments' | 'jobs' | 'supports'
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useResidentScopedData(type = 'dashboard', user) {
  return useQuery({
    queryKey: ['resident-scoped', type, user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getResidentScopedData', { type });
      return res.data;
    },
    enabled: !!user?.id && user?.role === 'resident',
    staleTime: 30_000,
    retry: (failCount, error) => {
      // Don't retry 403 (forbidden) or 404 (no profile)
      const status = error?.response?.status;
      if (status === 403 || status === 404) return false;
      return failCount < 2;
    },
    select: (data) => data,
  });
}

/**
 * Returns true if the error means the resident has no linked profile.
 */
export function isNoProfileError(error) {
  return error?.response?.status === 404 && error?.response?.data?.code === 'NO_RESIDENT_PROFILE';
}