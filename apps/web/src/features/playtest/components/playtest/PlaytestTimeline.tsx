import { Fragment } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGES, type PlaytestState } from '../../services/playtestApi';
import { STAGE_LABELS, formatTime } from '../../utils/labels';

const KEYFRAMES = `
@keyframes playtest-flow { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
@keyframes playtest-ring { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.9); opacity: 0; } }
`;

// Queued → Build → Launch → Boot → Ready → Ended. Stages before the current one are
// done, the current one pulses, and a dash runs along the line towards the next.
export default function PlaytestTimeline({ playtest }: { playtest: PlaytestState | null }) {
  const current = playtest ? STAGES.indexOf(playtest.stage) : -1;
  const ended = playtest?.stage === 'ended' && !playtest.failed;
  const failed = !!playtest?.failed;

  return (
    <div className="flex items-start">
      <style>{KEYFRAMES}</style>
      {STAGES.map((stage, i) => {
        const done = ended || i < current;
        const active = !ended && i === current;
        const at = playtest?.stages[stage];
        return (
          <Fragment key={stage}>
            {i > 0 && (
              <div className="relative -mx-[18px] mt-[9px] h-0.5 flex-1 overflow-hidden bg-border">
                {(done || active) && <div className="absolute inset-0 bg-emerald-500" />}
                {i === current + 1 && !failed && !ended && (
                  <div
                    className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                    style={{ animation: 'playtest-flow 0.9s linear infinite' }}
                  />
                )}
              </div>
            )}
            <div className="flex w-14 shrink-0 flex-col items-center gap-1">
              <div className="relative z-10 flex size-5 items-center justify-center">
                {active && !failed && (
                  <span
                    className="absolute inset-0 rounded-full border-2 border-amber-400"
                    style={{ animation: 'playtest-ring 1.4s ease-out infinite' }}
                  />
                )}
                <span
                  className={cn(
                    'relative flex size-5 items-center justify-center rounded-full border-2',
                    done && 'border-emerald-500 bg-emerald-500 text-white',
                    active && !failed && 'border-amber-400 bg-amber-400',
                    active && failed && 'border-red-500 bg-red-500 text-white',
                    !done && !active && 'border-border bg-background',
                  )}
                >
                  {done && <Check className="size-3" strokeWidth={3} />}
                  {active && failed && <X className="size-3" strokeWidth={3} />}
                </span>
              </div>
              <span
                className={cn(
                  'text-[11px] leading-none',
                  done || active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
              <span className="h-3 text-[10px] leading-none text-muted-foreground tabular-nums">
                {at ? formatTime(at) : ''}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
