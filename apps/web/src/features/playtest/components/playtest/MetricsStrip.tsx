import { useEffect, useState } from 'react';
import type { PlaytestState } from '../../services/playtestApi';
import { formatDuration, formatMb, formatMoney, formatTps } from '../../utils/format';

// The server's numbers: players, TPS, MSPT, memory, uptime, time until it shuts itself
// down if nobody plays, and what the instance has cost so far.
export default function MetricsStrip({ playtest }: { playtest: PlaytestState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const m = playtest.metrics;
  const live = playtest.stage !== 'ended';
  const readyAt = playtest.stages.ready;
  const cost =
    playtest.hourlyPrice != null && playtest.launchedAt != null
      ? (((playtest.endedAt ?? now) - playtest.launchedAt) / 3_600_000) * playtest.hourlyPrice
      : null;
  const cells: [string, string][] = [
    ['Players', m ? `${m.players.length}${m.maxPlayers != null ? ` / ${m.maxPlayers}` : ''}` : '–'],
    ['TPS', m?.tps != null ? formatTps(m.tps) : '–'],
    ['MSPT', m?.mspt != null ? m.mspt.toFixed(1) : '–'],
    [
      'Memory',
      m?.ramUsedMb != null
        ? `${formatMb(m.ramUsedMb)}${m.ramMaxMb != null ? ` / ${formatMb(m.ramMaxMb)}` : ''}`
        : '–',
    ],
    ['Uptime', readyAt != null && live ? formatDuration(now - readyAt) : '–'],
    [
      'Idle shutdown',
      m?.idleShutdownAt != null && live ? `in ${formatDuration(m.idleShutdownAt - now)}` : '–',
    ],
    ['Cost so far', cost != null ? formatMoney(cost) : '–'],
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4 lg:grid-cols-7">
      {cells.map(([label, value]) => (
        <div key={label} className="bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-sm font-medium tabular-nums">{value}</div>
        </div>
      ))}
    </div>
  );
}
