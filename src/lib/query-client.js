import { QueryClient } from '@tanstack/react-query';

const RESERVATION_KEYS = ['reservation'];
const HOUSING_KEYS = ['bed', 'housing', 'occupancy', 'placement'];

const getQueryTiming = (queryKey) => {
  const keyStr = queryKey.map(k => (typeof k === 'string' ? k : JSON.stringify(k))).join(' ').toLowerCase();
  if (RESERVATION_KEYS.some(k => keyStr.includes(k))) {
    return { staleTime: 10_000, refetchInterval: 10_000 };
  }
  if (HOUSING_KEYS.some(k => keyStr.includes(k))) {
    return { staleTime: 30_000, refetchInterval: 30_000 };
  }
  return { staleTime: 5 * 60_000, refetchInterval: false };
};

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: ({ queryKey }) => getQueryTiming(queryKey).staleTime,
      refetchInterval: ({ queryKey }) => getQueryTiming(queryKey).refetchInterval,
    },
  },
});