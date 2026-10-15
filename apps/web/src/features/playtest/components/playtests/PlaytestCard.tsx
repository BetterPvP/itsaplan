import Link from 'next/link';
import { GitBranch } from 'lucide-react';
import { isLive } from '../../hooks/useProjectPlaytests';
import type { ProjectPlaytest } from '../../services/playtestApi';
import { shortCommit } from '../../utils/format';
import ApprovalStack from '../ApprovalStack';
import BuildProgress from '../BuildProgress';
import StagePill from '../StagePill';
import CardMetrics from './CardMetrics';

// One playtest on the Playtests page, opening its page.
export default function PlaytestCard({
  playtest,
  href,
}: {
  playtest: ProjectPlaytest;
  href: string;
}) {
  const live = isLive(playtest);
  const onTheWay = playtest.stage !== 'ended' && !live && !playtest.failed;
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{playtest.issue}</div>
          <div className="line-clamp-2 text-sm font-medium">{playtest.title}</div>
        </div>
        <StagePill stage={playtest.stage} failed={playtest.failed} waiting={playtest.waiting} />
      </div>
      {playtest.branch && (
        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <GitBranch className="size-3 shrink-0" />
          <span className="truncate font-mono">{playtest.branch}</span>
          {playtest.commit && <span className="font-mono">@ {shortCommit(playtest.commit)}</span>}
        </div>
      )}
      {live && <CardMetrics playtest={playtest} />}
      {onTheWay && <BuildProgress playtest={playtest} />}
      <ApprovalStack
        reviews={playtest.reviews}
        approved={playtest.approved}
        required={playtest.requiredApprovals}
      />
    </Link>
  );
}
