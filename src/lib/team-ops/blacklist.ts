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

export type BlacklistSuggestion = { teamId: number; name: string; image: string | null };

export async function getBlacklistSuggestions(
  ownerTeamId: number
): Promise<BlacklistSuggestion[]> {
  const [snapshots, requests, existing] = await Promise.all([
    prisma.teamTsrSnapshot.findMany({
      where: { teamId: { not: ownerTeamId }, team: { readonly: false } },
      select: { team: { select: { id: true, name: true, image: true } } },
    }),
    prisma.scrimRequest.findMany({
      where: { OR: [{ fromTeamId: ownerTeamId }, { toTeamId: ownerTeamId }] },
      select: {
        fromTeam: { select: { id: true, name: true, image: true } },
        toTeam: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.teamBlacklist.findMany({
      where: { ownerTeamId, blockedTeamId: { not: null } },
      select: { blockedTeamId: true },
    }),
  ]);

  const blocked = new Set(existing.map((e) => e.blockedTeamId).filter((x): x is number => x !== null));
  const byId = new Map<number, BlacklistSuggestion>();
  function add(t: { id: number; name: string; image: string | null }) {
    if (t.id === ownerTeamId || blocked.has(t.id) || byId.has(t.id)) return;
    byId.set(t.id, { teamId: t.id, name: t.name, image: t.image });
  }
  for (const s of snapshots) add(s.team);
  for (const r of requests) {
    if (r.fromTeam.id !== ownerTeamId) add(r.fromTeam);
    if (r.toTeam.id !== ownerTeamId) add(r.toTeam);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
