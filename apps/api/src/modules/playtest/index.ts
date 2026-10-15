import { Elysia, t } from 'elysia';
import { getIssueProjectId } from '#modules/issues/service';
import { authContext } from '#shared/auth-context';
import { entityGuard, guards } from '#shared/guards';
import { HttpError } from '#shared/lib';
import { accessErrors, commonErrors, errors } from '#shared/responses';
import {
  CommandResponse,
  ConfigResponse,
  PlaytestResponse,
  ProjectPlaytestsResponse,
  configBody,
  consoleBody,
  eventsQuery,
  fileBody,
  fileQuery,
  issueParams,
  opsBody,
} from './model';
import { call, forward, issueTarget, playtestsConfigured } from './service';

const serviceErrors = { ...commonErrors, ...errors(502, 503) };
const path = (identifier: string, rest = '') => `/v1/playtests/${identifier}${rest}`;

type Feed = (typeof PlaytestResponse.static)['feed'];
type State = (typeof PlaytestResponse.static)['playtest'];
type Command = typeof CommandResponse.static;

export const playtestRoutes = new Elysia({ name: 'playtest', detail: { tags: ['Playtest'] } })
  .use(authContext)
  .use(guards)
  .macro({
    playtest: entityGuard('work_items', 'Issue not found', (p) =>
      getIssueProjectId(Number(p.issueId)),
    ),
  })

  .get(
    '/issues/:issueId/playtest',
    async ({ params }) => {
      const { identifier, branch } = await issueTarget(params.issueId);
      if (!playtestsConfigured() || !branch) {
        return {
          configured: playtestsConfigured(),
          eligible: branch != null,
          branch,
          playtest: null,
          feed: [],
        };
      }
      const { playtest, feed } = await call<{ playtest: State; feed: Feed }>(path(identifier));
      return { configured: true, eligible: true, branch, playtest, feed };
    },
    {
      params: issueParams,
      playtest: 'read',
      response: { 200: PlaytestResponse, ...accessErrors, ...errors(502) },
      detail: { summary: "Get an issue's playtest" },
    },
  )

  // The playtest's state, feed and server log as Server-Sent Events, starting with the
  // state and the log lines after `after`.
  .get(
    '/issues/:issueId/playtest/events',
    async ({ params, query, request }) => {
      const { identifier } = await issueTarget(params.issueId);
      const res = await forward(path(identifier, `/events?after=${query.after ?? 0}`), {
        signal: request.signal,
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

  .post(
    '/issues/:issueId/playtest/start',
    async ({ params, user }) => {
      const { identifier, branch } = await issueTarget(params.issueId);
      if (!branch) throw new HttpError(400, 'Link a branch or pull request first');
      return call<Command>(path(identifier, '/start'), {
        method: 'POST',
        body: { branch },
        actor: user?.name,
      });
    },
    {
      params: issueParams,
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'Start a playtest of the linked branch' },
    },
  )

  .post(
    '/issues/:issueId/playtest/console',
    async ({ params, body, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call<Command>(path(identifier, '/console'), {
        method: 'POST',
        body,
        actor: user?.name,
      });
    },
    {
      params: issueParams,
      body: consoleBody,
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'Run a console command on the playtest server' },
    },
  )

  .post(
    '/issues/:issueId/playtest/ops',
    async ({ params, body, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call<Command>(path(identifier, '/ops'), { method: 'POST', body, actor: user?.name });
    },
    {
      params: issueParams,
      body: opsBody,
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'Op or deop a player on the playtest server' },
    },
  )

  .get(
    '/issues/:issueId/playtest/files',
    async ({ params }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call<Command>(path(identifier, '/files'));
    },
    {
      params: issueParams,
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'List the editable files of the playtest server' },
    },
  )

  .get(
    '/issues/:issueId/playtest/file',
    async ({ params, query }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call<Command>(path(identifier, `/file?path=${encodeURIComponent(query.path)}`));
    },
    {
      params: issueParams,
      query: fileQuery,
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'Read a file of the playtest server with its base version' },
    },
  )

  .put(
    '/issues/:issueId/playtest/file',
    async ({ params, body, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call<Command>(path(identifier, '/file'), { method: 'PUT', body, actor: user?.name });
    },
    {
      params: issueParams,
      body: fileBody,
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'Write a file of the playtest server' },
    },
  )

  .post(
    '/issues/:issueId/playtest/:action',
    async ({ params, user }) => {
      const { identifier } = await issueTarget(params.issueId);
      return call<Command>(path(identifier, `/${params.action}`), {
        method: 'POST',
        actor: user?.name,
      });
    },
    {
      params: t.Object({
        issueId: t.Numeric(),
        action: t.Union([t.Literal('restart'), t.Literal('promote'), t.Literal('end')]),
      }),
      playtest: 'edit',
      response: { 200: CommandResponse, ...serviceErrors },
      detail: { summary: 'Restart, save as the base, or end the playtest server' },
    },
  )

  .get(
    '/projects/:projectKey/playtests',
    async ({ project }) => {
      if (!playtestsConfigured()) return [];
      return call<typeof ProjectPlaytestsResponse.static>(`/v1/projects/${project.key}/playtests`);
    },
    {
      permission: ['work_items', 'read'],
      response: { 200: ProjectPlaytestsResponse, ...accessErrors, ...errors(502) },
      detail: { summary: 'List the playtest stages of a project' },
    },
  )

  .get(
    '/projects/:projectKey/playtest/config',
    async ({ project }) => call<typeof ConfigResponse.static>(`/v1/projects/${project.key}/config`),
    {
      permission: ['repositories', 'read'],
      response: { 200: ConfigResponse, ...serviceErrors },
      detail: { summary: 'Get the playtest settings of a project' },
    },
  )

  .put(
    '/projects/:projectKey/playtest/config',
    async ({ project, body }) =>
      call<typeof ConfigResponse.static>(`/v1/projects/${project.key}/config`, {
        method: 'PUT',
        body,
      }),
    {
      body: configBody,
      permission: ['repositories', 'edit'],
      response: { 200: ConfigResponse, ...serviceErrors },
      detail: { summary: 'Set the playtest settings of a project' },
    },
  );
