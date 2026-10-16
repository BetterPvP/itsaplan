import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import { playtestApi, playtestKeys } from '../../services/playtestApi';

const STORED = 'playtest-staging-branch';

const stored = () => {
  try {
    return window.localStorage.getItem(STORED);
  } catch {
    return null;
  }
};

// Starts the staging server on a branch of the playtest repository. It offers the branch
// this browser last started, else the one the server last ran, else the default branch.
export default function StartStagingButton({
  projectKey,
  lastBranch,
}: {
  projectKey: string;
  lastBranch?: string | null;
}) {
  const qc = useQueryClient();
  const branches = useQuery({
    queryKey: playtestKeys.branches(projectKey),
    queryFn: () => playtestApi.stagingBranches(projectKey),
    staleTime: 60_000,
  });
  const [branch, setBranch] = useState<string | null>(null);
  useEffect(() => {
    const list = branches.data?.branches;
    if (branch || !list) return;
    const pick = [stored(), lastBranch, branches.data?.defaultBranch, list[0]].find(
      (b) => b && list.includes(b),
    );
    if (pick) setBranch(pick);
  }, [branch, branches.data, lastBranch]);

  const start = usePlaytestCommand(
    (b: string) => playtestApi.startStaging(projectKey, b),
    'Starting the staging server',
  );
  const submit = () => {
    if (!branch) return;
    try {
      window.localStorage.setItem(STORED, branch);
    } catch {
      // Storage unavailable.
    }
    start.mutate([branch], {
      onSuccess: () => void qc.invalidateQueries({ queryKey: playtestKeys.issue(projectKey) }),
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Combobox
        items={branches.data?.branches ?? []}
        value={branch}
        onValueChange={(b: string | null) => b && setBranch(b)}
        disabled={!branches.data}
      >
        {/* Selected on focus, so typing searches instead of appending. */}
        <ComboboxInput
          placeholder={branches.isError ? 'No branches' : 'Branch'}
          className="h-8 w-56 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <ComboboxContent>
          <ComboboxEmpty>No matching branch</ComboboxEmpty>
          <ComboboxList>
            {(b: string) => (
              <ComboboxItem key={b} value={b} className="font-mono text-xs">
                {b}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Button
        size="sm"
        className="h-8 gap-1.5"
        disabled={!branch || start.isPending}
        onClick={submit}
      >
        <Server className="size-3.5" /> Start staging
      </Button>
    </div>
  );
}
