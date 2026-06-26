import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth as authServer } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { $Enums, type User } from "@/generated/prisma/browser";
import { Effect } from "effect";
import { headers } from "next/headers";

/**
 * next-auth-compatible session shape. Email is always present (we treat a
 * session without an email as unauthenticated), matching the historical
 * augmented `Session` type the app was built against.
 */
export type Session = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  /** Set by the admin plugin when this session is impersonating a user. */
  impersonatedBy?: string | null;
};

/** App availability gate stored in Vercel Edge Config. */
export type Availability = "public" | "private";

/**
 * Returns the current session in the next-auth-compatible shape, or `null`
 * when unauthenticated. Backed by Better Auth so every existing `await auth()`
 * call site and authorization helper keeps working unchanged.
 */
export async function auth(): Promise<Session | null> {
  const session = await authServer.api.getSession({ headers: await headers() });
  if (!session?.user?.email) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
    impersonatedBy: session.session.impersonatedBy,
  };
}

/**
 * Signs the current user out (clears the Better Auth session cookie). Safe to
 * call from a server action — the `nextCookies` plugin handles cookie writes.
 */
export async function signOut(): Promise<void> {
  await authServer.api.signOut({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
}

export function isAdminUser(user: Pick<User, "role"> | null | undefined) {
  return user?.role === $Enums.UserRole.ADMIN;
}

export async function canManageTeam(
  teamId: number | null | undefined,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!teamId || !user) return false;
  if (isAdminUser(user)) return true;

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      ownerId: true,
      managers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return false;

  return team.ownerId === user.id || team.managers.length > 0;
}

export async function canViewTeam(
  teamId: number | null | undefined,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!teamId || !user) return false;
  if (isAdminUser(user)) return true;

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      ownerId: true,
      users: { where: { id: user.id }, select: { id: true } },
      managers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return false;

  return (
    team.ownerId === user.id ||
    team.users.length > 0 ||
    team.managers.length > 0
  );
}

export async function canEditScrim(
  scrimId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const scrim = await prisma.scrim.findUnique({
    where: { id: scrimId },
    select: { creatorId: true, teamId: true },
  });
  if (!scrim) return false;
  if (scrim.creatorId === user.id) return true;

  return await canManageTeam(scrim.teamId, user);
}

export async function canViewScrim(
  scrimId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const scrim = await prisma.scrim.findUnique({
    where: { id: scrimId },
    select: { id: true, creatorId: true, teamId: true, guestMode: true },
  });
  if (!scrim) return false;
  if (scrim.guestMode) return true;
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (scrim.creatorId === user.id) return true;
  if (await canViewTeam(scrim.teamId, user)) return true;

  const tournamentMatch = await prisma.tournamentMatch.findFirst({
    where: { scrimId },
    select: {
      tournament: {
        select: {
          creatorId: true,
          teams: { select: { teamId: true } },
        },
      },
    },
  });

  if (!tournamentMatch) return false;
  if (tournamentMatch.tournament.creatorId === user.id) return true;

  const participatingTeamIds = tournamentMatch.tournament.teams
    .map((team) => team.teamId)
    .filter((id): id is number => id !== null);
  if (participatingTeamIds.length === 0) return false;

  const userTeams = await prisma.team.count({
    where: {
      id: { in: participatingTeamIds },
      users: { some: { id: user.id } },
    },
  });
  return userTeams > 0;
}

export async function canManageTournament(
  tournamentId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  });
  if (!tournament) return false;

  return tournament.creatorId === user.id;
}

export async function canViewTournament(
  tournamentId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      creatorId: true,
      teams: { select: { teamId: true } },
    },
  });
  if (!tournament) return false;
  if (tournament.creatorId === user.id) return true;

  const teamIds = tournament.teams
    .map((team) => team.teamId)
    .filter((id): id is number => id !== null);
  if (teamIds.length === 0) return false;

  const matchingTeams = await prisma.team.count({
    where: {
      id: { in: teamIds },
      OR: [
        { ownerId: user.id },
        { users: { some: { id: user.id } } },
        { managers: { some: { userId: user.id } } },
      ],
    },
  });
  return matchingTeams > 0;
}

export async function getViewableScrimIds(
  scrimIds: number[],
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const uniqueIds = [...new Set(scrimIds)];
  const checks = await Promise.all(
    uniqueIds.map(async (id) => ({
      id,
      canView: await canViewScrim(id, user),
    }))
  );
  return checks.filter((check) => check.canView).map((check) => check.id);
}

export async function canViewMapData(
  mapDataId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const mapData = await prisma.mapData.findUnique({
    where: { id: mapDataId },
    select: { scrimId: true },
  });
  if (!mapData) return false;
  return await canViewScrim(mapData.scrimId, user);
}

export async function canViewMaps(
  mapIds: number[],
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const uniqueIds = [...new Set(mapIds)];
  const maps = await prisma.map.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, scrimId: true },
  });
  if (maps.length !== uniqueIds.length) return false;

  const scrimIds = maps
    .map((map) => map.scrimId)
    .filter((id): id is number => id !== null);
  if (scrimIds.length !== maps.length) return false;

  const viewableScrimIds = new Set(await getViewableScrimIds(scrimIds, user));
  return maps.every((map) => map.scrimId && viewableScrimIds.has(map.scrimId));
}

export async function isAuthedToViewScrim(id: number) {
  const user = await getCurrentUser();
  return await canViewScrim(id, user);
}

export async function isAuthedToViewMap(scrimId: number, mapId: number) {
  const scrimMaps = await prisma.map.findMany({
    where: {
      scrimId,
    },
  });

  if (!scrimMaps) return false;

  const map = scrimMaps.find((m) => m.id === mapId);

  if (!map) return false;

  return await isAuthedToViewScrim(scrimId);
}

export async function isTeamOwnerOrManager(id: number) {
  const session = await auth();
  if (!session) return false;

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );
  if (!user) return false;

  if (user.role === $Enums.UserRole.ADMIN) return true;

  const team = await prisma.team.findFirst({
    where: { id },
    select: {
      ownerId: true,
      managers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return false;

  return team.ownerId === user.id || team.managers.length > 0;
}

export async function isAuthedToViewTeam(id: number) {
  const user = await getCurrentUser();

  return await canViewTeam(id, user);
}
