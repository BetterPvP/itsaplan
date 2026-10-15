import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePlaytestCommand } from '../hooks/usePlaytestCommand';
import { playtestApi, type LogLine } from '../services/playtestApi';

const level = (text: string) =>
  /\/(ERROR|FATAL)\]/.test(text) ? 'text-red-400' : /\/WARN\]/.test(text) ? 'text-amber-300' : '';

// The live server log, following the newest line until the reader scrolls up, with
// a console input under it.
export default function PlaytestConsole({
  issueId,
  log,
  canRun,
}: {
  issueId: number;
  log: LogLine[];
  canRun: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [command, setCommand] = useState('');
  const [replies, setReplies] = useState<{ id: number; text: string }[]>([]);
  const run = usePlaytestCommand((c: string) => playtestApi.console(issueId, c));

  useEffect(() => {
    if (follow.current && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log, replies]);

  const submit = () => {
    const text = command.trim();
    if (!text) return;
    setCommand('');
    run.mutate([text], {
      onSuccess: (res) =>
        setReplies((r) => [
          ...r,
          { id: Date.now(), text: `> /${text.replace(/^\//, '')}\n${res.output ?? ''}` },
        ]),
    });
  };

  return (
    <div className="overflow-hidden rounded-md border bg-zinc-950">
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="h-72 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.45] text-zinc-200"
      >
        {log.length === 0 && <div className="text-zinc-500">No log yet.</div>}
        {log.map((l) => (
          <div key={l.seq} className={cn('break-all whitespace-pre-wrap', level(l.text))}>
            {l.text}
          </div>
        ))}
        {replies.map((r) => (
          <div key={r.id} className="break-all whitespace-pre-wrap text-sky-300">
            {r.text}
          </div>
        ))}
      </div>
      {canRun && (
        <form
          className="flex items-center gap-2 border-t border-zinc-800 px-3 py-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className="font-mono text-xs text-zinc-500">/</span>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Run a console command"
            disabled={run.isPending}
            className="h-7 border-0 bg-transparent px-0 font-mono text-xs text-zinc-100 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </form>
      )}
    </div>
  );
}
