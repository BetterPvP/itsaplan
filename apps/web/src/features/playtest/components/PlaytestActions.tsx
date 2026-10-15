import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Power, RotateCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaytestCommand } from '../hooks/usePlaytestCommand';
import {
  playtestApi,
  playtestKeys,
  type PlaytestAction,
  type PlaytestState,
} from '../services/playtestApi';

const CONFIRM: Partial<Record<PlaytestAction, string>> = {
  promote: 'Save as base for every playtest?',
  end: 'End the server?',
};

// Start shows while there is no playtest. End shows while one runs, Restart and Save
// as base while its server is connected. Save as base and End ask for a second click.
export default function PlaytestActions({
  issueId,
  playtest,
}: {
  issueId: number;
  playtest: PlaytestState | null;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<PlaytestAction | null>(null);
  const action = usePlaytestCommand((a: PlaytestAction) => playtestApi.action(issueId, a));
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const run = (a: PlaytestAction) => {
    if (CONFIRM[a] && confirming !== a) return setConfirming(a);
    setConfirming(null);
    action.mutate([a], {
      onSuccess: () => void qc.invalidateQueries({ queryKey: playtestKeys.issue(issueId) }),
    });
  };

  const up = playtest && playtest.stage !== 'ended';
  const button = (a: PlaytestAction, label: string, Icon: typeof Play) => (
    <Button
      key={a}
      variant={confirming === a ? 'destructive' : 'outline'}
      size="sm"
      className="h-7 gap-1.5 text-xs"
      disabled={action.isPending}
      onClick={() => run(a)}
    >
      <Icon className="size-3.5" />
      {confirming === a ? CONFIRM[a] : label}
    </Button>
  );

  if (!up) return button('start', playtest ? 'Start again' : 'Start playtest', Play);
  return (
    <>
      {playtest.connected && button('restart', 'Restart', RotateCw)}
      {playtest.connected && button('promote', 'Save as base', Save)}
      {button('end', 'End', Power)}
    </>
  );
}
