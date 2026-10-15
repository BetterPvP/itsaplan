import { useQuery } from '@tanstack/react-query';
import { playtestApi, playtestKeys } from '../services/playtestApi';

// Every playtest of the project, refreshed while a page shows them.
export function useProjectPlaytests(projectKey: string | null | undefined) {
  return useQuery({
    queryKey: playtestKeys.project(projectKey ?? ''),
    queryFn: () => playtestApi.project(projectKey!),
    enabled: !!projectKey,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

// A playtest whose server is up.
export const isLive = (p: { stage: string; connected: boolean; waiting?: boolean }) =>
  p.stage !== 'ended' && p.stage !== 'queued' && p.connected;
