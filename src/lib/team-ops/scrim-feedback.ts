import "server-only";
import prisma from "@/lib/prisma";
import { addBlacklistEntry } from "@/lib/team-ops/blacklist";
import {
  isScrimRequestLinkable,
  LINKAGE_WINDOW_DAYS,
} from "@/lib/team-ops/linkage";
import type { ScrimFeedbackVerdict } from "@prisma/client";

export type LinkableRequest = {
  scrimRequestId: string;
  opponentTeamId: number;
  opponentTeamName: string;
};

/** Recent requests this team could link a freshly-created scrim to. */
export async function getRecentLinkableRequests(
  teamId: number,
  now = new Date()
): Promise<LinkableRequest[]> {
  const since = new Date(now.getTime() - LINKAGE_WINDOW_DAYS * 24 * 3_600_000);
  const rows = await prisma.scrimRequest.findMany({
    where: {
      createdAt: { gte: since },
      OR: [{ fromTeamId: teamId }, { toTeamId: teamId }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fromTeamId: true,
      toTeamId: true,
      createdAt: true,
      fromTeam: { select: { id: true, name: true } },
      toTeam: { select: { id: true, name: true } },
    },
  });

  const seen = new Set<number>();
  const out: LinkableRequest[] = [];
  for (const r of rows) {
    if (!isScrimRequestLinkable({ request: r, teamId, now })) continue;
    const opponent = r.fromTeamId === teamId ? r.toTeam : r.fromTeam;
    if (seen.has(opponent.id)) continue; // most recent per opponent
    seen.add(opponent.id);
    out.push({
      scrimRequestId: r.id,
      opponentTeamId: opponent.id,
      opponentTeamName: opponent.name,
    });
  }
  return out;
}

/** Validate a creator-supplied link before persisting it onto the scrim. */
export async function resolveScrimLink(input: {
  teamId: number;
  scrimRequestId: string;
  opponentTeamId: number;
  now?: Date;
}): Promise<{ scrimRequestId: string; opponentTeamId: number } | null> {
  const req = await prisma.scrimRequest.findUnique({
    where: { id: input.scrimRequestId },
    select: { fromTeamId: true, toTeamId: true, createdAt: true },
  });
  if (!req) return null;
  if (
    !isScrimRequestLinkable({
      request: req,
      teamId: input.teamId,
      now: input.now ?? new Date(),
    })
  ) {
    return null;
  }
  const opponent = req.fromTeamId === input.teamId ? req.toTeamId : req.fromTeamId;
  if (opponent !== input.opponentTeamId) return null;
  return { scrimRequestId: input.scrimRequestId, opponentTeamId: opponent };
}

/** Write a verdict; BLACKLISTED also creates a POST_SCRIM blacklist row. */
export async function recordScrimFeedback(input: {
  scrimId: number;
  ownerTeamId: number;
  opponentTeamId: number;
  opponentTeamName: string;
  verdict: ScrimFeedbackVerdict;
  reason: string | null;
  userId: string;
}): Promise<void> {
  await prisma.scrimFeedback.upsert({
    where: { scrimId: input.scrimId },
    update: { verdict: input.verdict, createdBy: input.userId },
    create: {
      scrimId: input.scrimId,
      verdict: input.verdict,
      createdBy: input.userId,
    },
  });

  if (input.verdict === "BLACKLISTED") {
    await addBlacklistEntry({
      ownerTeamId: input.ownerTeamId,
      blockedTeamId: input.opponentTeamId,
      blockedTeamName: input.opponentTeamName,
      reason: input.reason,
      createdBy: input.userId,
      source: "POST_SCRIM",
    });
  }
}

/** Pending = scrim has opponentTeamId and no feedback row, for the given teams. */
export async function getPendingFeedbackCount(teamIds: number[]): Promise<number> {
  if (teamIds.length === 0) return 0;
  return prisma.scrim.count({
    where: {
      teamId: { in: teamIds },
      opponentTeamId: { not: null },
      feedback: null,
    },
  });
}
