import { Clock, Gauge, MemoryStick, Users } from 'lucide-react';
import type { PlaytestState } from '../../services/playtestApi';
import { formatDuration, formatMb, formatTps } from '../../utils/format';

// Players, TPS, memory and uptime of a live server, in one line.
export default function CardMetrics({ playtest }: { playtest: PlaytestState }) {
  const m = playtest.metrics;
  const readyAt = playtest.stages.ready;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
      <span className="inline-flex items-center gap-1">
        <Users className="size-3" />
        {m ? `${m.players.length}${m.maxPlayers != null ? `/${m.maxPlayers}` : ''}` : '–'}
      </span>
      <span className="inline-flex items-center gap-1">
        <Gauge className="size-3" />
        {m?.tps != null ? `${formatTps(m.tps)} TPS` : '– TPS'}
      </span>
      <span className="inline-flex items-center gap-1">
        <MemoryStick className="size-3" />
        {m?.ramUsedMb != null ? formatMb(m.ramUsedMb) : '–'}
      </span>
      {readyAt != null && (
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {formatDuration(Date.now() - readyAt)}
        </span>
      )}
    </div>
  );
}
