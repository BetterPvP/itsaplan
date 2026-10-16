import { useQuery } from '@tanstack/react-query';
import { playtestApi, playtestKeys } from '../services/playtestApi';

// The staging server, refreshed while the Playtests page shows it. Its page shares the
// cache and keeps it live through the event stream.
export function useStaging(projectKey: string | null | undefined) {
  return useQuery({
    queryKey: playtestKeys.issue(projectKey ?? ''),
    queryFn: () => playtestApi.get(projectKey!),
    enabled: !!projectKey,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
