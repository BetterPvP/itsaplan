import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAgentPrompt, type AgentPromptInput } from './agentPrompt';

const input: AgentPromptInput = {
  identifier: 'CLANS-4',
  title: 'Empty camps',
  description: 'Camps spawn empty.',
  issueUrl: 'https://plan.example/bpvp/issue/CLANS-4',
  playtestUrl: 'https://plan.example/bpvp/CLANS/playtests/CLANS-4',
  branch: 'braulio/clans-4-empty-camps',
  repository: 'BetterPvP/BetterPvP',
  columns: [
    { id: 8, name: 'In Progress', stateType: 'started' },
    { id: 11, name: 'Playtest', stateType: 'started' },
    { id: 9, name: 'Done', stateType: 'completed' },
    { id: 10, name: 'Canceled', stateType: 'canceled' },
  ],
  startColumnId: 11,
  worldChangeLabel: 'World change',
};

describe('buildAgentPrompt', () => {
  it('names the branch, the pull request link, the start column and the closing columns', () => {
    const prompt = buildAgentPrompt(input);
    assert.match(prompt, /branch named `braulio\/clans-4-empty-camps` in BetterPvP\/BetterPvP/);
    assert.match(prompt, /"Closes CLANS-4 \(https:\/\/plan\.example\/bpvp\/issue\/CLANS-4\)"/);
    assert.match(prompt, /move CLANS-4 to the "Playtest" column/);
    assert.match(prompt, /Never playtest yourself/);
    assert.match(prompt, /to "Done" ends its server\. With the "World change" label/);
    assert.match(prompt, /to "Canceled" ends its server/);
  });

  it('leaves the playtest start to a person when the project has no start column', () => {
    const prompt = buildAgentPrompt({ ...input, startColumnId: null });
    assert.match(prompt, /a person starts a playtest from https:\/\/plan\.example/);
    assert.doesNotMatch(prompt, /move CLANS-4 to/);
  });
});
