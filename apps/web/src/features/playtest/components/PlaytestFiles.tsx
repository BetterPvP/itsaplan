import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { playtestApi, playtestKeys } from '../services/playtestApi';
import PlaytestFileEditor from './PlaytestFileEditor';

// The server's editable config files, those matching the project's patterns. A dot
// marks a file that differs from the base.
export default function PlaytestFiles({ issueId }: { issueId: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const files = useQuery({
    queryKey: playtestKeys.files(issueId),
    queryFn: async () => {
      const res = await playtestApi.files(issueId);
      return res.data ?? [];
    },
  });

  return (
    <div className="flex h-96 overflow-hidden rounded-md border">
      <div className="flex w-56 shrink-0 flex-col border-e">
        <div className="flex items-center justify-between border-b px-2 py-1">
          <span className="text-xs text-muted-foreground">
            {files.data ? `${files.data.length} files` : 'Files'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => void files.refetch()}
            aria-label="Reload the file list"
          >
            <RefreshCw className={cn('size-3', files.isFetching && 'animate-spin')} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {files.isError && (
            <div className="px-2 text-xs text-muted-foreground">
              {(files.error as Error).message}
            </div>
          )}
          {files.data?.length === 0 && (
            <div className="px-2 text-xs text-muted-foreground">
              No file matches the patterns in the project&apos;s playtest settings.
            </div>
          )}
          {files.data?.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setSelected(f.path)}
              className={cn(
                'flex w-full items-center gap-1.5 px-2 py-0.5 text-start font-mono text-[11px] hover:bg-muted',
                selected === f.path && 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  f.changed ? 'bg-amber-400' : 'bg-transparent',
                )}
              />
              <span className="truncate" title={f.path}>
                {f.path}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {selected ? (
          <PlaytestFileEditor key={selected} issueId={issueId} path={selected} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Pick a file to view or edit it.
          </div>
        )}
      </div>
    </div>
  );
}
