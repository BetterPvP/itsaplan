import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { playtestApi, playtestKeys } from './services/playtestApi';
import { STAGE_LABELS } from './utils/labels';

// The playtest stage at the top right of a board card, while the issue has a playtest
// that has not ended. Every card of a board reads the same project query.
export default function PlaytestCardBadge({ identifier }: { identifier: string }) {
  const projectKey = identifier.replace(/-\d+$/, '');
  const { data } = useQuery({
    queryKey: playtestKeys.project(projectKey),
    queryFn: () => playtestApi.project(projectKey),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const playtest = data?.find((p) => p.issue === identifier);
  if (!playtest || (playtest.stage === 'ended' && !playtest.failed)) return null;
  const ready = playtest.stage === 'ready' && !playtest.failed;

  return (
    <span
      className={cn(
        'float-right ms-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] leading-4',
        playtest.failed && 'border-red-500/40 text-red-600 dark:text-red-400',
        ready && 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
        !playtest.failed && !ready && 'border-amber-400/50 text-amber-700 dark:text-amber-300',
      )}
      title={`Playtest: ${STAGE_LABELS[playtest.stage]}${playtest.failed ? ' failed' : ''}`}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          playtest.failed ? 'bg-red-500' : ready ? 'bg-emerald-500' : 'animate-pulse bg-amber-400',
        )}
      />
      {STAGE_LABELS[playtest.stage]}
    </span>
  );
}
