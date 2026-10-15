import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import SettingsCard from '@/components/common/page/SettingsCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { playtestApi, playtestKeys, type PlaytestConfig } from '../services/playtestApi';

const NONE = 'none';
const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// Which column starts a playtest, who is op on every server, and which config files
// can be edited from the issue page. Saved together.
export default function PlaytestSettings({ project }: { project: ProjectDetail }) {
  const projectKey = project.project.ref;
  const qc = useQueryClient();
  const config = useQuery({
    queryKey: playtestKeys.config(projectKey),
    queryFn: () => playtestApi.config(projectKey),
  });
  const [column, setColumn] = useState(NONE);
  const [ops, setOps] = useState('');
  const [patterns, setPatterns] = useState('');
  useEffect(() => {
    if (!config.data) return;
    setColumn(config.data.autoStartColumnId == null ? NONE : String(config.data.autoStartColumnId));
    setOps(config.data.defaultOps.join('\n'));
    setPatterns(config.data.filePatterns.join('\n'));
  }, [config.data]);
  const save = useMutation({
    mutationFn: (next: PlaytestConfig) => playtestApi.setConfig(projectKey, next),
    onSuccess: (saved) => {
      qc.setQueryData(playtestKeys.config(projectKey), saved);
      toast.success('Playtest settings saved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save'),
  });

  if (config.isPending) return <ListSkeleton rows={3} rowClassName="h-16" />;
  if (config.isError)
    return <p className="text-sm text-muted-foreground">{(config.error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <SettingsCard className="space-y-5 p-4">
        <div className="space-y-1.5">
          <Label>Start a playtest when an issue enters</Label>
          <p className="text-xs text-muted-foreground">
            The issue needs a branch or pull request linked in BetterPvP/BetterPvP. Moving it to a
            completed or canceled column ends its server.
          </p>
          <Select value={column} onValueChange={setColumn}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No column, start by hand</SelectItem>
              {project.columns.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="playtest-ops">Default operators</Label>
          <p className="text-xs text-muted-foreground">
            Minecraft names, one per line. They are made op when a server is ready.
          </p>
          <Textarea
            id="playtest-ops"
            value={ops}
            onChange={(e) => setOps(e.target.value)}
            rows={4}
            className="max-w-sm font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="playtest-patterns">Editable files</Label>
          <p className="text-xs text-muted-foreground">
            Glob patterns relative to the server folder, one per line, such as plugins/*/config.yml.
          </p>
          <Textarea
            id="playtest-patterns"
            value={patterns}
            onChange={(e) => setPatterns(e.target.value)}
            rows={6}
            className="max-w-xl font-mono text-xs"
          />
        </div>
      </SettingsCard>
      <Button
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            autoStartColumnId: column === NONE ? null : Number(column),
            defaultOps: lines(ops),
            filePatterns: lines(patterns),
          })
        }
      >
        Save
      </Button>
    </div>
  );
}
