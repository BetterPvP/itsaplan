import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlaytestCommand } from '../../hooks/usePlaytestCommand';
import { playtestApi, playtestKeys } from '../../services/playtestApi';

// Starts the staging server on a branch, the last one it ran by default.
export default function StartStagingButton({
  projectKey,
  lastBranch,
}: {
  projectKey: string;
  lastBranch?: string | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState(lastBranch ?? 'master');
  const start = usePlaytestCommand(
    (b: string) => playtestApi.startStaging(projectKey, b),
    'Starting the staging server',
  );
  const submit = () =>
    start.mutate([branch.trim()], {
      onSuccess: () => {
        setOpen(false);
        void qc.invalidateQueries({ queryKey: playtestKeys.issue(projectKey) });
      },
    });

  return (
    <>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
        <Server className="size-3.5" /> Start staging
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start the staging server</DialogTitle>
            <DialogDescription>
              One server from the base, not tied to an issue. It shuts down like a playtest when
              nobody plays on it.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Label htmlFor="staging-branch">Branch</Label>
            <Input
              id="staging-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="font-mono"
              autoFocus
            />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!branch.trim() || start.isPending} onClick={submit}>
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
