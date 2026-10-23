import { aiAgent, db, team, teamMember, user } from '@repo/db';
import { and, asc, eq, ilike, notExists, or, sql } from 'drizzle-orm';
import { HttpError } from '#shared/lib';
import { assertSeatFree, type TeamRole } from '#modules/teams/service';

const CANDIDATE_LIMIT = 20;

// An account that is not an AI agent's bot user. An agent joins a team with its agent.
const notAnAgent = notExists(
  db
    .select({ one: sql`1` })
    .from(aiAgent)
    .where(eq(aiAgent.userId, user.id)),
);

// Up to 20 active people on the instance who are not in the team yet, by name or address.
export async function listTeamCandidates(teamId: number, search?: string) {
  const term = search?.trim();
  return db
    .select({ userId: user.id, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(
      and(
        eq(user.active, true),
        notAnAgent,
        notExists(
          db
            .select({ one: sql`1` })
            .from(teamMember)
            .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, user.id))),
        ),
        term ? or(ilike(user.name, `%${term}%`), ilike(user.email, `%${term}%`)) : undefined,
      ),
    )
    .orderBy(asc(user.name))
    .limit(CANDIDATE_LIMIT);
}

// Puts an existing account straight into the team at the given rank, the way an accepted
// invite does, without the invite. It takes a seat like any other join.
export async function addTeamMemberDirectly(
  teamId: number,
  userId: string,
  role: TeamRole,
): Promise<void> {
  const [found] = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId));
  if (!found) throw new HttpError(404, 'Team not found');
  const [person] = await db
    .select({ id: user.id, active: user.active })
    .from(user)
    .where(and(eq(user.id, userId), notAnAgent));
  if (!person) throw new HttpError(404, 'User not found');
  if (person.active === false) throw new HttpError(409, 'A deactivated account cannot join a team');

  const [existing] = await db
    .select({ role: teamMember.role })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
  if (existing) {
    throw new HttpError(409, 'This person is already in the team', 'ALREADY_TEAM_MEMBER');
  }

  await assertSeatFree(teamId, userId);
  await db.insert(teamMember).values({ teamId, userId, role }).onConflictDoNothing();
}

// Sets the name an account shows everywhere. An agent's name follows its agent.
export async function setUserDisplayName(userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new HttpError(400, 'A display name cannot be empty');
  const [person] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, userId), notAnAgent));
  if (!person) throw new HttpError(404, 'User not found');
  await db.update(user).set({ name: trimmed, updatedAt: new Date() }).where(eq(user.id, userId));
}
