import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IssuePlaytest, LogLine } from '../../services/playtestApi';
import PlaytestConsole from './PlaytestConsole';
import PlaytestFiles from './PlaytestFiles';
import PlaytestPlayers from './PlaytestPlayers';
import StartupLog from './StartupLog';

type Tab = 'console' | 'files' | 'players' | 'startup';

// Console, config files, players and ops, and the startup log, each shown to someone
// allowed to see it. The sensitive toggle reveals IPs and secrets in the logs.
export default function PlaytestTabs({
  issueId,
  data,
  log,
  reveal,
  onReveal,
}: {
  issueId: number;
  data: IssuePlaytest;
  log: LogLine[];
  reveal: boolean;
  onReveal: (v: boolean) => void;
}) {
  const can = data.permissions;
  const p = data.playtest;
  const connected = !!p && p.stage !== 'ended' && p.connected;
  const tabs = [
    can.readConsole && ['console', 'Console'],
    can.readFiles && ['files', 'Files'],
    ['players', 'Players and ops'],
    can.readConsole && ['startup', 'Startup log'],
  ].filter(Boolean) as [Tab, string][];
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? 'players');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-4">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                '-mb-px border-b-2 pb-2 text-sm',
                tab === key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {can.showSensitive && (tab === 'console' || tab === 'startup') && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 h-7 gap-1.5 text-xs"
            onClick={() => onReveal(!reveal)}
          >
            {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {reveal ? 'Hide sensitive info' : 'Show sensitive info'}
          </Button>
        )}
      </div>
      {tab === 'console' && (
        <PlaytestConsole
          issueId={issueId}
          log={log}
          canRun={can.sendCommands && !!p && p.stage !== 'ended'}
          canShare={can.shareLogs}
          rconReady={connected && !!p?.metrics?.rconReady}
        />
      )}
      {tab === 'files' &&
        (connected ? (
          <PlaytestFiles issueId={issueId} canEdit={can.editFiles} />
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            The files can be opened while the server is up.
          </p>
        ))}
      {tab === 'players' && (
        <PlaytestPlayers
          issueId={issueId}
          online={p?.metrics?.players ?? []}
          ops={p?.ops ?? []}
          canOp={can.opPlayers && connected}
        />
      )}
      {tab === 'startup' && (
        <StartupLog
          issueId={issueId}
          reveal={reveal}
          canShare={can.shareLogs}
          version={`${p?.stages.boot ?? 0}-${p?.stages.ready ?? 0}`}
        />
      )}
    </div>
  );
}
