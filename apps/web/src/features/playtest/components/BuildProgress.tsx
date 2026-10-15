import { STAGES, type PlaytestState } from '../services/playtestApi';
import { STAGE_LABELS } from '../utils/labels';
import { formatDuration } from '../utils/format';

// How far a playtest is on its way to a ready server, while it is on its way.
export default function BuildProgress({ playtest }: { playtest: PlaytestState }) {
  if (playtest.waiting) {
    return <p className="text-xs text-muted-foreground">Waiting for a free server slot</p>;
  }
  const index = STAGES.indexOf(playtest.stage);
  const total = STAGES.indexOf('ready');
  const since = playtest.stages[playtest.stage];
  return (
    <div className="space-y-1">
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${playtest.failed ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${Math.round(((index + 0.5) / total) * 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {STAGE_LABELS[playtest.stage]}
        {playtest.failed ? ' failed' : '…'}
        {since != null && ` · ${formatDuration(Date.now() - since)}`}
      </p>
    </div>
  );
}
