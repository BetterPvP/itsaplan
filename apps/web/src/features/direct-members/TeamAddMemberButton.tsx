'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { TeamRole } from '@/lib/api/endpoints/teams';
import { Button } from '@/components/ui/button';
import AddTeamMemberDialog from './AddTeamMemberDialog';

// Next to the team's email invite: owners and managers add someone who already has an
// account. Only an owner hands out a rank above member, as with an invite.
export default function TeamAddMemberButton({
  teamId,
  teamName,
  teamRole,
}: {
  teamId: number;
  teamName: string;
  teamRole: TeamRole;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" />
        Add member
      </Button>
      {open && (
        <AddTeamMemberDialog
          teamId={teamId}
          teamName={teamName}
          ranks={teamRole === 'owner' ? ['member', 'manager', 'owner'] : ['member']}
          god={false}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
