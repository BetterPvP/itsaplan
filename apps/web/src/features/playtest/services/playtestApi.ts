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

// An issue's playtest by the issue's id, or the staging server by the key of the project
// whose page shows it.
export type PlaytestRef = number | string;

const base = (target: PlaytestRef) =>
  typeof target === 'number'
    ? `/issues/${target}/playtest`
    : `/projects/${encodeURIComponent(target)}/playtest/staging`;
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const project = (projectKey: string) => `/projects/${encodeURIComponent(projectKey)}`;

export const playtestApi = {
  get: (target: PlaytestRef) => request<IssuePlaytest>(base(target)),
  startStaging: (projectKey: string, branch: string) =>
    post<CommandResult>(`${base(projectKey)}/start`, { branch }),
  action: (target: PlaytestRef, action: PlaytestAction) =>
    post<CommandResult & { waiting?: boolean }>(`${base(target)}/${action}`),
  console: (target: PlaytestRef, command: string) =>
    post<CommandResult>(`${base(target)}/console`, { command }),
  op: (target: PlaytestRef, player: string, op: boolean) =>
    post<CommandResult>(`${base(target)}/ops`, { player, op }),
  review: (target: PlaytestRef, verdict: Verdict) =>
    post<{ approvals: Review[] }>(`${base(target)}/approvals`, { verdict }),
  unreview: (target: PlaytestRef) =>
    request<{ approvals: Review[] }>(`${base(target)}/approvals`, { method: 'DELETE' }),
  testers: (target: PlaytestRef) => post<{ ok: boolean }>(`${base(target)}/testers`),
  share: (target: PlaytestRef, kind: 'console' | 'startup') =>
    post<{ url: string }>(`${base(target)}/share`, { kind }),
  startup: (target: PlaytestRef, reveal: boolean) =>
    request<LogLine[]>(`${base(target)}/startup${reveal ? '?reveal=true' : ''}`),
  files: (target: PlaytestRef) => request<CommandResult<FileEntry[]>>(`${base(target)}/files`),
  file: (target: PlaytestRef, path: string) =>
    request<CommandResult<FileContent>>(`${base(target)}/file?path=${encodeURIComponent(path)}`),
  writeFile: (target: PlaytestRef, path: string, content: string) =>
    request<CommandResult>(`${base(target)}/file`, {
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
  events: (target: PlaytestRef, after: number, reveal: boolean, signal: AbortSignal) =>
    fetch(`${API_URL}${base(target)}/events?after=${after}${reveal ? '&reveal=true' : ''}`, {
      credentials: 'include',
      cache: 'no-store',
      signal,
    }),
};

export const playtestKeys = {
  issue: (target: PlaytestRef) => ['playtest', 'issue', target] as const,
  project: (projectKey: string) => ['playtest', 'project', projectKey] as const,
  config: (projectKey: string) => ['playtest', 'config', projectKey] as const,
  files: (target: PlaytestRef) => ['playtest', 'files', target] as const,
  startup: (target: PlaytestRef, reveal: boolean) =>
    ['playtest', 'startup', target, reveal] as const,
};
