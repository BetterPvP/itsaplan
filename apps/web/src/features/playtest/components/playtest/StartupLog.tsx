import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import { playtestApi, playtestKeys, type PlaytestRef } from '../../services/playtestApi';

// What Paper wrote from its start until it was ready.
export default function StartupLog({
  target,
  reveal,
  canShare,
  version,
}: {
  target: PlaytestRef;
  reveal: boolean;
  canShare: boolean;
  // Changes when the server starts or becomes ready, so the log is read again.
  version: string;
}) {
  const log = useQuery({
    queryKey: [...playtestKeys.startup(target, reveal), version],
    queryFn: () => playtestApi.startup(target, reveal),
  });
  const share = usePlaytestCommand(async () => {
    const { url } = await playtestApi.share(target, 'startup');
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Startup log shared, link copied', { description: url });
    return { ok: true };
  });
  const errors = (log.data ?? []).filter((l) => /\/(ERROR|FATAL)\]/.test(l.text)).length;

  return (
    <div className="overflow-hidden rounded-md border bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
        <span>
          {log.data?.length ?? 0} lines · {errors} {errors === 1 ? 'error' : 'errors'}
        </span>
        {canShare && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            disabled={share.isPending || !log.data?.length}
            onClick={() => share.mutate([])}
          >
            <Share2 className="size-3" />
            Share
          </Button>
        )}
      </div>
      <div className="h-[28rem] overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.45] text-zinc-200">
        {log.isPending && <div className="text-zinc-500">Loading…</div>}
        {log.data?.length === 0 && (
          <div className="text-zinc-500">The server has not started yet.</div>
        )}
        {log.data?.map((l) => (
          <div
            key={l.seq}
            className={cn(
              'break-all whitespace-pre-wrap',
              /\/(ERROR|FATAL)\]/.test(l.text) && 'text-red-400',
              /\/WARN\]/.test(l.text) && 'text-amber-300',
            )}
          >
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
