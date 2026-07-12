export const LIVE_DATA_STALE_MS = 15_000;
export const LIVE_DATA_REFETCH_MS = 30_000;

export const liveQueryOptions = {
  staleTime: LIVE_DATA_STALE_MS,
  refetchOnWindowFocus: true,
  refetchInterval: LIVE_DATA_REFETCH_MS,
} as const;
