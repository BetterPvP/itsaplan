import Link from 'next/link';
import { Hourglass } from 'lucide-react';
import type { ProjectPlaytest } from '../../services/playtestApi';
import { formatDuration } from '../../utils/format';
import CopyAddress from '../CopyAddress';

// The live server that has waited longest for its approvals.
export default function NeedsTestersBanner({
  playtest,
  href,
}: {
  playtest: ProjectPlaytest;
  href: string;
}) {
  const since = playtest.stages.ready;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3">
      <Hourglass className="size-4 text-amber-600 dark:text-amber-300" />
      <div className="min-w-0 flex-1 text-sm">
        <Link href={href} className="font-medium hover:underline">
          {playtest.issue}: {playtest.title}
        </Link>{' '}
        <span className="text-muted-foreground">
          needs testers: {playtest.approved} of {playtest.requiredApprovals} approved
          {since != null && `, waiting ${formatDuration(Date.now() - since)}`}
        </span>
      </div>
      {playtest.address && <CopyAddress address={playtest.address} />}
    </div>
  );
}
