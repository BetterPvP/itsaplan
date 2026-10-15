import { t } from 'elysia';

export const issueParams = t.Object({ issueId: t.Numeric() });
export const projectParams = t.Object({ projectKey: t.String() });

export const consoleBody = t.Object({ command: t.String({ minLength: 1, maxLength: 1000 }) });
export const opsBody = t.Object({
  player: t.String({ pattern: '^[A-Za-z0-9_]{1,16}$' }),
  op: t.Boolean(),
});
export const fileQuery = t.Object({ path: t.String({ minLength: 1, maxLength: 300 }) });
export const fileBody = t.Object({
  path: t.String({ minLength: 1, maxLength: 300 }),
  content: t.String({ maxLength: 512 * 1024 }),
});
export const eventsQuery = t.Object({ after: t.Optional(t.Numeric()) });

export const configBody = t.Object({
  defaultOps: t.Array(t.String({ pattern: '^[A-Za-z0-9_]{1,16}$' }), { maxItems: 50 }),
  filePatterns: t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 50 }),
  autoStartColumnId: t.Nullable(t.Integer()),
});

const Stage = t.Union([
  t.Literal('queued'),
  t.Literal('build'),
  t.Literal('launch'),
  t.Literal('boot'),
  t.Literal('ready'),
  t.Literal('ended'),
]);

export const PlaytestState = t.Object({
  issue: t.String(),
  stage: Stage,
  failed: t.Boolean(),
  stages: t.Record(t.String(), t.Number()),
  branch: t.Nullable(t.String()),
  commit: t.Nullable(t.String()),
  address: t.Nullable(t.String()),
  runUrl: t.Nullable(t.String()),
  ops: t.Array(t.String()),
  connected: t.Boolean(),
  updatedAt: t.Number(),
});

export const PlaytestResponse = t.Object({
  configured: t.Boolean(),
  // The issue has a branch or pull request in the playtest repository.
  eligible: t.Boolean(),
  branch: t.Nullable(t.String()),
  playtest: t.Nullable(PlaytestState),
  feed: t.Array(
    t.Object({ id: t.Number(), ts: t.Number(), message: t.String(), failed: t.Boolean() }),
  ),
});

export const ProjectPlaytestsResponse = t.Array(
  t.Object({ issue: t.String(), stage: Stage, failed: t.Boolean() }),
);

export const CommandResponse = t.Object({
  ok: t.Boolean(),
  output: t.Optional(t.String()),
  data: t.Optional(t.Any()),
  error: t.Optional(t.String()),
});

export const ConfigResponse = configBody;
