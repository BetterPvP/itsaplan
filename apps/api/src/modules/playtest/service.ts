import { listDevelopmentRepositories, listManagedBranches } from '#modules/git/connections-service';
import { listIssueDevelopmentLinks, type DevelopmentLink } from '#modules/git/development';
import { getIssue } from '#modules/issues/service';
import { getProjectById } from '#modules/projects/service';
import { getProjectAccess } from '#shared/access';
import { HttpError } from '#shared/lib';
import type { PermissionAction, PermissionResource } from '#shared/permissions';

// The playtest service (BetterPvP/playtest, service/) holds every playtest's state and
// talks to the servers. This module checks who may see and act on an issue's
// playtest and forwards to it.

const serviceUrl = () => process.env.PLAYTEST_URL?.replace(/\/$/, '') ?? '';
const serviceToken = () => process.env.PLAYTEST_TOKEN ?? '';
const repository = () => (process.env.PLAYTEST_REPOSITORY ?? 'BetterPvP/BetterPvP').toLowerCase();
const appUrl = () => (process.env.APP_URL ?? '').replace(/\/$/, '');

export const playtestsConfigured = () => serviceUrl() !== '' && serviceToken() !== '';

const linked = (links: DevelopmentLink[]) =>
  links.filter((l) => l.provider === 'github' && l.repository.toLowerCase() === repository());

// The branch a playtest of the issue builds, from its links in the playtest repository
// (newest first): the newest open pull request or branch, else the branch the newest
// merged pull request went into, since GitHub usually deletes a merged source branch.
// Null when the issue has neither.
export function playtestBranch(links: DevelopmentLink[]): string | null {
  const ours = linked(links);
  const open = ours.find((l) => l.state === 'open' && l.sourceBranch);
  if (open) return open.sourceBranch;
  return ours.find((l) => l.state === 'merged')?.targetBranch ?? null;
}

// The pull request a playtest belongs to: the newest open one, else the newest at all.
export function playtestPullRequest(links: DevelopmentLink[]): string | null {
  const prs = linked(links).filter((l) => l.kind === 'pull_request' && l.url);
  return (prs.find((l) => l.state === 'open') ?? prs[0])?.url ?? null;
}

export async function issueTarget(issueId: number) {
  const issue = await getIssue(issueId);
  if (!issue) throw new HttpError(404, 'Issue not found');
  const project = await getProjectById(issue.projectId);
  if (!project) throw new HttpError(404, 'Project not found');
  const links = await listIssueDevelopmentLinks(issueId);
  return {
    identifier: issue.identifier,
    title: issue.title,
    projectId: issue.projectId,
    branch: playtestBranch(links),
    prUrl: playtestPullRequest(links),
    issueUrl: `${appUrl()}/${project.teamRef}/issue/${issue.identifier}`,
    playtestUrl: `${appUrl()}/${project.teamRef}/${project.key}/playtests/${issue.identifier}`,
  };
}

// The branches of the playtest repository, for picking the staging server's, through
// the project's connection to it. At most five pages, the default branch first.
export async function playtestRepositoryBranches(projectId: number) {
  const repo = (await listDevelopmentRepositories(projectId)).find(
    (r) => r.fullName.toLowerCase() === repository(),
  );
  if (!repo) throw new HttpError(409, `The project is not connected to ${repository()}`);
  const branches: string[] = [];
  let defaultBranch: string | null = null;
  for (let page: number | null = 1; page != null && page <= 5;) {
    const result = await listManagedBranches(projectId, repo.id, page);
    branches.push(...result.branches);
    defaultBranch ??= result.defaultBranch;
    page = result.nextPage;
  }
  branches.sort(
    (a, b) => Number(b === defaultBranch) - Number(a === defaultBranch) || a.localeCompare(b),
  );
  return { branches, defaultBranch };
}

// Every playtest permission a person holds on a project, for the pages to show only
// what they may do. Owners hold all of them.
export const PLAYTEST_PERMISSIONS = {
  view: ['playtests', 'read'],
  start: ['playtests', 'create'],
  restart: ['playtests', 'edit'],
  end: ['playtests', 'delete'],
  saveBase: ['playtest_base', 'edit'],
  review: ['playtest_reviews', 'create'],
  requestTesters: ['playtest_testers', 'create'],
  readConsole: ['playtest_console', 'read'],
  sendCommands: ['playtest_console', 'create'],
  opPlayers: ['playtest_players', 'edit'],
  readFiles: ['playtest_files', 'read'],
  editFiles: ['playtest_files', 'edit'],
  shareLogs: ['playtest_logs', 'create'],
  showSensitive: ['playtest_sensitive', 'read'],
  readSettings: ['playtest_settings', 'read'],
  editSettings: ['playtest_settings', 'edit'],
} as const satisfies Record<string, [PermissionResource, PermissionAction]>;

export type PlaytestPermissions = Record<keyof typeof PLAYTEST_PERMISSIONS, boolean>;

export async function playtestPermissions(
  projectId: number,
  userId: string,
): Promise<PlaytestPermissions> {
  const access = await getProjectAccess(projectId, userId);
  const out = {} as PlaytestPermissions;
  for (const [name, [resource, action]] of Object.entries(PLAYTEST_PERMISSIONS)) {
    out[name as keyof PlaytestPermissions] =
      access?.role === 'owner' || access?.permissions[resource]?.[action] === true;
  }
  return out;
}

export type Actor = { id: string; name?: string | null; image?: string | null };

// Calls the playtest service and returns its answer as is: status, headers and body,
// so an event stream passes through unread.
export async function forward(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    actor?: Actor | null;
    reveal?: boolean;
    noLog?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  if (!playtestsConfigured()) throw new HttpError(503, 'Playtests are not configured');
  const headers: Record<string, string> = { authorization: `Bearer ${serviceToken()}` };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.actor) {
    headers['x-playtest-actor-id'] = init.actor.id;
    if (init.actor.name) headers['x-playtest-actor'] = init.actor.name;
    if (init.actor.image) headers['x-playtest-actor-image'] = init.actor.image;
  }
  if (init.reveal) headers['x-playtest-reveal'] = '1';
  if (init.noLog) headers['x-playtest-no-log'] = '1';
  try {
    return await fetch(serviceUrl() + path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch {
    throw new HttpError(502, 'The playtest service is not reachable');
  }
}

// forward, for a JSON answer: a service failure becomes an HttpError with its message.
export async function call<T>(path: string, init: Parameters<typeof forward>[1] = {}): Promise<T> {
  const res = await forward(path, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok)
    throw new HttpError(
      res.status === 401 ? 502 : res.status,
      body.error ?? 'The playtest service failed',
    );
  return body;
}
