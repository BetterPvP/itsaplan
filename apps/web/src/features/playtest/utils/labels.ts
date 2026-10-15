import type { Stage } from '../services/playtestApi';

export const STAGE_LABELS: Record<Stage, string> = {
  queued: 'Queued',
  build: 'Build',
  launch: 'Launch',
  boot: 'Boot',
  ready: 'Ready',
  ended: 'Ended',
};

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
