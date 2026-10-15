import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { DevelopmentLink } from '@/lib/api/endpoints/git';
import { usePersistedOpen } from '@/hooks/usePersistedOpen';
import { cn } from '@/lib/utils';
import PlaytestActions from './components/PlaytestActions';
import PlaytestConsole from './components/PlaytestConsole';
import PlaytestFeed from './components/PlaytestFeed';
import PlaytestFiles from './components/PlaytestFiles';
import PlaytestOps from './components/PlaytestOps';
import PlaytestTimeline from './components/PlaytestTimeline';
import { usePlaytest } from './hooks/usePlaytest';
import { PLAYTEST_REPOSITORY, STAGE_LABELS } from './utils/labels';

// The issue's playtest: its stages, what it reported, the live server log with a
// console, operators, config files and the server controls. Shown for an issue with a
// branch or pull request linked in the playtest repository.
export default function PlaytestSection({
  issueId,
  links,
  canEdit,
}: {
  issueId: number;
  links: DevelopmentLink[];
  canEdit: boolean;
}) {
  const linked = links.some(
    (l) => l.provider === 'github' && l.repository.toLowerCase() === PLAYTEST_REPOSITORY,
  );
  const { open, toggle } = usePersistedOpen('issue-playtest-open');
  const [tab, setTab] = useState<'console' | 'files'>('console');
  const { data, log } = usePlaytest(issueId, linked);
  if (!linked || !data?.configured || !data.eligible) return null;
  const playtest = data.playtest;
  const Chevron = open ? ChevronDown : ChevronRight;
  const connected = !!playtest?.connected && playtest.stage !== 'ended';

  return (
    <div className="mb-5 border-b pb-4">
      <div className={cn('flex h-7 items-center justify-between gap-3', open && 'mb-3')}>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
          onClick={toggle}
        >
          <Chevron className="size-3.5" />
          Playtest
          {playtest && (
            <span className={cn('normal-case', playtest.failed && 'text-red-500')}>
              · {STAGE_LABELS[playtest.stage]}
              {playtest.failed ? ' failed' : ''}
            </span>
          )}
        </button>
        {canEdit && (
          <div className="flex items-center gap-1.5">
            {connected && <PlaytestOps issueId={issueId} ops={playtest.ops} />}
            <PlaytestActions issueId={issueId} playtest={playtest} />
          </div>
        )}
      </div>
      {open && (
        <div className="space-y-4">
          <PlaytestTimeline playtest={playtest} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Branch{' '}
              <span className="font-mono text-foreground">{playtest?.branch ?? data.branch}</span>
              {playtest?.commit && (
                <span className="font-mono"> @ {playtest.commit.slice(0, 8)}</span>
              )}
            </span>
            {playtest?.address && playtest.stage !== 'ended' && (
              <span>
                Server{' '}
                <span className="font-mono text-foreground select-all">{playtest.address}</span>
              </span>
            )}
            {playtest?.runUrl && (
              <a
                href={playtest.runUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Workflow run <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <PlaytestFeed feed={data.feed} />
          {playtest && (
            <div className="space-y-2">
              <div className="flex gap-3 text-xs">
                {(['console', 'files'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      'border-b-2 pb-0.5',
                      tab === t
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t === 'console' ? 'Console' : 'Config files'}
                  </button>
                ))}
              </div>
              {tab === 'console' && (
                <PlaytestConsole issueId={issueId} log={log} canRun={canEdit && connected} />
              )}
              {tab === 'files' &&
                (canEdit && connected ? (
                  <PlaytestFiles issueId={issueId} />
                ) : (
                  <div className="text-xs text-muted-foreground">
                    The config files can be edited while the server is up.
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
