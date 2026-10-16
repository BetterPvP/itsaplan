import { Elysia, t } from 'elysia';
import { authContext } from '#shared/auth-context';
import { guards } from '#shared/guards';
import { HttpError } from '#shared/lib';
import { accessErrors, commonErrors, errors } from '#shared/responses';
import {
  ServiceResponse,
  consoleBody,
  eventsQuery,
  fileBody,
  fileQuery,
  logQuery,
  opsBody,
  shareBody,
  stagingStartBody,
} from './model';
import {
  call,
  forward,
  playtestPermissions,
  playtestRepositoryBranches,
  playtestsConfigured,
  type Actor,
} from './service';

// The staging server: one server of a chosen branch that belongs to no issue, at
// staging.<domain>. The playtest service keeps it under the key STAGING. Its routes
// mirror an issue's playtest, guarded by the project's playtest permissions.

const ok = { 200: ServiceResponse, ...commonErrors, ...errors(409, 502, 503) };
const ROUTE = '/projects/:projectKey/playtest/staging';
const path = (rest = '') => `/v1/playtests/STAGING${rest}`;

type User = { id: string; name?: string | null; image?: string | null } | null | undefined;
const actorOf = (user: User): Actor | null =>
  user ? { id: user.id, name: user.name, image: user.image } : null;

export const stagingRoutes = new Elysia({
  name: 'playtest-staging',
  detail: { tags: ['Playtest'] },
})
  .use(authContext)
  .use(guards)

  // Shaped like an issue's playtest, so the playtest page shows it.
  .get(
    `${ROUTE}`,
    async ({ project, user }) => {
      const permissions = await playtestPermissions(project.id, user!.id);
      const base = {
        configured: playtestsConfigured(),
        eligible: true,
        identifier: 'STAGING',
        title: 'Staging server',
        prUrl: null,
        permissions,
      };
      if (!base.configured) {
        return { ...base, branch: null, playtest: null, feed: [], approvals: [], settings: null };
      }
      const state = await call<{ playtest: { branch: string | null } | null }>(path());
      return { ...base, branch: state.playtest?.branch ?? null, ...state };
    },
    {
      permission: ['playtests', 'read'],
      response: { 200: ServiceResponse, ...accessErrors, ...errors(502) },
      detail: { summary: 'Get the staging server' },
    },
  )

  .get(
    `${ROUTE}/events`,
    async ({ project, query, request, user }) => {
      const can = await playtestPermissions(project.id, user!.id);
      const res = await forward(path(`/events?after=${query.after ?? 0}`), {
        signal: request.signal,
        reveal: query.reveal === true && can.showSensitive,
        noLog: !can.readConsole,
      });
      if (!res.ok || !res.body) throw new HttpError(502, 'The playtest service failed');
      return new Response(res.body, {
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      });
    },
    {
      query: eventsQuery,
      permission: ['playtests', 'read'],
      response: { ...ok, 200: t.Any() },
      detail: { summary: 'Stream the staging server' },
    },
  )

  .get(
    `${ROUTE}/startup`,
    async ({ project, query, user }) => {
      const can = await playtestPermissions(project.id, user!.id);
      return call(path('/startup'), { reveal: query.reveal === true && can.showSensitive });
    },
    {
      query: logQuery,
      permission: ['playtest_console', 'read'],
      response: ok,
      detail: { summary: 'Get the startup log of the staging server' },
    },
  )

  .post(
    `${ROUTE}/console`,
    async ({ body, user }) =>
      call(path('/console'), { method: 'POST', body, actor: actorOf(user) }),
    {
      body: consoleBody,
      permission: ['playtest_console', 'create'],
      response: ok,
      detail: { summary: 'Run a console command on the staging server' },
    },
  )

  .post(
    `${ROUTE}/ops`,
    async ({ body, user }) => call(path('/ops'), { method: 'POST', body, actor: actorOf(user) }),
    {
      body: opsBody,
      permission: ['playtest_players', 'edit'],
      response: ok,
      detail: { summary: 'Op or deop a player on the staging server' },
    },
  )

  .get(`${ROUTE}/files`, async () => call(path('/files')), {
    permission: ['playtest_files', 'read'],
    response: ok,
    detail: { summary: 'List the editable files of the staging server' },
  })

  .get(
    `${ROUTE}/file`,
    async ({ query }) => call(path(`/file?path=${encodeURIComponent(query.path)}`)),
    {
      query: fileQuery,
      permission: ['playtest_files', 'read'],
      response: ok,
      detail: { summary: 'Read a file of the staging server with its base version' },
    },
  )

  .put(
    `${ROUTE}/file`,
    async ({ body, user }) => call(path('/file'), { method: 'PUT', body, actor: actorOf(user) }),
    {
      body: fileBody,
      permission: ['playtest_files', 'edit'],
      response: ok,
      detail: { summary: 'Write a file of the staging server' },
    },
  )

  .get(`${ROUTE}/branches`, async ({ project }) => playtestRepositoryBranches(project.id), {
    permission: ['playtests', 'create'],
    response: ok,
    detail: { summary: 'List the branches the staging server can run' },
  })

  .post(
    `${ROUTE}/start`,
    async ({ project, body, user }) =>
      call(path('/start'), {
        method: 'POST',
        body: { branch: body.branch, project: project.key },
        actor: actorOf(user),
      }),
    {
      body: stagingStartBody,
      permission: ['playtests', 'create'],
      response: ok,
      detail: { summary: 'Start the staging server on a branch' },
    },
  )

  // Restart the server, or build its branch again (redeploy, and start again after it
  // ended).
  .post(
    `${ROUTE}/:action`,
    async ({ project, params, user }) => {
      if (params.action === 'restart') {
        return call(path('/restart'), { method: 'POST', actor: actorOf(user) });
      }
      const { playtest } = await call<{ playtest: { branch: string | null } | null }>(path());
      if (!playtest?.branch) throw new HttpError(400, 'Start the staging server first');
      return call(path(params.action === 'redeploy' ? '/redeploy' : '/start'), {
        method: 'POST',
        body: { branch: playtest.branch, project: project.key },
        actor: actorOf(user),
      });
    },
    {
      params: t.Object({
        projectKey: t.String(),
        action: t.Union([t.Literal('restart'), t.Literal('redeploy'), t.Literal('start-again')]),
      }),
      permission: ['playtests', 'edit'],
      response: ok,
      detail: { summary: 'Restart, redeploy or start the staging server again' },
    },
  )

  .post(
    `${ROUTE}/end`,
    async ({ user }) => call(path('/end'), { method: 'POST', actor: actorOf(user) }),
    {
      permission: ['playtests', 'delete'],
      response: ok,
      detail: { summary: 'End the staging server' },
    },
  )

  .post(
    `${ROUTE}/promote`,
    async ({ user }) => call(path('/promote'), { method: 'POST', actor: actorOf(user) }),
    {
      permission: ['playtest_base', 'edit'],
      response: ok,
      detail: { summary: 'Save the staging server as the base' },
    },
  )

  .post(
    `${ROUTE}/share`,
    async ({ body, user }) => call(path('/share'), { method: 'POST', body, actor: actorOf(user) }),
    {
      body: shareBody,
      permission: ['playtest_logs', 'create'],
      response: ok,
      detail: { summary: 'Share a log of the staging server as a link' },
    },
  );
