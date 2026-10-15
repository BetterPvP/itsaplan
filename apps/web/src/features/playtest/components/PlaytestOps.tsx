import { useState } from 'react';
import { ChevronDown, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { usePlaytestCommand } from '../hooks/usePlaytestCommand';
import { playtestApi } from '../services/playtestApi';

const PLAYER = /^[A-Za-z0-9_]{1,16}$/;

// The server's operators: op a player by name, or deop one from the list.
export default function PlaytestOps({ issueId, ops }: { issueId: number; ops: string[] }) {
  const [name, setName] = useState('');
  const op = usePlaytestCommand((player: string, value: boolean) =>
    playtestApi.op(issueId, player, value),
  );
  const submit = () => {
    if (!PLAYER.test(name)) return;
    op.mutate([name, true], { onSuccess: () => setName('') });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <ShieldCheck className="size-3.5" />
          OPs{' '}
          {ops.length > 0 && (
            <span className="text-muted-foreground tabular-nums">{ops.length}</span>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <form
          className="p-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Player name, Enter to op"
            className="h-7 text-xs"
            aria-invalid={name !== '' && !PLAYER.test(name)}
          />
        </form>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Operators</DropdownMenuLabel>
        {ops.length === 0 && (
          <div className="px-2 pb-1.5 text-xs text-muted-foreground">Nobody is op yet.</div>
        )}
        {ops.map((player) => (
          <DropdownMenuItem
            key={player}
            className="justify-between text-xs"
            onSelect={(e) => {
              e.preventDefault();
              op.mutate([player, false]);
            }}
          >
            {player}
            <span className="flex items-center gap-1 text-muted-foreground">
              Deop <X className="size-3" />
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
