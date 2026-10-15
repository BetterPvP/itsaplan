import { cn } from '@/lib/utils';
import type { Stage } from '../services/playtestApi';
import { STAGE_LABELS } from '../utils/labels';

// A playtest's stage: amber while it is on its way, green when ready, red when a
// step failed, grey once ended.
export default function StagePill({
  stage,
  failed,
  waiting,
  className,
}: {
  stage: Stage;
  failed: boolean;
  waiting?: boolean;
  className?: string;
}) {
  const ready = stage === 'ready' && !failed;
  const ended = stage === 'ended' && !failed;
  const label = waiting
    ? 'Waiting for a server'
    : `${STAGE_LABELS[stage]}${failed ? ' failed' : ''}`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-4 whitespace-nowrap',
        failed && 'border-red-500/40 text-red-600 dark:text-red-400',
        ready && 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
        ended && 'border-border text-muted-foreground',
        !failed && !ready && !ended && 'border-amber-400/50 text-amber-700 dark:text-amber-300',
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          failed
            ? 'bg-red-500'
            : ready
              ? 'bg-emerald-500'
              : ended
                ? 'bg-muted-foreground/50'
                : 'animate-pulse bg-amber-400',
        )}
      />
      {label}
    </span>
  );
}
