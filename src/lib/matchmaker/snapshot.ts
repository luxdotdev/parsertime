import prisma from "@/lib/prisma";
import { computeTeamTsr } from "@/lib/tsr/team";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import { getPlayerTsrByBattletag } from "@/lib/tsr/lookup";
import {
  FaceitTier,
  TeamTsrConfidence,
  TeamTsrSource,
  TsrRegion,
} from "@prisma/client";

const SOURCE_TO_PRISMA: Record<
  "tsr" | "predicted" | "csr_fallback",
  TeamTsrSource
> = {
  tsr: TeamTsrSource.TSR,
  predicted: TeamTsrSource.PREDICTED,
  csr_fallback: TeamTsrSource.CSR_FALLBACK,
};

const CONFIDENCE_TO_PRISMA: Record<
  "high" | "medium" | "low",
  TeamTsrConfidence
> = {
  high: TeamTsrConfidence.HIGH,
  medium: TeamTsrConfidence.MEDIUM,
  low: TeamTsrConfidence.LOW,
};

// Region is the modal FaceitPlayer.region across the team's rated members.
// NA wins ties so North American teams aren't stranded in OTHER when the
// roster is exactly half EMEA-registered.
async function deriveRegion(
  battletags: (string | null)[]
): Promise<TsrRegion> {
  const tally: Record<TsrRegion, number> = {
    [TsrRegion.NA]: 0,
    [TsrRegion.EMEA]: 0,
    [TsrRegion.OTHER]: 0,
  };
  for (const tag of battletags) {
    const snap = await getPlayerTsrByBattletag([tag]);
    if (snap) tally[snap.region] += 1;
  }
  const max = Math.max(tally.NA, tally.EMEA, tally.OTHER);
  if (max === 0) return TsrRegion.OTHER;
  if (tally.NA === max) return TsrRegion.NA;
  if (tally.EMEA === max) return TsrRegion.EMEA;
  return TsrRegion.OTHER;
}

export async function upsertTeamTsrSnapshot(teamId: number): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      readonly: true,
      users: { select: { id: true, name: true, battletag: true } },
      scrims: { select: { id: true } },
    },
  });
  if (!team) return;

  // Read-only teams are archival — exclude from matchmaker entirely. Prune
  // any pre-existing snapshot row so a team flipped to read-only stops
  // appearing in candidate pools on the next recompute.
  if (team.readonly) {
    await prisma.teamTsrSnapshot.deleteMany({ where: { teamId } });
    return;
  }

  const result = await computeTeamTsr(
    team.users.map((u) => ({
      id: u.id,
      name: u.name,
      battletag: u.battletag,
    })),
    team.scrims.map((s) => s.id)
  );

  // csr_fallback teams are not discoverable — drop any existing row.
  if (result.source === "csr_fallback" || result.value === null) {
    await prisma.teamTsrSnapshot.deleteMany({ where: { teamId } });
    return;
  }

  const bucket = getTierBucket(result.value);
  const region = await deriveRegion(team.users.map((u) => u.battletag));

  await prisma.teamTsrSnapshot.upsert({
    where: { teamId },
    create: {
      teamId,
      rating: result.value,
      source: SOURCE_TO_PRISMA[result.source],
      confidence: CONFIDENCE_TO_PRISMA[result.confidence],
      bracketTier: bucket.tier === FaceitTier.UNCLASSIFIED ? FaceitTier.OPEN : bucket.tier,
      bracketBand: bucket.band,
      region,
      rosterSize: result.rosterSize,
      ratedCount: result.ratedCount,
      playtimeBackedShare: result.playtimeBackedShare,
      computedAt: new Date(),
    },
    update: {
      rating: result.value,
      source: SOURCE_TO_PRISMA[result.source],
      confidence: CONFIDENCE_TO_PRISMA[result.confidence],
      bracketTier: bucket.tier === FaceitTier.UNCLASSIFIED ? FaceitTier.OPEN : bucket.tier,
      bracketBand: bucket.band,
      region,
      rosterSize: result.rosterSize,
      ratedCount: result.ratedCount,
      playtimeBackedShare: result.playtimeBackedShare,
      computedAt: new Date(),
    },
  });
}

export async function recomputeAllTeamTsrSnapshots(): Promise<{
  written: number;
  cleared: number;
}> {
  const teams = await prisma.team.findMany({ select: { id: true } });
  let written = 0;
  let cleared = 0;
  for (const t of teams) {
    const before = await prisma.teamTsrSnapshot.findUnique({
      where: { teamId: t.id },
    });
    await upsertTeamTsrSnapshot(t.id);
    const after = await prisma.teamTsrSnapshot.findUnique({
      where: { teamId: t.id },
    });
    if (after) written += 1;
    else if (before) cleared += 1;
  }
  return { written, cleared };
}
