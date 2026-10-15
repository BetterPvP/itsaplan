import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import { usePermissions } from '@/hooks/usePermissions';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { Button } from '@/components/ui/button';
import { playtestApi, playtestKeys, type PlaytestConfig } from '../../services/playtestApi';
import ServerSettings from './ServerSettings';
import SharingSettings from './SharingSettings';
import StartSettings from './StartSettings';

// Every playtest setting of the project, saved together.
export default function PlaytestSettings({ project }: { project: ProjectDetail }) {
  const projectKey = project.project.ref;
  const qc = useQueryClient();
  const { can } = usePermissions();
  const editable = can('playtest_settings', 'edit');
  const config = useQuery({
    queryKey: playtestKeys.config(projectKey),
    queryFn: () => playtestApi.config(projectKey),
  });
  const [draft, setDraft] = useState<PlaytestConfig | null>(null);
  useEffect(() => {
    if (config.data) setDraft(config.data);
  }, [config.data]);
  const save = useMutation({
    mutationFn: (next: PlaytestConfig) => playtestApi.setConfig(projectKey, next),
    onSuccess: (saved) => {
      qc.setQueryData(playtestKeys.config(projectKey), saved);
      toast.success('Playtest settings saved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save'),
  });

  if (config.isPending || (!draft && !config.isError))
    return <ListSkeleton rows={3} rowClassName="h-16" />;
  if (config.isError || !draft)
    return <p className="text-sm text-muted-foreground">{(config.error as Error).message}</p>;
  const set = (patch: Partial<PlaytestConfig>) => setDraft({ ...draft, ...patch });

  return (
    <div className="space-y-10">
      <StartSettings project={project} config={draft} set={set} disabled={!editable} />
      <ServerSettings key={config.dataUpdatedAt} config={draft} set={set} disabled={!editable} />
      <SharingSettings config={draft} set={set} disabled={!editable} />
      {editable && (
        <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
          Save
        </Button>
      )}
    </div>
  );
}
