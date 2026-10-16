'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useShell } from '@/context/shellContext';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { issuePath } from '@/utils/paths';
import MetricsStrip from './components/playtest/MetricsStrip';
import PlaytestFeed from './components/playtest/PlaytestFeed';
import PlaytestHeader from './components/playtest/PlaytestHeader';
import PlaytestTabs from './components/playtest/PlaytestTabs';
import PlaytestTimeline from './components/playtest/PlaytestTimeline';
import ReviewsPanel from './components/playtest/ReviewsPanel';
import { usePlaytest } from './hooks/usePlaytest';
import { playtestApi } from './services/playtestApi';
import { playtestsPath } from './utils/paths';

// One issue's playtest (/:team/:projectKey/playtests/:identifier): its server, actions,
// console, files, players and reviews.
export default function PlaytestPage() {
  const { project } = useShell();
  const { identifier } = useParams<{ identifier: string }>();
  const ref = project?.project.ref;
  const issueId = useQuery({
    queryKey: ['playtest', 'issue-id', ref, identifier],
    queryFn: () => playtestApi.issueId(ref!, decodeURIComponent(identifier)),
    enabled: !!ref && !!identifier,
  });
  const [reveal, setReveal] = useState(false);
  const { data, log, isError, error } = usePlaytest(issueId.data ?? null, true, reveal);

  if (!ref) return null;
  const back = (
    <Link
      href={playtestsPath(ref)}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3" /> Playtests
    </Link>
  );
  if (issueId.isError || isError) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-3 px-6 py-6">
        {back}
        <p className="text-sm text-muted-foreground">
          {((issueId.error ?? error) as Error).message}
        </p>
      </div>
    );
  }
  if (!data || issueId.data == null) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <ListSkeleton rows={4} rowClassName="h-16" />
      </div>
    );
  }

  const p = data.playtest;
  const seq = Number(data.identifier.split('-').pop());
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-6">
      {back}
      <PlaytestHeader target={issueId.data} issueHref={issuePath(ref, seq)} data={data} />
      {!data.eligible && (
        <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          The issue has no branch or pull request linked in the playtest repository yet.
        </p>
      )}
      {p && <MetricsStrip playtest={p} />}
      {p ? (
        <PlaytestTabs
          target={issueId.data}
          data={data}
          log={log}
          reveal={reveal}
          onReveal={setReveal}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No playtest has run for this issue yet.</p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Timeline
          </h3>
          <PlaytestTimeline playtest={p} />
          <PlaytestFeed feed={data.feed} />
        </section>
        <ReviewsPanel
          reviews={data.approvals}
          commit={p?.commit ?? null}
          approved={p?.approved ?? 0}
          required={p?.requiredApprovals ?? data.settings?.requiredApprovals ?? 0}
        />
      </div>
    </div>
  );
}
