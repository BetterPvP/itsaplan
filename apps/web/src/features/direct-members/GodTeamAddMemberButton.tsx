'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstanceTeamQuery } from '@/features/god/services/god.service';
import AddTeamMemberDialog from './AddTeamMemberDialog';

// God mode adds anyone with an account to the team, at any rank.
export default function GodTeamAddMemberButton({ teamId }: { teamId: number }) {
  const [open, setOpen] = useState(false);
  const teamName = useInstanceTeamQuery(teamId).data?.name ?? '';
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto h-7 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="size-3.5" />
        Add member
      </Button>
      {open && (
        <AddTeamMemberDialog
          teamId={teamId}
          teamName={teamName}
          ranks={['member', 'manager', 'owner']}
          god
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
