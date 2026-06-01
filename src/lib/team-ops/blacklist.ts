import "server-only";
import prisma from "@/lib/prisma";
import { blacklistKey } from "@/lib/team-ops/blacklist-key";
import { buildBlockedTeamIdSet } from "@/lib/team-ops/blocked-set";
import type { TeamBlacklistSource } from "@prisma/client";

export type BlacklistRow = {
  id: string;
  blockedTeamId: number | null;
  blockedTeamName: string;
  reason: string | null;
  source: TeamBlacklistSource;
  createdAt: Date;
};

export async function listBlacklist(ownerTeamId: number): Promise<BlacklistRow[]> {
  const rows = await prisma.teamBlacklist.findMany({
    where: { ownerTeamId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      blockedTeamId: true,
      blockedTeamName: true,
      reason: true,
      source: true,
      createdAt: true,
      blockedTeam: { select: { name: true } },
    },
  });
  // Prefer the live team name for on-platform entries; fall back to the snapshot.
  return rows.map((r) => ({
    id: r.id,
    blockedTeamId: r.blockedTeamId,
    blockedTeamName: r.blockedTeam?.name ?? r.blockedTeamName,
    reason: r.reason,
    source: r.source,
    createdAt: r.createdAt,
  }));
}

export async function addBlacklistEntry(input: {
  ownerTeamId: number;
  blockedTeamId: number | null;
  blockedTeamName: string;
  reason: string | null;
  createdBy: string;
  source?: TeamBlacklistSource;
}): Promise<void> {
  const key = blacklistKey({
    teamId: input.blockedTeamId,
    name: input.blockedTeamName,
  });
  await prisma.teamBlacklist.upsert({
    where: { ownerTeamId_blockedKey: { ownerTeamId: input.ownerTeamId, blockedKey: key } },
    update: { reason: input.reason },
    create: {
      ownerTeamId: input.ownerTeamId,
      blockedTeamId: input.blockedTeamId,
      blockedTeamName: input.blockedTeamName.trim(),
      blockedKey: key,
      reason: input.reason,
      source: input.source ?? "MANUAL",
      createdBy: input.createdBy,
    },
  });
}

export async function removeBlacklistEntry(input: {
  ownerTeamId: number;
  id: string;
}): Promise<void> {
  await prisma.teamBlacklist.deleteMany({
    where: { id: input.id, ownerTeamId: input.ownerTeamId },
  });
}

/** Team ids hidden from `teamId` in the matchmaker (both directions). */
export async function getBlockedTeamIds(teamId: number): Promise<Set<number>> {
  const rows = await prisma.teamBlacklist.findMany({
    where: {
      blockedTeamId: { not: null },
      OR: [{ ownerTeamId: teamId }, { blockedTeamId: teamId }],
    },
    select: { ownerTeamId: true, blockedTeamId: true },
  });
  return buildBlockedTeamIdSet(rows, teamId);
}

/** True if either team has blacklisted the other (authoritative send gate). */
export async function areTeamsBlocked(a: number, b: number): Promise<boolean> {
  const row = await prisma.teamBlacklist.findFirst({
    where: {
      OR: [
        { ownerTeamId: a, blockedTeamId: b },
        { ownerTeamId: b, blockedTeamId: a },
      ],
    },
    select: { id: true },
  });
  return row != null;
}
