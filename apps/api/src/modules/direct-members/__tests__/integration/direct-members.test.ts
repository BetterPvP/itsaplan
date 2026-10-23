import { beforeEach, describe, expect, it } from 'bun:test';
import { resetDb } from '#tests/helpers/db';
import { addUser, setup, type Actor } from '#modules/god/__tests__/helpers';

// Integration coverage for adding an existing account to a team without an invite, from
// team settings and from god mode, and for god mode renaming an account.

async function ownTeamId(actor: Actor): Promise<number> {
  const teams = await actor.api.teams.get();
  return teams.data!.find((one) => one.role === 'owner')!.id;
}

async function rankOf(actor: Actor, teamId: number, userId: string) {
  const list = await actor.api.teams({ teamId }).members.get();
  return list.data?.items.find((one) => one.userId === userId)?.role;
}

describe('direct team members', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets an owner add an existing account at any rank', async () => {
    await setup();
    const owner = await addUser();
    const person = await addUser({ name: 'Pat Person' });
    const teamId = await ownTeamId(owner);

    const candidates = await owner.api.teams({ teamId }).members.candidates.get({
      query: { search: 'Pat' },
    });
    expect(candidates.status).toBe(200);
    expect(candidates.data!.map((one) => one.userId)).toContain(person.id);

    const added = await owner.api
      .teams({ teamId })
      .members.post({ userId: person.id, role: 'manager' });
    expect(added.status).toBe(204);
    expect(await rankOf(owner, teamId, person.id)).toBe('manager');

    const again = await owner.api
      .teams({ teamId })
      .members.candidates.get({ query: { search: 'Pat' } });
    expect(again.data!.map((one) => one.userId)).not.toContain(person.id);
  });

  it('refuses someone already in the team', async () => {
    await setup();
    const owner = await addUser();
    const person = await addUser();
    const teamId = await ownTeamId(owner);
    await owner.api.teams({ teamId }).members.post({ userId: person.id, role: 'member' });

    const twice = await owner.api
      .teams({ teamId })
      .members.post({ userId: person.id, role: 'member' });
    expect(twice.status).toBe(409);
  });

  it('keeps a manager to the member rank and shuts out plain members', async () => {
    await setup();
    const owner = await addUser();
    const manager = await addUser();
    const member = await addUser();
    const outsider = await addUser();
    const teamId = await ownTeamId(owner);
    await owner.api.teams({ teamId }).members.post({ userId: manager.id, role: 'manager' });
    await owner.api.teams({ teamId }).members.post({ userId: member.id, role: 'member' });

    const asOwner = await manager.api
      .teams({ teamId })
      .members.post({ userId: outsider.id, role: 'owner' });
    expect(asOwner.status).toBe(403);

    const asMember = await manager.api
      .teams({ teamId })
      .members.post({ userId: outsider.id, role: 'member' });
    expect(asMember.status).toBe(204);

    const byMember = await member.api.teams({ teamId }).members.candidates.get({ query: {} });
    expect(byMember.status).toBe(403);
  });

  it('lets god mode add anyone to any team', async () => {
    const { god } = await setup();
    const owner = await addUser();
    const person = await addUser();
    const teamId = await ownTeamId(owner);

    const refused = await owner.api.god
      .teams({ teamId })
      .members.post({ userId: person.id, role: 'owner' });
    expect(refused.status).toBe(403);

    const added = await god.api.god
      .teams({ teamId })
      .members.post({ userId: person.id, role: 'owner' });
    expect(added.status).toBe(204);
    expect(await rankOf(owner, teamId, person.id)).toBe('owner');
  });

  it('lets god mode change a display name', async () => {
    const { god } = await setup();
    const person = await addUser({ name: 'Old Name' });

    const renamed = await god.api.god
      .users({ userId: person.id })
      .name.patch({ name: '  New Name ' });
    expect(renamed.status).toBe(204);
    const detail = await god.api.god.users({ userId: person.id }).get();
    expect(detail.data!.name).toBe('New Name');

    const blank = await god.api.god.users({ userId: person.id }).name.patch({ name: '   ' });
    expect(blank.status).toBe(400);

    const byUser = await person.api.god.users({ userId: person.id }).name.patch({ name: 'Mine' });
    expect(byUser.status).toBe(403);
  });
});
