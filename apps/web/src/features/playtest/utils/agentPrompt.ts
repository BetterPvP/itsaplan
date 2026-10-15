import type { Column } from '@/lib/api/endpoints/columns';

export type AgentPromptInput = {
  identifier: string;
  title: string;
  description: string;
  issueUrl: string;
  playtestUrl: string;
  branch: string;
  repository: string;
  columns: Pick<Column, 'id' | 'name' | 'stateType'>[];
  startColumnId: number | null;
  worldChangeLabel: string;
};

const names = (columns: AgentPromptInput['columns'], type: string) =>
  columns
    .filter((c) => c.stateType === type)
    .map((c) => `"${c.name}"`)
    .join(' or ');

// The prompt an AI agent needs to take the issue through the board: the issue, the
// branch to work on, the pull request that links it, the column that starts its
// playtest, and what the closing columns do. Column and label names come from the
// project.
export function buildAgentPrompt(i: AgentPromptInput): string {
  const start = i.columns.find((c) => c.id === i.startColumnId);
  const done = names(i.columns, 'completed');
  const canceled = names(i.columns, 'canceled');
  const steps = [
    `1. Work on a branch named \`${i.branch}\` in ${i.repository}.`,
    `2. Open a pull request in ${i.repository} whose description says "Closes ${i.identifier} (${i.issueUrl})", so the issue links to it.`,
    start
      ? `3. When the pull request is ready to test, move ${i.identifier} to the "${start.name}" column. That starts a playtest server for the branch. Its status and address are at ${i.playtestUrl}.`
      : `3. When the pull request is ready to test, a person starts a playtest from ${i.playtestUrl}.`,
    `4. Never playtest yourself. People play on the server and approve the build.`,
    done &&
      `5. Moving the issue to ${done} ends its server. With the "${i.worldChangeLabel}" label, the server is first saved as the base every playtest starts from.`,
    canceled && `6. Moving the issue to ${canceled} ends its server.`,
  ].filter(Boolean);
  return [
    `Itsaplan issue ${i.identifier}: ${i.title}`,
    i.issueUrl,
    '',
    i.description.trim() || '(No description.)',
    '',
    'How this issue goes through the board:',
    ...steps,
  ].join('\n');
}
