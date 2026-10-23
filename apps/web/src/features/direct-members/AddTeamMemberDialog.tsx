'use client';

import { useState, type FormEvent } from 'react';
import { Check, Users } from 'lucide-react';
import type { InviteTeamRole } from '@/lib/api/endpoints/invites';
import { ApiError } from '@/lib/api/core/client';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import Avatar from '@/components/common/Avatar';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TeamCandidate } from './api';
import { useAddTeamMember, useTeamCandidates } from './hooks';

const RANK_LABEL: Record<InviteTeamRole, string> = {
  member: 'Member',
  manager: 'Manager',
  owner: 'Owner',
};

const REFUSAL: Record<string, string> = {
  ALREADY_TEAM_MEMBER: 'They are already in the team.',
};

// Adds someone who already has an account straight to the team, without an email invite.
// `ranks` is what the person adding may hand out: an owner (or god mode) any rank, a
// manager only member.
export default function AddTeamMemberDialog({
  teamId,
  teamName,
  ranks,
  god,
  onClose,
}: {
  teamId: number;
  teamName: string;
  ranks: InviteTeamRole[];
  god: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 250);
  const [picked, setPicked] = useState<TeamCandidate | null>(null);
  const [role, setRole] = useState<InviteTeamRole>('member');
  const [refusal, setRefusal] = useState<string | null>(null);
  const candidates = useTeamCandidates(teamId, god, search);
  const addMember = useAddTeamMember(teamId, god);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!picked) return;
    setRefusal(null);
    try {
      await addMember.mutateAsync({ userId: picked.userId, role });
      onClose();
    } catch (error) {
      const code = error instanceof ApiError ? (error.code ?? '') : '';
      const message = error instanceof Error ? error.message : '';
      setRefusal(REFUSAL[code] ?? (message || 'They could not be added.'));
    }
  }

  return (
    <Modal
      title="Add a member"
      scope={
        <>
          <Users className="size-3.5" />
          {teamName}
        </>
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-6 py-1">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Person</p>
          <Command shouldFilter={false} className="rounded-lg border">
            <CommandInput
              placeholder="Search by name or email"
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setRefusal(null);
              }}
            />
            <CommandList className="max-h-56">
              <CommandEmpty>
                {candidates.isPending ? 'Searching…' : 'Nobody without this team matches.'}
              </CommandEmpty>
              {(candidates.data ?? []).length > 0 && (
                <CommandGroup>
                  {(candidates.data ?? []).map((candidate) => (
                    <CommandItem
                      key={candidate.userId}
                      value={candidate.userId}
                      onSelect={() => {
                        setPicked(candidate);
                        setRefusal(null);
                      }}
                    >
                      <Avatar
                        name={candidate.name || candidate.email}
                        image={candidate.image}
                        className="size-6 shrink-0 text-[10px]"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">
                          {candidate.name || candidate.email}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {candidate.email}
                        </span>
                      </div>
                      {picked?.userId === candidate.userId && <Check className="size-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          {refusal && <p className="text-xs text-destructive">{refusal}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Rank</p>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as InviteTeamRole)}
            disabled={addMember.isPending || ranks.length === 1}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ranks.map((rank) => (
                <SelectItem key={rank} value={rank}>
                  {RANK_LABEL[rank]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-5">
          <p className="truncate text-sm text-muted-foreground">
            {picked
              ? `Adding ${picked.name || picked.email} as ${RANK_LABEL[role].toLowerCase()}`
              : 'Pick someone to add'}
          </p>
          <Button type="submit" disabled={addMember.isPending || !picked}>
            Add to team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
