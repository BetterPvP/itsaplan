import { API_URL, request } from '@/lib/api/core/client';

export const STAGES = ['queued', 'build', 'launch', 'boot', 'ready', 'ended'] as const;
export type Stage = (typeof STAGES)[number];

export type Metrics = {
  ts: number;
  players: string[];
  maxPlayers: number | null;
  tps: number | null;
  mspt: number | null;
  ramUsedMb: number | null;
  ramMaxMb: number | null;
  idleShutdownAt: number | null;
  rconReady: boolean;
};

export type Verdict = 'approved' | 'changes';
export type Review = {
  userId: string;
  name: string;
  image: string | null;
  verdict: Verdict;
  commit: string;
  ts: number;
};

export type PlaytestState = {
  issue: string;
  stage: Stage;
  failed: boolean;
  waiting: boolean;
  stages: Partial<Record<Stage, number>>;
  branch: string | null;
  commit: string | null;
  address: string | null;
  runUrl: string | null;
  ops: string[];
  connected: boolean;
  metrics: Metrics | null;
  cost: number | null;
  market: string | null;
  instanceType: string | null;
  hourlyPrice: number | null;
  launchedAt: number | null;
  endedAt: number | null;
  approved: number;
  requiredApprovals: number;
  reviews: Review[];
  updatedAt: number;
};

export type FeedEntry = { id: number; ts: number; message: string; failed: boolean };
export type LogSource = 'setup' | 'server' | 'command';
export type LogLine = { seq: number; ts: number; text: string; src: LogSource };

export type PlaytestPermissions = {
  view: boolean;
  start: boolean;
  restart: boolean;
  end: boolean;
  saveBase: boolean;
  review: boolean;
  requestTesters: boolean;
  readConsole: boolean;
  sendCommands: boolean;
  opPlayers: boolean;
  readFiles: boolean;
  editFiles: boolean;
  shareLogs: boolean;
  showSensitive: boolean;
  readSettings: boolean;
  editSettings: boolean;
};

// What every member may know of the project's playtest settings.
export type PlaytestSummarySettings = {
  autoStartColumnId: number | null;
  worldChangeLabel: string;
  requiredApprovals: number;
  shareProvider: SharedProvider;
  testersWebhookSet: boolean;
};

export type IssuePlaytest = {
  configured: boolean;
  eligible: boolean;
  identifier: string;
  title: string;
  branch: string | null;
  prUrl: string | null;
  permissions: PlaytestPermissions;
  playtest: PlaytestState | null;
  feed: FeedEntry[];
  approvals: Review[];
  settings: PlaytestSummarySettings | null;
};

export type ProjectPlaytest = PlaytestState & { issueId: number; title: string };
export type ProjectPlaytests = { permissions: PlaytestPermissions; playtests: ProjectPlaytest[] };

export type CommandResult<T = unknown> = { ok: boolean; output?: string; data?: T; error?: string };
export type FileEntry = { path: string; size: number; changed: boolean };
export type FileContent = { path: string; content: string; base: string | null };

export type SharedProvider = 'mclogs' | 's3' | 'custom';
export type PlaytestConfig = {
  defaultOps: string[];
  filePatterns: string[];
  autoStartColumnId: number | null;
  requiredApprovals: number;
  maxConcurrent: number | null;
  testersWebhook: string;
  share: {
    provider: SharedProvider;
    custom: { url: string; body: 'text' | 'json'; responseField: string; linkTemplate: string };
  };
  idleNoJoinMinutes: number;
  idleEmptyMinutes: number;
  maxLifetimeHours: number;
  worldChangeLabel: string;
  onDemandHourlyPrice: number;
};

export type PlaytestAction = 'start' | 'restart' | 'redeploy' | 'start-again' | 'end' | 'promote';

const base = (issueId: number) => `/issues/${issueId}/playtest`;
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const project = (projectKey: string) => `/projects/${encodeURIComponent(projectKey)}`;

export const playtestApi = {
  get: (issueId: number) => request<IssuePlaytest>(base(issueId)),
  action: (issueId: number, action: PlaytestAction) =>
    post<CommandResult & { waiting?: boolean }>(`${base(issueId)}/${action}`),
  console: (issueId: number, command: string) =>
    post<CommandResult>(`${base(issueId)}/console`, { command }),
  op: (issueId: number, player: string, op: boolean) =>
    post<CommandResult>(`${base(issueId)}/ops`, { player, op }),
  review: (issueId: number, verdict: Verdict) =>
    post<{ approvals: Review[] }>(`${base(issueId)}/approvals`, { verdict }),
  testers: (issueId: number) => post<{ ok: boolean }>(`${base(issueId)}/testers`),
  share: (issueId: number, kind: 'console' | 'startup') =>
    post<{ url: string }>(`${base(issueId)}/share`, { kind }),
  startup: (issueId: number, reveal: boolean) =>
    request<LogLine[]>(`${base(issueId)}/startup${reveal ? '?reveal=true' : ''}`),
  files: (issueId: number) => request<CommandResult<FileEntry[]>>(`${base(issueId)}/files`),
  file: (issueId: number, path: string) =>
    request<CommandResult<FileContent>>(`${base(issueId)}/file?path=${encodeURIComponent(path)}`),
  writeFile: (issueId: number, path: string, content: string) =>
    request<CommandResult>(`${base(issueId)}/file`, {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    }),
  project: (projectKey: string) => request<ProjectPlaytests>(`${project(projectKey)}/playtests`),
  config: (projectKey: string) => request<PlaytestConfig>(`${project(projectKey)}/playtest/config`),
  setConfig: (projectKey: string, config: Partial<PlaytestConfig>) =>
    request<PlaytestConfig>(`${project(projectKey)}/playtest/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  issueId: async (projectKey: string, identifier: string) =>
    (
      await request<{ id: number }>(
        `${project(projectKey)}/issues/${encodeURIComponent(identifier.split('-').pop() ?? '')}`,
      )
    ).id,
  // The live stream: state, feed, approvals, metrics and log lines after `after`.
  events: (issueId: number, after: number, reveal: boolean, signal: AbortSignal) =>
    fetch(`${API_URL}${base(issueId)}/events?after=${after}${reveal ? '&reveal=true' : ''}`, {
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
  startup: (issueId: number, reveal: boolean) => ['playtest', 'startup', issueId, reveal] as const,
};
