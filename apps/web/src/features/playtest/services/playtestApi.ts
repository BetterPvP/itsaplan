import { API_URL, request } from '@/lib/api/core/client';

export const STAGES = ['queued', 'build', 'launch', 'boot', 'ready', 'ended'] as const;
export type Stage = (typeof STAGES)[number];

export type PlaytestState = {
  issue: string;
  stage: Stage;
  failed: boolean;
  stages: Partial<Record<Stage, number>>;
  branch: string | null;
  commit: string | null;
  address: string | null;
  runUrl: string | null;
  ops: string[];
  connected: boolean;
  updatedAt: number;
};

export type FeedEntry = { id: number; ts: number; message: string; failed: boolean };
export type LogLine = { seq: number; ts: number; text: string };

export type Playtest = {
  configured: boolean;
  eligible: boolean;
  branch: string | null;
  playtest: PlaytestState | null;
  feed: FeedEntry[];
};

export type CommandResult<T = unknown> = { ok: boolean; output?: string; data?: T; error?: string };
export type FileEntry = { path: string; size: number; changed: boolean };
export type FileContent = { path: string; content: string; base: string | null };
export type ProjectPlaytest = { issue: string; stage: Stage; failed: boolean };
export type PlaytestConfig = {
  defaultOps: string[];
  filePatterns: string[];
  autoStartColumnId: number | null;
};
export type PlaytestAction = 'start' | 'restart' | 'promote' | 'end';

const base = (issueId: number) => `/issues/${issueId}/playtest`;
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const playtestApi = {
  get: (issueId: number) => request<Playtest>(base(issueId)),
  action: (issueId: number, action: PlaytestAction) =>
    post<CommandResult>(`${base(issueId)}/${action}`),
  console: (issueId: number, command: string) =>
    post<CommandResult>(`${base(issueId)}/console`, { command }),
  op: (issueId: number, player: string, op: boolean) =>
    post<CommandResult>(`${base(issueId)}/ops`, { player, op }),
  files: (issueId: number) => request<CommandResult<FileEntry[]>>(`${base(issueId)}/files`),
  file: (issueId: number, path: string) =>
    request<CommandResult<FileContent>>(`${base(issueId)}/file?path=${encodeURIComponent(path)}`),
  writeFile: (issueId: number, path: string, content: string) =>
    request<CommandResult>(`${base(issueId)}/file`, {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    }),
  project: (projectKey: string) =>
    request<ProjectPlaytest[]>(`/projects/${encodeURIComponent(projectKey)}/playtests`),
  config: (projectKey: string) =>
    request<PlaytestConfig>(`/projects/${encodeURIComponent(projectKey)}/playtest/config`),
  setConfig: (projectKey: string, config: PlaytestConfig) =>
    request<PlaytestConfig>(`/projects/${encodeURIComponent(projectKey)}/playtest/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  // The live stream: state changes, feed entries and log lines after `after`.
  events: (issueId: number, after: number, signal: AbortSignal) =>
    fetch(`${API_URL}${base(issueId)}/events?after=${after}`, {
      credentials: 'include',
      cache: 'no-store',
      signal,
    }),
};

export const playtestKeys = {
  issue: (issueId: number) => ['playtest', 'issue', issueId] as const,
  project: (projectKey: string) => ['playtest', 'project', projectKey] as const,
  config: (projectKey: string) => ['playtest', 'config', projectKey] as const,
  files: (issueId: number) => ['playtest', 'files', issueId] as const,
};
