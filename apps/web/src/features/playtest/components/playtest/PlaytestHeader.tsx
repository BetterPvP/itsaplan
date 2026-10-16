import Link from 'next/link';
import { ExternalLink, GitBranch, GitPullRequest } from 'lucide-react';
import type { IssuePlaytest, PlaytestRef } from '../../services/playtestApi';
import { shortCommit } from '../../utils/format';
import CopyAddress from '../CopyAddress';
import StagePill from '../StagePill';
import PlaytestPageActions from './PlaytestPageActions';

// The playtest's issue, stage, branch, pull request and server address, with its
// actions. The staging server has no issue to link.
export default function PlaytestHeader({
  target,
  issueHref,
  data,
}: {
  target: PlaytestRef;
  issueHref: string | null;
  data: IssuePlaytest;
}) {
  const p = data.playtest;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {issueHref ? (
            <Link href={issueHref} className="text-sm text-muted-foreground hover:text-foreground">
              {data.identifier}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">{data.identifier}</span>
          )}
          {p && <StagePill stage={p.stage} failed={p.failed} waiting={p.waiting} />}
        </div>
        <h1 className="text-lg leading-snug font-semibold">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(p?.branch ?? data.branch) && (
            <span className="inline-flex items-center gap-1">
              <GitBranch className="size-3" />
              <span className="font-mono">{p?.branch ?? data.branch}</span>
              {p?.commit && <span className="font-mono">@ {shortCommit(p.commit)}</span>}
            </span>
          )}
          {data.prUrl && (
            <a
              href={data.prUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <GitPullRequest className="size-3" /> Pull request
            </a>
          )}
          {p?.runUrl && (
            <a
              href={p.runUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="size-3" /> Workflow run
            </a>
          )}
          {p?.address && p.stage !== 'ended' && <CopyAddress address={p.address} />}
        </div>
      </div>
      <PlaytestPageActions target={target} data={data} />
    </div>
  );
}
