import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import { playtestApi, playtestKeys, type PlaytestRef } from '../../services/playtestApi';
import { diffLines } from '../../utils/diff';

// One config file: edit it, or see how the edit differs from the base. Saving writes
// the file on the server; most plugins read it on the next restart.
export default function PlaytestFileEditor({
  target,
  path,
  canEdit,
}: {
  target: PlaytestRef;
  path: string;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const file = useQuery({
    queryKey: ['playtest', 'file', target, path],
    queryFn: async () => (await playtestApi.file(target, path)).data!,
  });
  const save = usePlaytestCommand(
    (content: string) => playtestApi.writeFile(target, path, content),
    `Saved ${path}`,
  );
  const content = draft ?? file.data?.content ?? '';
  const diff = useMemo(
    () => (showDiff ? diffLines(file.data?.base ?? '', content) : []),
    [showDiff, file.data?.base, content],
  );

  if (file.isPending) return <div className="p-3 text-xs text-muted-foreground">Loading…</div>;
  if (file.isError)
    return <div className="p-3 text-xs text-red-500">{(file.error as Error).message}</div>;

  const dirty = draft !== null && draft !== file.data.content;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-2 py-1">
        <span className="truncate font-mono text-[11px]">{path}</span>
        {file.data.content.includes('‹hidden:') && (
          <span className="text-[10px] text-muted-foreground">
            hidden values keep their real value when you save
          </span>
        )}
        {file.data.base === null && (
          <span className="text-[10px] text-muted-foreground">not in the base</span>
        )}
        <div className="ms-auto flex gap-1">
          <Button
            variant={showDiff ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowDiff((v) => !v)}
          >
            Diff with base
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs"
            disabled={!canEdit || !dirty || save.isPending}
            onClick={() =>
              save.mutate([content], {
                onSuccess: () => {
                  setDraft(null);
                  void qc.invalidateQueries({ queryKey: ['playtest', 'file', target, path] });
                  void qc.invalidateQueries({ queryKey: playtestKeys.files(target) });
                },
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
      {showDiff ? (
        <div className="flex-1 overflow-auto py-1 font-mono text-[11px] leading-[1.45]">
          {diff.map((l, i) => (
            <div
              key={i}
              className={cn(
                'px-2 whitespace-pre',
                l.kind === 'add' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                l.kind === 'remove' && 'bg-red-500/15 text-red-700 dark:text-red-300',
              )}
            >
              {l.kind === 'add' ? '+ ' : l.kind === 'remove' ? '- ' : '  '}
              {l.text}
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setDraft(e.target.value)}
          readOnly={!canEdit}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent p-2 font-mono text-[11px] leading-[1.45] outline-none"
        />
      )}
    </div>
  );
}
