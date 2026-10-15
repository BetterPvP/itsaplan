import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CommandResult } from '../services/playtestApi';

// A command sent to the playtest server, with the failure shown as a toast.
export function usePlaytestCommand<A extends unknown[], T = unknown>(
  run: (...args: A) => Promise<CommandResult<T>>,
  success?: string,
) {
  return useMutation({
    mutationFn: (args: A) => run(...args),
    onSuccess: () => {
      if (success) toast.success(success);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'The command failed'),
  });
}
