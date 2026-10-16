import type { Column } from '@/lib/api/endpoints/columns';

export type AgentPromptInput = {
  identifier: string;
  title: string;
  description: string;
  issueUrl: string;
  playtestUrl: string;
  branch: string;
  baseBranch: string;
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

// The prompt an AI agent needs to take the issue through the board: where to read the
// issue's acceptance criteria and playtest findings, the branch to work on, the pull
// request that links it, the column that starts its playtest, and what the closing
// columns do. Column and label names come from the project. The agent reads the
// checklists, subtasks and comments itself, so the prompt is current when it starts.
export function buildAgentPrompt(i: AgentPromptInput): string {
  const dash = i.identifier.lastIndexOf('-');
  const key = i.identifier.slice(0, dash);
  const number = i.identifier.slice(dash + 1);
  const start = i.columns.find((c) => c.id === i.startColumnId);
  const progress = i.columns.find((c) => c.stateType === 'started' && c.id !== i.startColumnId);
  const done = names(i.columns, 'completed');
  const canceled = names(i.columns, 'canceled');
  const steps = [
    `${progress ? `Move ${i.identifier} to the "${progress.name}" column. ` : ''}Work on a branch named \`${i.branch}\` in ${i.repository}, cut from \`${i.baseBranch}\`. If the branch exists, continue on it.`,
    `Write a test for each [auto] item and tick the item once it passes. Leave [play] items to the testers.`,
    `Open a pull request into \`${i.baseBranch}\` whose description says "Closes ${i.identifier} (${i.issueUrl})", so the issue links to it. If one is open, push to it.`,
    start
      ? `When the pull request is ready to test, move ${i.identifier} to the "${start.name}" column. That starts a playtest server for the branch. Its status and address are at ${i.playtestUrl}.`
      : `When the pull request is ready to test, a person starts a playtest from ${i.playtestUrl}.`,
    `Never playtest yourself. People play on the server and approve the build.`,
    done &&
      `Moving the issue to ${done} ends its server. With the "${i.worldChangeLabel}" label, the server is first saved as the base every playtest starts from.`,
    canceled && `Moving the issue to ${canceled} ends its server.`,
  ]
    .filter(Boolean)
    .map((step, n) => `${n + 1}. ${step}`);
  return [
    `Itsaplan issue ${i.identifier}: ${i.title}`,
    i.issueUrl,
    '',
    i.description.trim() || '(No description.)',
    '',
    `Before you start, read the issue with the Itsaplan tools: get_issue_by_number (project ${key}, number ${number}), list_issue_activity for its comments and list_issue_documents for its docs.`,
    `- Its checklists are the acceptance criteria. An item tagged [auto] is checked by a test, an item tagged [play] by people on the playtest server.`,
    `- Its open subtasks are findings from earlier playtests. Fix them on the same branch and move each fixed one to ${done || 'a completed column'}.`,
    `- Comments since the last push can hold findings that have no subtask yet.`,
    '',
    'How this issue goes through the board:',
    ...steps,
  ].join('\n');
}
