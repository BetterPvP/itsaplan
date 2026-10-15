import Link from 'next/link';
import { isLive } from '../../hooks/useProjectPlaytests';
import type { ProjectPlaytest } from '../../services/playtestApi';
import { shortCommit } from '../../utils/format';
import ApprovalStack from '../ApprovalStack';
import BuildProgress from '../BuildProgress';
import StagePill from '../StagePill';
import CardMetrics from './CardMetrics';

// One playtest as a row of the list view.
export default function PlaytestRow({
  playtest,
  href,
}: {
  playtest: ProjectPlaytest;
  href: string;
}) {
  const live = isLive(playtest);
  return (
    <Link
      href={href}
      className="grid grid-cols-[minmax(0,2fr)_auto_minmax(0,1.3fr)_minmax(0,1.5fr)_auto] items-center gap-4 border-b px-4 py-2.5 last:border-b-0 hover:bg-muted/30"
    >
      <div className="min-w-0">
        <span className="me-2 text-xs text-muted-foreground">{playtest.issue}</span>
        <span className="text-sm">{playtest.title}</span>
      </div>
      <StagePill stage={playtest.stage} failed={playtest.failed} waiting={playtest.waiting} />
      <div className="truncate font-mono text-xs text-muted-foreground">
        {playtest.branch}
        {playtest.commit && ` @ ${shortCommit(playtest.commit)}`}
      </div>
      <div className="min-w-0">
        {live ? (
          <CardMetrics playtest={playtest} />
        ) : (
          playtest.stage !== 'ended' && !playtest.failed && <BuildProgress playtest={playtest} />
        )}
      </div>
      <ApprovalStack
        reviews={playtest.reviews}
        approved={playtest.approved}
        required={playtest.requiredApprovals}
      />
    </Link>
  );
}
