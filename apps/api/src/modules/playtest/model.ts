import { t } from 'elysia';

export const issueParams = t.Object({ issueId: t.Numeric() });

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
export const eventsQuery = t.Object({
  after: t.Optional(t.Numeric()),
  reveal: t.Optional(t.BooleanString()),
});
export const logQuery = t.Object({ reveal: t.Optional(t.BooleanString()) });
export const targetQuery = t.Object({ actor: t.Optional(t.String({ maxLength: 100 })) });
export const reviewBody = t.Object({
  verdict: t.Union([t.Literal('approved'), t.Literal('changes')]),
});
export const stagingStartBody = t.Object({
  branch: t.String({ minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9._/-]+$' }),
});
export const shareBody = t.Object({
  kind: t.Union([t.Literal('console'), t.Literal('startup')]),
});

const Player = t.String({ pattern: '^[A-Za-z0-9_]{1,16}$' });
const Minutes = t.Integer({ minimum: 5, maximum: 720 });

export const configBody = t.Partial(
  t.Object({
    defaultOps: t.Array(Player, { maxItems: 50 }),
    filePatterns: t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 50 }),
    autoStartColumnId: t.Nullable(t.Integer()),
    requiredApprovals: t.Integer({ minimum: 0, maximum: 20 }),
    maxConcurrent: t.Nullable(t.Integer({ minimum: 1, maximum: 50 })),
    testersWebhook: t.String({ maxLength: 300 }),
    share: t.Object({
      provider: t.Union([t.Literal('mclogs'), t.Literal('s3'), t.Literal('custom')]),
      custom: t.Object({
        url: t.String({ maxLength: 300 }),
        body: t.Union([t.Literal('text'), t.Literal('json')]),
        responseField: t.String({ maxLength: 100 }),
        linkTemplate: t.String({ maxLength: 300 }),
      }),
    }),
    idleNoJoinMinutes: Minutes,
    idleEmptyMinutes: Minutes,
    maxLifetimeHours: t.Integer({ minimum: 1, maximum: 24 }),
    worldChangeLabel: t.String({ minLength: 1, maxLength: 80 }),
    onDemandHourlyPrice: t.Number({ minimum: 0, maximum: 100 }),
  }),
);

// The playtest service's payloads pass through as it sends them.
export const ServiceResponse = t.Any();
