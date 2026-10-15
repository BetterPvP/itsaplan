// "2h 05m", "14m 03s", "42s": how long something has lasted or has left.
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

export const formatMoney = (usd: number) => (usd < 1 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`);

export const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

export const formatTps = (tps: number) => tps.toFixed(1);

export const shortCommit = (commit: string | null) => commit?.slice(0, 8) ?? '';
