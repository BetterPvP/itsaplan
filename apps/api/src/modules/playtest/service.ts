import { listIssueDevelopmentLinks, type DevelopmentLink } from '#modules/git/development';
import { getIssue } from '#modules/issues/service';
import { HttpError } from '#shared/lib';

// The playtest service (BetterPvP/playtest, service/) holds every playtest's state and
// talks to the servers. This module checks who may see and act on an issue's
// playtest and forwards to it.

const serviceUrl = () => process.env.PLAYTEST_URL?.replace(/\/$/, '') ?? '';
const serviceToken = () => process.env.PLAYTEST_TOKEN ?? '';
const repository = () => (process.env.PLAYTEST_REPOSITORY ?? 'BetterPvP/BetterPvP').toLowerCase();

export const playtestsConfigured = () => serviceUrl() !== '' && serviceToken() !== '';

// The branch a playtest of the issue builds, from its links in the playtest repository
// (newest first): the newest open pull request or branch, else the branch the newest
// merged pull request went into, since GitHub usually deletes a merged source branch.
// Null when the issue has neither.
export function playtestBranch(links: DevelopmentLink[]): string | null {
  const linked = links.filter(
    (l) => l.provider === 'github' && l.repository.toLowerCase() === repository(),
  );
  const open = linked.find((l) => l.state === 'open' && l.sourceBranch);
  if (open) return open.sourceBranch;
  return linked.find((l) => l.state === 'merged')?.targetBranch ?? null;
}

export async function issueTarget(issueId: number) {
  const issue = await getIssue(issueId);
  if (!issue) throw new HttpError(404, 'Issue not found');
  return {
    identifier: issue.identifier,
    branch: playtestBranch(await listIssueDevelopmentLinks(issueId)),
  };
}

// Calls the playtest service and returns its answer as is: status, headers and body,
// so an event stream passes through unread.
export async function forward(
  path: string,
  init: { method?: string; body?: unknown; actor?: string; signal?: AbortSignal } = {},
): Promise<Response> {
  if (!playtestsConfigured()) throw new HttpError(503, 'Playtests are not configured');
  const headers: Record<string, string> = { authorization: `Bearer ${serviceToken()}` };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.actor) headers['x-playtest-actor'] = init.actor;
  let res: Response;
  try {
    res = await fetch(serviceUrl() + path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch {
    throw new HttpError(502, 'The playtest service is not reachable');
  }
  return res;
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
