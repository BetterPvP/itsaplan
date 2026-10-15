import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import { playtestApi } from '../../services/playtestApi';

const PLAYER = /^[A-Za-z0-9_]{1,16}$/;

// Who is online and who is op. With the permission, op anyone by name and deop.
export default function PlaytestPlayers({
  issueId,
  online,
  ops,
  canOp,
}: {
  issueId: number;
  online: string[];
  ops: string[];
  canOp: boolean;
}) {
  const [name, setName] = useState('');
  const op = usePlaytestCommand((player: string, value: boolean) =>
    playtestApi.op(issueId, player, value),
  );
  const opped = new Set(ops.map((o) => o.toLowerCase()));
  const button = (player: string) =>
    canOp && (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 text-xs"
        disabled={op.isPending}
        onClick={() => op.mutate([player, !opped.has(player.toLowerCase())])}
      >
        {opped.has(player.toLowerCase()) ? (
          <>
            <ShieldOff className="size-3" /> Deop
          </>
        ) : (
          <>
            <ShieldCheck className="size-3" /> Op
          </>
        )}
      </Button>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-md border">
        <h3 className="border-b px-3 py-2 text-xs font-medium">Online · {online.length}</h3>
        {online.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">Nobody is online.</p>
        )}
        {online.map((p) => (
          <div key={p} className="flex items-center justify-between px-3 py-1.5 text-sm">
            <span>
              {p}
              {opped.has(p.toLowerCase()) && (
                <span className="ms-2 text-xs text-muted-foreground">op</span>
              )}
            </span>
            {button(p)}
          </div>
        ))}
      </section>
      <section className="rounded-md border">
        <h3 className="border-b px-3 py-2 text-xs font-medium">Operators · {ops.length}</h3>
        {canOp && (
          <form
            className="flex gap-2 border-b px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (PLAYER.test(name)) op.mutate([name, true], { onSuccess: () => setName('') });
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              className="h-7 text-xs"
              aria-invalid={name !== '' && !PLAYER.test(name)}
            />
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs"
              disabled={!PLAYER.test(name) || op.isPending}
            >
              Op
            </Button>
          </form>
        )}
        {ops.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">Nobody is op yet.</p>
        )}
        {ops.map((p) => (
          <div key={p} className="flex items-center justify-between px-3 py-1.5 text-sm">
            {p}
            {button(p)}
          </div>
        ))}
      </section>
    </div>
  );
}
