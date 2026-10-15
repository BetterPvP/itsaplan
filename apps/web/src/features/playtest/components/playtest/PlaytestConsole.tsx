import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import { playtestApi, type LogLine } from '../../services/playtestApi';
import { formatDuration } from '../../utils/format';

const tone = (l: LogLine) =>
  l.src === 'command'
    ? 'text-sky-300'
    : l.src === 'setup'
      ? 'text-zinc-400'
      : /\/(ERROR|FATAL)\]/.test(l.text)
        ? 'text-red-400'
        : /\/WARN\]/.test(l.text)
          ? 'text-amber-300'
          : '';

// The VM's setup and the server log as one stream, following the newest line until
// the reader scrolls up. Once Paper starts, the setup folds into one line. Commands
// and their answers sit where they were sent. Commands sent before the server is
// ready wait and run once it is.
export default function PlaytestConsole({
  issueId,
  log,
  canRun,
  canShare,
  rconReady,
}: {
  issueId: number;
  log: LogLine[];
  canRun: boolean;
  canShare: boolean;
  rconReady: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [command, setCommand] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const run = usePlaytestCommand((c: string) => playtestApi.console(issueId, c));
  const share = usePlaytestCommand(async () => {
    const { url } = await playtestApi.share(issueId, 'console');
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Log shared, link copied', { description: url });
    return { ok: true };
  });

  const setup = useMemo(() => {
    const lines = log.filter((l) => l.src === 'setup');
    const firstServer = log.find((l) => l.src === 'server');
    const end = firstServer?.ts ?? lines.at(-1)?.ts ?? 0;
    return { lines, folded: !!firstServer, took: lines[0] ? end - lines[0].ts : 0 };
  }, [log]);

  useEffect(() => {
    if (follow.current && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log, setupOpen]);

  const submit = () => {
    const text = command.trim();
    if (!text) return;
    setCommand('');
    run.mutate([text]);
  };

  let setupShown = false;
  return (
    <div className="overflow-hidden rounded-md border bg-zinc-950">
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="h-[28rem] overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.45] text-zinc-200"
      >
        {log.length === 0 && <div className="text-zinc-500">No log yet.</div>}
        {log.map((l) => {
          if (l.src === 'setup' && setup.folded) {
            if (setupShown && !setupOpen) return null;
            if (!setupShown) {
              setupShown = true;
              const Chevron = setupOpen ? ChevronDown : ChevronRight;
              return (
                <div key="setup">
                  <button
                    type="button"
                    onClick={() => setSetupOpen((v) => !v)}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
                  >
                    <Chevron className="size-3" />
                    VM setup · {formatDuration(setup.took)} · {setup.lines.length} lines
                  </button>
                  {setupOpen && (
                    <div className="break-all whitespace-pre-wrap text-zinc-400">{l.text}</div>
                  )}
                </div>
              );
            }
          }
          return (
            <div key={l.seq} className={cn('break-all whitespace-pre-wrap', tone(l))}>
              {l.text}
            </div>
          );
        })}
      </div>
      {(canRun || canShare) && (
        <div className="flex items-center gap-2 border-t border-zinc-800 px-3 py-1.5">
          {canRun && (
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <span className="font-mono text-xs text-zinc-500">/</span>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={
                  rconReady
                    ? 'Run a console command'
                    : 'Commands open when the server is ready; what you send now waits until then'
                }
                disabled={run.isPending}
                className="h-7 border-0 bg-transparent px-0 font-mono text-xs text-zinc-100 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
            </form>
          )}
          {canShare && (
            <Button
              variant="ghost"
              size="sm"
              className="ms-auto h-7 gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              disabled={share.isPending || log.length === 0}
              onClick={() => share.mutate([])}
            >
              <Share2 className="size-3.5" />
              Share log
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
