import { Elysia, t } from 'elysia';
import { authContext } from '#shared/auth-context';
import { requireGod } from '#shared/access';
import { guards } from '#shared/guards';
import { HttpError } from '#shared/lib';
import { noContent } from '#shared/http';
import { errors } from '#shared/responses';
import { mayGrantInviteRanks } from '#modules/invites/service';
import { addTeamMemberDirectly, listTeamCandidates, setUserDisplayName } from './service';

const teamParams = t.Object({ teamId: t.Numeric() });
const userParams = t.Object({ userId: t.String() });
const searchQuery = t.Object({ search: t.Optional(t.String()) });
const addMemberBody = t.Object({
  userId: t.String(),
  role: t.Union([t.Literal('owner'), t.Literal('manager'), t.Literal('member')]),
});
const displayNameBody = t.Object({ name: t.String({ minLength: 1, maxLength: 120 }) });

const TeamCandidateListResponse = t.Array(
  t.Object({
    userId: t.String(),
    name: t.String(),
    email: t.String(),
    image: t.Nullable(t.String()),
  }),
);

// Adding an existing account to a team without an email invite: for a team's owners and
// managers next to the invite, and for the instance owner in god mode.
export const directMemberRoutes = new Elysia({
  name: 'direct-members',
  detail: { tags: ['Teams'] },
})
  .use(guards)

  .get(
    '/teams/:teamId/members/candidates',
    ({ membership, query }) => listTeamCandidates(membership.teamId, query.search),
    {
      teamManager: true,
      params: teamParams,
      query: searchQuery,
      response: { 200: TeamCandidateListResponse, ...errors(401, 403, 404) },
      detail: {
        summary: 'List people who can be added to a team',
        description:
          'Up to 20 active accounts on the instance that are not in the team, by name or address.',
      },
    },
  )

  .post(
    '/teams/:teamId/members',
    async ({ membership, body }) => {
      if (
        !(await mayGrantInviteRanks(
          { teamId: membership.teamId, projectId: null, teamRole: body.role, projectRole: null },
          membership.userId,
        ))
      ) {
        throw new HttpError(403, 'Only a team owner can add an owner or a manager');
      }
      await addTeamMemberDirectly(membership.teamId, body.userId, body.role);
      return noContent();
    },
    {
      teamManager: true,
      params: teamParams,
      body: addMemberBody,
      response: { 204: t.Void(), ...errors(400, 401, 403, 404, 409) },
      detail: {
        summary: 'Add someone to a team',
        description:
          'Put an existing account straight into the team, without an invite. Only an owner ' +
          'adds a manager or another owner.',
      },
    },
  );

export const godDirectMemberRoutes = new Elysia({
  name: 'god-direct-members',
  detail: { tags: ['God'] },
})
  .use(authContext)
  .onBeforeHandle(({ user }) => {
    requireGod(user);
  })

  .get(
    '/god/teams/:teamId/members/candidates',
    ({ params, query }) => listTeamCandidates(params.teamId, query.search),
    {
      params: teamParams,
      query: searchQuery,
      response: { 200: TeamCandidateListResponse, ...errors(401, 403) },
      detail: {
        summary: 'List people who can be added to a team',
        description:
          'Up to 20 active accounts on the instance that are not in the team, by name or address.',
      },
    },
  )

  .post(
    '/god/teams/:teamId/members',
    async ({ params, body }) => {
      await addTeamMemberDirectly(params.teamId, body.userId, body.role);
      return noContent();
    },
    {
      params: teamParams,
      body: addMemberBody,
      response: { 204: t.Void(), ...errors(400, 401, 403, 404, 409) },
      detail: {
        summary: 'Add someone to a team',
        description: 'Put an existing account straight into a team at any rank, without an invite.',
      },
    },
  )

  .patch(
    '/god/users/:userId/name',
    async ({ params, body }) => {
      await setUserDisplayName(params.userId, body.name);
      return noContent();
    },
    {
      params: userParams,
      body: displayNameBody,
      response: { 204: t.Void(), ...errors(400, 401, 403, 404) },
      detail: {
        summary: "Change a user's display name",
        description:
          'Set the name an account shows everywhere. With instance-wide SCIM, the identity ' +
          'provider writes the name again on its next update.',
      },
    },
  );
