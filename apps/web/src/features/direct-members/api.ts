import { request } from '@/lib/api/core/client';
import type { InviteTeamRole } from '@/lib/api/endpoints/invites';

export interface TeamCandidate {
  userId: string;
  name: string;
  email: string;
  image: string | null;
}

// The same routes under /god act as the instance owner, at any rank.
function base(teamId: number, god: boolean): string {
  return god ? `/god/teams/${teamId}/members` : `/teams/${teamId}/members`;
}

export const listTeamCandidates = (teamId: number, god: boolean, search: string) =>
  request<TeamCandidate[]>(`${base(teamId, god)}/candidates?${new URLSearchParams({ search })}`);

export const addTeamMember = (
  teamId: number,
  god: boolean,
  input: { userId: string; role: InviteTeamRole },
) =>
  request<void>(base(teamId, god), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const setUserDisplayName = (userId: string, name: string) =>
  request<void>(`/god/users/${userId}/name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
