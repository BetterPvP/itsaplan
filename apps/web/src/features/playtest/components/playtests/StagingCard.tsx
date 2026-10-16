import Link from 'next/link';
import { GitBranch, Server } from 'lucide-react';
import { isLive } from '../../hooks/useProjectPlaytests';
import type { PlaytestState } from '../../services/playtestApi';
import { shortCommit } from '../../utils/format';
import BuildProgress from '../BuildProgress';
import StagePill from '../StagePill';
import CardMetrics from './CardMetrics';

// The staging server above the playtests, opening its page.
export default function StagingCard({ playtest, href }: { playtest: PlaytestState; href: string }) {
  const live = isLive(playtest);
  const onTheWay = !live && !playtest.failed;
  return (
    <Link
      href={href}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-primary/30 bg-card p-4 transition-colors hover:border-primary/60 hover:bg-muted/30"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Server className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Staging server</span>
            <StagePill stage={playtest.stage} failed={playtest.failed} waiting={false} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {playtest.address && <span className="font-mono">{playtest.address}</span>}
            {playtest.branch && (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" />
                <span className="font-mono">{playtest.branch}</span>
                {playtest.commit && (
                  <span className="font-mono">@ {shortCommit(playtest.commit)}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
      {live && <CardMetrics playtest={playtest} />}
      {onTheWay && (
        <div className="w-full sm:w-64">
          <BuildProgress playtest={playtest} />
        </div>
      )}
    </Link>
  );
}
