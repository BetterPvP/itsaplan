import { Elysia, t } from 'elysia';
import { getIssueBySequence, getIssueProjectId } from '#modules/issues/service';
import { authContext } from '#shared/auth-context';
import { entityGuard, guards } from '#shared/guards';
import { HttpError } from '#shared/lib';
import { accessErrors, commonErrors, errors } from '#shared/responses';
import {
  ServiceResponse,
  configBody,
  consoleBody,
  eventsQuery,
  fileBody,
  fileQuery,
  issueParams,
  logQuery,
  opsBody,
  reviewBody,
  shareBody,
  targetQuery,
} from './model';
import {
  call,
  forward,
  issueTarget,
  playtestPermissions,
  playtestsConfigured,
  type Actor,
} from './service';

const serviceErrors = { ...commonErrors, ...errors(409, 502, 503) };
const ok = { 200: ServiceResponse, ...serviceErrors };
const path = (identifier: string, rest = '') => `/v1/playtests/${identifier}${rest}`;
const byIssue = (p: Record<string, string>) => getIssueProjectId(Number(p.issueId));

type User = { id: string; name?: string | null; image?: string | null } | null | undefined;
const actorOf = (user: User): Actor | null =>
  user ? { id: user.id, name: user.name, image: user.image } : null;

export const playtestRoutes = new Elysia({ name: 'playtest', detail: { tags: ['Playtest'] } })
  .use(authContext)
  .use(guards)
  // One guard per playtest permission resource, each set to the action a route needs.
  .macro({
    playtestIssue: entityGuard('work_items', 'Issue not found', byIssue),
    playtest: entityGuard('playtests', 'Issue not found', byIssue),
    playtestBase: entityGuard('playtest_base', 'Issue not found', byIssue),
    playtestReview: entityGuard('playtest_reviews', 'Issue not found', byIssue),
    playtestTesters: entityGuard('playtest_testers', 'Issue not found', byIssue),
    playtestConsole: entityGuard('playtest_console', 'Issue not found', byIssue),
    playtestPlayers: entityGuard('playtest_players', 'Issue not found', byIssue),
    playtestFiles: entityGuard('playtest_files', 'Issue not found', byIssue),
    playtestLogs: entityGuard('playtest_logs', 'Issue not found', byIssue),
  })

  // For the playtest service: the branch an issue's playtest builds, and whether the
  // person who moved the issue may start playtests. Needs only read access to the issue,
  // which the service's own Itsaplan agent has.
  .get(
    '/issues/:issueId/playtest/target',
    async ({ params, query }) => {
      const target = await issueTarget(params.issueId);
      const actorCanStart = query.actor
        ? (await playtestPermissions(target.projectId, query.actor)).start
        : false;
      return { eligible: target.branch != null, branch: target.branch, actorCanStart };
    },
    {
      params: issueParams,
      query: targetQuery,
      playtestIssue: 'read',
      response: { 200: ServiceResponse, ...accessErrors },
      detail: { summary: "Get the branch of an issue's playtest" },
    },
  )

  // The issue's playtest with the caller's playtest permissions. An issue without a
  // branch or pull request in the playtest repository has none.
  .get(
    '/issues/:issueId/playtest',
    async ({ params, user, projectId }) => {
      const target = await issueTarget(params.issueId);
      const permissions = await playtestPermissions(projectId, user!.id);
      const base = {
        configured: playtestsConfigured(),
        eligible: target.branch != null,
        identifier: target.identifier,
        title: target.title,
        branch: target.branch,
        prUrl: target.prUrl,
        permissions,
      };
      if (!base.configured) {
        return { ...base, playtest: null, feed: [], approvals: [], settings: null };
      }
      const state = await call<{ playtest: unknown; feed: unknown[]; approvals: unknown[] }>(
        path(target.identifier),
      );
      return { ...base, ...state };
    },
    {
      params: issueParams,
      playtest: 'read',
      response: { 200: ServiceResponse, ...accessErrors, ...errors(502) },
      detail: { summary: "Get an issue's playtest" },
    },
  )

  // The playtest's state, feed, approvals, metrics and (with the console permission)
  // server log as Server-Sent Events. Sensitive values stay hidden unless the caller
  // may see them and asks to.
  .get(
    '/issues/:issueId/playtest/events',
    async ({ params, query, request, user, projectId }) => {
      const { identifier } = await issueTarget(params.issueId);
      const can = await playtestPermissions(projectId, user!.id);
      const res = await forward(path(identifier, `/events?after=${query.after ?? 0}`), {
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
      params: issueParams,
      query: eventsQuery,
      playtest: 'read',
      response: { 200: t.Any(), ...serviceErrors },
      detail: { summary: "Stream an issue's playtest" },
    },
  )

  .get(
    '/issues/:issueId/playtest/startup',
    async ({ params, query, user, projectId }) => {
      const { identifier } = await issueTarget(params.issueId);
      const can = await playtestPermissions(projectId, user!.id);
      return call(path(identifier, '/startup'), {
        reveal: query.reveal === true && can.showSensitive,
      });
    },
    {
      params: issueParams,
      query: logQuery,
      playtestConsole: 'read',
      response: ok,
      detail: { summary: "Get the startup log of an issue's playtest server" },
    },
  )

  .post(
    '/issues/:issueId/playtest/console',
    async ({ params, body, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call(path(identifier, '/console'), { method: 'POST', body, actor: actorOf(user) });
    },
    {
      params: issueParams,
      body: consoleBody,
      playtestConsole: 'create',
      response: ok,
      detail: { summary: 'Run a console command on the playtest server' },
    },
  )

  .post(
    '/issues/:issueId/playtest/ops',
    async ({ params, body, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call(path(identifier, '/ops'), { method: 'POST', body, actor: actorOf(user) });
    },
    {
      params: issueParams,
      body: opsBody,
      playtestPlayers: 'edit',
      response: ok,
      detail: { summary: 'Op or deop a player on the playtest server' },
    },
  )

  .get(
    '/issues/:issueId/playtest/files',
    async ({ params }) => call(path((await issueTarget(params.issueId)).identifier, '/files')),
    {
      params: issueParams,
      playtestFiles: 'read',
      response: ok,
      detail: { summary: 'List the editable files of the playtest server' },
    },
  )

  .get(
    '/issues/:issueId/playtest/file',
    async ({ params, query }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call(path(identifier, `/file?path=${encodeURIComponent(query.path)}`));
    },
    {
      params: issueParams,
      query: fileQuery,
      playtestFiles: 'read',
      response: ok,
      detail: { summary: 'Read a file of the playtest server with its base version' },
    },
  )

  .put(
    '/issues/:issueId/playtest/file',
    async ({ params, body, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call(path(identifier, '/file'), { method: 'PUT', body, actor: actorOf(user) });
    },
    {
      params: issueParams,
      body: fileBody,
      playtestFiles: 'edit',
      response: ok,
      detail: { summary: 'Write a file of the playtest server' },
    },
  )

  .post(
    '/issues/:issueId/playtest/start',
    async ({ params, user }) => {
      const { identifier, branch } = await issueTarget(params.issueId);
      if (!branch) throw new HttpError(400, 'Link a branch or pull request first');
      return call(path(identifier, '/start'), {
        method: 'POST',
        body: { branch },
        actor: actorOf(user),
      });
    },
    {
      params: issueParams,
      playtest: 'create',
      response: ok,
      detail: { summary: 'Start a playtest of the linked branch' },
    },
  )

  // Restart the server, or build the linked branch again for it (redeploy, and start
  // again after it ended).
  .post(
    '/issues/:issueId/playtest/:action',
    async ({ params, user }) => {
      const { identifier, branch } = await issueTarget(params.issueId);
      if (params.action === 'restart') {
        return call(path(identifier, '/restart'), { method: 'POST', actor: actorOf(user) });
      }
      if (!branch) throw new HttpError(400, 'Link a branch or pull request first');
      const route = params.action === 'redeploy' ? '/redeploy' : '/start';
      return call(path(identifier, route), {
        method: 'POST',
        body: { branch },
        actor: actorOf(user),
      });
    },
    {
      params: t.Object({
        issueId: t.Numeric(),
        action: t.Union([t.Literal('restart'), t.Literal('redeploy'), t.Literal('start-again')]),
      }),
      playtest: 'edit',
      response: ok,
      detail: { summary: 'Restart, redeploy or start the playtest again' },
    },
  )

  .post(
    '/issues/:issueId/playtest/end',
    async ({ params, user }) =>
      call(path((await issueTarget(params.issueId)).identifier, '/end'), {
        method: 'POST',
        actor: actorOf(user),
      }),
    {
      params: issueParams,
      playtest: 'delete',
      response: ok,
      detail: { summary: 'End the playtest server' },
    },
  )

  .post(
    '/issues/:issueId/playtest/promote',
    async ({ params, user }) =>
      call(path((await issueTarget(params.issueId)).identifier, '/promote'), {
        method: 'POST',
        actor: actorOf(user),
      }),
    {
      params: issueParams,
      playtestBase: 'edit',
      response: ok,
      detail: { summary: 'Save the playtest server as the base' },
    },
  )

  .post(
    '/issues/:issueId/playtest/approvals',
    async ({ params, body, user }) =>
      call(path((await issueTarget(params.issueId)).identifier, '/approvals'), {
        method: 'POST',
        body,
        actor: actorOf(user),
      }),
    {
      params: issueParams,
      body: reviewBody,
      playtestReview: 'create',
      response: ok,
      detail: { summary: 'Approve the playtest build or request changes' },
    },
  )

  .post(
    '/issues/:issueId/playtest/testers',
    async ({ params, user }) => {
      const target = await issueTarget(params.issueId);
      return call(path(target.identifier, '/testers'), {
        method: 'POST',
        body: {
          title: target.title,
          issueUrl: target.issueUrl,
          playtestUrl: target.playtestUrl,
          prUrl: target.prUrl,
        },
        actor: actorOf(user),
      });
    },
    {
      params: issueParams,
      playtestTesters: 'create',
      response: ok,
      detail: { summary: 'Ask for testers on Discord' },
    },
  )

  .post(
    '/issues/:issueId/playtest/share',
    async ({ params, body, user }) =>
      call(path((await issueTarget(params.issueId)).identifier, '/share'), {
        method: 'POST',
        body,
        actor: actorOf(user),
      }),
    {
      params: issueParams,
      body: shareBody,
      playtestLogs: 'create',
      response: ok,
      detail: { summary: 'Share the console or startup log as a link' },
    },
  )

  // Every playtest of the project with its issue's title, for the Playtests page and
  // the board's badges.
  .get(
    '/projects/:projectKey/playtests',
    async ({ project, user }) => {
      const permissions = await playtestPermissions(project.id, user!.id);
      if (!playtestsConfigured()) return { permissions, playtests: [] };
      const list = await call<{ issue: string }[]>(`/v1/projects/${project.key}/playtests`);
      const playtests = await Promise.all(
        list.map(async (p) => {
          const issue = await getIssueBySequence(project.id, Number(p.issue.split('-').pop()));
          return issue && !issue.archivedAt
            ? { ...p, issueId: issue.id, title: issue.title }
            : null;
        }),
      );
      return { permissions, playtests: playtests.filter(Boolean) };
    },
    {
      permission: ['playtests', 'read'],
      response: { 200: ServiceResponse, ...accessErrors, ...errors(502) },
      detail: { summary: 'List the playtests of a project' },
    },
  )

  .get(
    '/projects/:projectKey/playtest/config',
    async ({ project }) => call(`/v1/projects/${project.key}/config`),
    {
      permission: ['playtest_settings', 'read'],
      response: ok,
      detail: { summary: 'Get the playtest settings of a project' },
    },
  )

  .put(
    '/projects/:projectKey/playtest/config',
    async ({ project, body }) =>
      call(`/v1/projects/${project.key}/config`, { method: 'PUT', body }),
    {
      body: configBody,
      permission: ['playtest_settings', 'edit'],
      response: ok,
      detail: { summary: 'Set the playtest settings of a project' },
    },
  );
