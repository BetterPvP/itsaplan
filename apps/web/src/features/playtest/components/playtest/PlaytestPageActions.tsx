import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  MessageSquareWarning,
  MoreHorizontal,
  Play,
  Power,
  RefreshCw,
  RotateCw,
  Save,
  Undo2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import {
  playtestApi,
  playtestKeys,
  type IssuePlaytest,
  type PlaytestAction,
  type Verdict,
} from '../../services/playtestApi';
import ConfirmAction from './ConfirmAction';

type Confirming = 'end' | 'promote' | null;

// The playtest's actions, each shown only to someone allowed to take it.
export default function PlaytestPageActions({
  issueId,
  data,
}: {
  issueId: number;
  data: IssuePlaytest;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const { permissions: can, playtest } = data;
  const refresh = () => void qc.invalidateQueries({ queryKey: playtestKeys.issue(issueId) });
  const action = usePlaytestCommand(async (a: PlaytestAction) => {
    const res = await playtestApi.action(issueId, a);
    if (res.waiting)
      toast('Waiting for a free server', { description: 'The project runs as many as it allows.' });
    return res;
  });
  const { data: session } = useSession();
  // A review sets or replaces the caller's verdict on the current build; clicking the
  // verdict they already gave takes it back.
  const review = usePlaytestCommand(async (verdict: Verdict | null) => {
    if (verdict) await playtestApi.review(issueId, verdict);
    else await playtestApi.unreview(issueId);
    return { ok: true };
  }, 'Review saved');
  const testers = usePlaytestCommand(async () => {
    await playtestApi.testers(issueId);
    return { ok: true };
  }, 'Asked for testers on Discord');

  const run = (a: PlaytestAction) => action.mutate([a], { onSuccess: refresh });
  const running = playtest != null && playtest.stage !== 'ended';
  const connected = running && playtest.connected;
  const hasBuild = !!playtest?.commit && running;
  const mine = data.approvals.find(
    (r) => r.userId === session?.user.id && r.commit === playtest?.commit,
  )?.verdict;
  const testersReady = data.settings?.testersWebhookSet ?? false;
  const more = [
    can.restart &&
      running && {
        key: 'redeploy',
        label: 'Redeploy',
        icon: RefreshCw,
        onSelect: () => run('redeploy'),
      },
    can.restart &&
      playtest &&
      !running && {
        key: 'again',
        label: 'Start again',
        icon: Play,
        onSelect: () => run('start-again'),
      },
    can.saveBase &&
      connected && {
        key: 'base',
        label: 'Save as base',
        icon: Save,
        onSelect: () => setConfirming('promote'),
      },
    can.end &&
      running && { key: 'end', label: 'End', icon: Power, onSelect: () => setConfirming('end') },
  ].filter(Boolean) as { key: string; label: string; icon: typeof Play; onSelect: () => void }[];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {can.start && !playtest && data.eligible && (
        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={action.isPending}
          onClick={() => run('start')}
        >
          <Play className="size-3.5" /> Start playtest
        </Button>
      )}
      {can.review && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={!hasBuild || review.isPending}
            onClick={() =>
              review.mutate([mine === 'approved' ? null : 'approved'], { onSuccess: refresh })
            }
          >
            {mine === 'approved' ? (
              <>
                <Undo2 className="size-3.5" /> Remove approval
              </>
            ) : (
              <>
                <Check className="size-3.5" /> Approve
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={!hasBuild || review.isPending}
            onClick={() =>
              review.mutate([mine === 'changes' ? null : 'changes'], { onSuccess: refresh })
            }
          >
            {mine === 'changes' ? (
              <>
                <Undo2 className="size-3.5" /> Withdraw request
              </>
            ) : (
              <>
                <MessageSquareWarning className="size-3.5" /> Request changes
              </>
            )}
          </Button>
        </>
      )}
      {can.requestTesters && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={!testersReady || !running || testers.isPending}
                onClick={() => testers.mutate([])}
              >
                <Users className="size-3.5" /> Request testers
              </Button>
            </span>
          </TooltipTrigger>
          {!testersReady && (
            <TooltipContent>
              No Discord webhook is set in the project&apos;s playtest settings
            </TooltipContent>
          )}
        </Tooltip>
      )}
      {can.restart && connected && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={action.isPending}
          onClick={() => run('restart')}
        >
          <RotateCw className="size-3.5" /> Restart
        </Button>
      )}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" className="size-8" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {more.map((m) => (
              <DropdownMenuItem key={m.key} onSelect={m.onSelect}>
                <m.icon className="size-3.5" />
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ConfirmAction
        open={confirming === 'end'}
        onOpenChange={(o) => !o && setConfirming(null)}
        title="End the server?"
        description="The server shuts down and its changes are lost, unless you save it as the base first."
        confirm="End"
        onConfirm={() => run('end')}
      />
      <ConfirmAction
        open={confirming === 'promote'}
        onOpenChange={(o) => !o && setConfirming(null)}
        title="Save as base?"
        description="Every playtest from now on starts from this server's worlds and configs. The server ends after it is saved."
        confirm="Save as base"
        onConfirm={() => run('promote')}
      />
    </div>
  );
}
