'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSetUserDisplayName } from './hooks';

// Changes the name an account shows everywhere. With instance-wide SCIM the identity
// provider writes the name again on its next update.
export default function GodUserNameEditor({ userId, name }: { userId: string; name: string }) {
  const [value, setValue] = useState(name);
  const setName = useSetUserDisplayName(userId);
  const next = value.trim();
  const changed = next !== name && next.length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    await setName.mutateAsync(next);
    toast.success('Display name changed');
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Display name</p>
      <div className="flex gap-2">
        <Input
          value={value}
          maxLength={120}
          onChange={(e) => setValue(e.target.value)}
          disabled={setName.isPending}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={!changed || setName.isPending}>
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Shown on the board, in mentions and in comments. A SCIM sign-in provider can set it again.
      </p>
    </form>
  );
}
