'use client';

import { useMemo, useState } from 'react';
import { useShell } from '@/context/shellContext';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import NeedsTestersBanner from './components/playtests/NeedsTestersBanner';
import PlaytestCard from './components/playtests/PlaytestCard';
import PlaytestRow from './components/playtests/PlaytestRow';
import PlaytestsToolbar, {
  type PlaytestFilter,
  type PlaytestLayout,
} from './components/playtests/PlaytestsToolbar';
import { isLive, useProjectPlaytests } from './hooks/useProjectPlaytests';
import { useStoredChoice } from './hooks/useStoredChoice';
import type { ProjectPlaytest } from './services/playtestApi';
import { playtestPath } from './utils/paths';

const LAYOUTS = ['cards', 'list'] as const;

const needsTesters = (p: ProjectPlaytest) => isLive(p) && p.approved < p.requiredApprovals;

// Running first, newest first; ended ones after.
const byActivity = (a: ProjectPlaytest, b: ProjectPlaytest) =>
  Number(a.stage === 'ended') - Number(b.stage === 'ended') || b.updatedAt - a.updatedAt;

// Every playtest of the project (/:team/:projectKey/playtests).
export default function PlaytestsPage() {
  const { project } = useShell();
  const ref = project?.project.ref;
  const { data, isPending, isError, error } = useProjectPlaytests(ref);
  const [filter, setFilter] = useState<PlaytestFilter>('all');
  const [layout, setLayout] = useStoredChoice<PlaytestLayout>('playtests-layout', LAYOUTS, 'cards');

  const waiting = useMemo(
    () =>
      (data?.playtests ?? [])
        .filter(needsTesters)
        .sort((a, b) => (a.stages.ready ?? 0) - (b.stages.ready ?? 0)),
    [data],
  );
  const shown =
    filter === 'needs-testers' ? waiting : [...(data?.playtests ?? [])].sort(byActivity);
  if (!ref) return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">Playtests</h1>
        <p className="text-sm text-muted-foreground">
          Every playtest server of the project, with what it runs and who has approved it.
        </p>
      </div>
      {waiting[0] && (
        <NeedsTestersBanner playtest={waiting[0]} href={playtestPath(ref, waiting[0].issue)} />
      )}
      <PlaytestsToolbar
        filter={filter}
        onFilter={setFilter}
        layout={layout}
        onLayout={setLayout}
        needsTesters={waiting.length}
      />
      {isPending && <ListSkeleton rows={4} rowClassName="h-24" />}
      {isError && <p className="text-sm text-muted-foreground">{(error as Error).message}</p>}
      {data && shown.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === 'needs-testers'
            ? 'Every live server has its approvals.'
            : 'No playtests yet. Move an issue with a linked branch into the start column to start one.'}
        </p>
      )}
      {layout === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <PlaytestCard key={p.issue} playtest={p} href={playtestPath(ref, p.issue)} />
          ))}
        </div>
      ) : (
        shown.length > 0 && (
          <div className="overflow-hidden rounded-lg border">
            {shown.map((p) => (
              <PlaytestRow key={p.issue} playtest={p} href={playtestPath(ref, p.issue)} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
