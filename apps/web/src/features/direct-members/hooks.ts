import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteTeamRole } from '@/lib/api/endpoints/invites';
import { qk } from '@/services/queryKeys';
import { addTeamMember, listTeamCandidates, setUserDisplayName } from './api';

export function useTeamCandidates(teamId: number, god: boolean, search: string) {
  return useQuery({
    queryKey: ['directMemberCandidates', teamId, god, search] as const,
    queryFn: () => listTeamCandidates(teamId, god, search),
  });
}

export function useAddTeamMember(teamId: number, god: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: InviteTeamRole }) =>
      addTeamMember(teamId, god, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['directMemberCandidates', teamId] });
      void qc.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
      void qc.invalidateQueries({ queryKey: ['instanceTeamMembers', teamId] });
      void qc.invalidateQueries({ queryKey: qk.instanceTeam(teamId) });
    },
    meta: { suppressErrorToast: true },
  });
}

export function useSetUserDisplayName(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => setUserDisplayName(userId, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.instanceUser(userId) });
      void qc.invalidateQueries({ queryKey: qk.anyInstanceUsers });
    },
  });
}
