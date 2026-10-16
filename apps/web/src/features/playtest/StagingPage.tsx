'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useShell } from '@/context/shellContext';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import MetricsStrip from './components/playtest/MetricsStrip';
import PlaytestFeed from './components/playtest/PlaytestFeed';
import PlaytestHeader from './components/playtest/PlaytestHeader';
import PlaytestTabs from './components/playtest/PlaytestTabs';
import PlaytestTimeline from './components/playtest/PlaytestTimeline';
import { usePlaytest } from './hooks/usePlaytest';
import { playtestsPath } from './utils/paths';

// The staging server (/:team/:projectKey/playtests/staging): its server, actions,
// console, files and players.
export default function StagingPage() {
  const { project } = useShell();
  const ref = project?.project.ref;
  const [reveal, setReveal] = useState(false);
  const { data, log, isError, error } = usePlaytest(ref ?? null, true, reveal);

  if (!ref) return null;
  const back = (
    <Link
      href={playtestsPath(ref)}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3" /> Playtests
    </Link>
  );
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-3 px-6 py-6">
        {back}
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <ListSkeleton rows={4} rowClassName="h-16" />
      </div>
    );
  }

  const p = data.playtest;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-6">
      {back}
      <PlaytestHeader target={ref} issueHref={null} data={data} />
      {p && <MetricsStrip playtest={p} />}
      {p ? (
        <PlaytestTabs target={ref} data={data} log={log} reveal={reveal} onReveal={setReveal} />
      ) : (
        <p className="text-sm text-muted-foreground">The staging server has not run yet.</p>
      )}
      <section className="min-w-0 space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Timeline
        </h3>
        <PlaytestTimeline playtest={p} />
        <PlaytestFeed feed={data.feed} />
      </section>
    </div>
  );
}
