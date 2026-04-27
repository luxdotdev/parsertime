import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import prisma from "@/lib/prisma";
import { getPlayerTsrByBattletag } from "@/lib/tsr/lookup";
import type { HeroName } from "@/types/heroes";
import { Prisma } from "@prisma/client";

export type TeamTsrSource = "tsr" | "predicted" | "csr_fallback";
export type TeamTsrConfidence = "high" | "medium" | "low";

export type TeamTsrMember = {
  userId: string;
  name: string;
  battletag: string | null;
  tsr: number | null;
  compositeCsr: number | null;
  playtimeSeconds: number;
  playtimeWeight: number; // 0-1 share of total roster playtime
  contribution: number | null; // null when player has no signal at all
  contributionType: "tsr" | "predicted" | "csr" | "none";
};

export type TeamTsrResult = {
  value: number | null;
  source: TeamTsrSource;
  confidence: TeamTsrConfidence;
  rosterSize: number;
  ratedCount: number; // members with TSR
  contributingCount: number; // members with any signal AND playtime > 0
  playtimeBackedShare: number; // share of playtime carried by real-TSR members
  offsetStdev: number | null;
  members: TeamTsrMember[];
};

type TeamMember = {
  id: string;
  name: string | null;
  battletag: string | null;
};

// Empirical threshold for downgrading confidence on the predicted path.
// Tunable post-launch; the spec leaves the exact value open.
const PREDICTION_VARIANCE_THRESHOLD = 200;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const sq =
    values.reduce((s, v) => s + (v - avg) * (v - avg), 0) / values.length;
  return Math.sqrt(sq);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function battletagCandidates(member: TeamMember): string[] {
  const out = new Set<string>();
  if (member.battletag) {
    out.add(member.battletag);
    // FACEIT often stores just the prefix without the discriminator.
    const prefix = member.battletag.split("#")[0];
    if (prefix) out.add(prefix);
  }
  if (member.name) out.add(member.name);
  return [...out];
}

// In-game logs use the BattleTag prefix (no discriminator). Try the user's
// display name and every plausible BattleTag form so members whose
// User.name doesn't match their in-game handle still resolve.
function playerNameCandidates(member: TeamMember): string[] {
  const out = new Set<string>();
  for (const c of battletagCandidates(member)) {
    out.add(c.toLowerCase());
  }
  return [...out];
}

// Mean of the top two heroes' Raw CSR by playtime — the spec's
// "player composite CSR" used as the predictor input. Heroes are picked
// from the team's scrims so the predictor reflects the player's role on
// THIS team, not their main from elsewhere.
async function getPlayerCompositeCsr(
  candidates: string[],
  scrimIds: number[]
): Promise<number | null> {
  if (candidates.length === 0 || scrimIds.length === 0) return null;
  type HeroRow = {
    player_hero: string;
    player_name: string;
    total_time_played: bigint;
  };
  const heroes = await prisma.$queryRaw<HeroRow[]>`
    WITH final_rows AS (
      SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
        player_hero, player_name, hero_time_played
      FROM "PlayerStat"
      WHERE LOWER(player_name) IN (${Prisma.join(candidates)})
        AND "scrimId" IN (${Prisma.join(scrimIds)})
        AND hero_time_played > 0
      ORDER BY "MapDataId", player_name, player_hero, round_number DESC, id DESC
    )
    SELECT player_hero, player_name, SUM(hero_time_played) AS total_time_played
    FROM final_rows
    GROUP BY player_hero, player_name
    ORDER BY total_time_played DESC
    LIMIT 2
  `;
  if (heroes.length === 0) return null;
  const ratings: number[] = [];
  for (const h of heroes) {
    try {
      const row = await getCompositeSRLeaderboard({
        hero: h.player_hero as HeroName,
        player: h.player_name,
        limit: 300,
      });
      if (row?.composite_sr) ratings.push(row.composite_sr);
    } catch {
      // Skip heroes the player isn't placed on yet.
    }
  }
  if (ratings.length === 0) return null;
  return Math.round(mean(ratings));
}

type EnrichedMember = {
  userId: string;
  name: string;
  battletag: string | null;
  tsr: number | null;
  compositeCsr: number | null;
  playtimeSeconds: number;
};

async function getPlayerTotalPlaytime(
  candidates: string[],
  scrimIds: number[]
): Promise<number> {
  if (candidates.length === 0 || scrimIds.length === 0) return 0;
  type Row = { total_seconds: number | null };
  const rows = await prisma.$queryRaw<Row[]>`
    WITH final_rows AS (
      SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
        hero_time_played
      FROM "PlayerStat"
      WHERE LOWER(player_name) IN (${Prisma.join(candidates)})
        AND "scrimId" IN (${Prisma.join(scrimIds)})
        AND hero_time_played > 0
      ORDER BY "MapDataId", player_name, player_hero, round_number DESC, id DESC
    )
    SELECT COALESCE(SUM(hero_time_played), 0)::int AS total_seconds FROM final_rows
  `;
  return rows[0]?.total_seconds ?? 0;
}

async function enrichMember(
  member: TeamMember,
  scrimIds: number[]
): Promise<EnrichedMember> {
  const name = member.name ?? member.battletag ?? "";
  const nameCandidates = playerNameCandidates(member);
  const [tsrSnapshot, csr, playtime] = await Promise.all([
    getPlayerTsrByBattletag(battletagCandidates(member)),
    getPlayerCompositeCsr(nameCandidates, scrimIds),
    getPlayerTotalPlaytime(nameCandidates, scrimIds),
  ]);
  return {
    userId: member.id,
    name,
    battletag: member.battletag,
    tsr: tsrSnapshot?.rating ?? null,
    compositeCsr: csr,
    playtimeSeconds: playtime,
  };
}

function emptyResult(rosterSize: number): TeamTsrResult {
  return {
    value: null,
    source: "csr_fallback",
    confidence: "low",
    rosterSize,
    ratedCount: 0,
    contributingCount: 0,
    playtimeBackedShare: 0,
    offsetStdev: null,
    members: [],
  };
}

function weightedMean(
  pairs: { value: number; weight: number }[]
): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const p of pairs) {
    if (p.weight <= 0) continue;
    weighted += p.value * p.weight;
    totalWeight += p.weight;
  }
  if (totalWeight === 0) return null;
  return weighted / totalWeight;
}

export async function computeTeamTsr(
  members: TeamMember[],
  scrimIds: number[]
): Promise<TeamTsrResult> {
  if (members.length === 0) return emptyResult(0);

  const enriched = await Promise.all(
    members.map((m) => enrichMember(m, scrimIds))
  );
  const totalPlaytime = enriched.reduce((s, m) => s + m.playtimeSeconds, 0);

  // Compute team offset from members who have BOTH a real TSR and a CSR
  // signal. Used to predict TSR for unrostered scrim regulars on the team.
  const offsets = enriched
    .filter((m) => m.tsr !== null && m.compositeCsr !== null)
    .map((m) => m.tsr! - m.compositeCsr!);
  const teamOffset = offsets.length > 0 ? mean(offsets) : 0;
  const offsetStdev = offsets.length >= 2 ? stdev(offsets) : null;

  const ratedCount = enriched.filter((m) => m.tsr !== null).length;
  const playtimeBackedSeconds = enriched
    .filter((m) => m.tsr !== null)
    .reduce((s, m) => s + m.playtimeSeconds, 0);
  const playtimeBackedShare =
    totalPlaytime > 0 ? playtimeBackedSeconds / totalPlaytime : 0;

  // For each member, decide what their per-player contribution to the
  // team rating should be. The TSR/Predicted path is preferred whenever
  // the playtime backed by real TSRs is meaningful (>=60%) or when a
  // strong cohort (3+ real TSRs) makes prediction reliable. Below that,
  // we fall back to CSR-only on the same scale (not TSR-comparable).
  const useTsrPath =
    ratedCount >= 3 && (playtimeBackedShare >= 0.6 || ratedCount >= 4);

  const detail: TeamTsrMember[] = enriched.map((m) => {
    const playtimeWeight =
      totalPlaytime > 0 ? m.playtimeSeconds / totalPlaytime : 0;
    if (useTsrPath) {
      if (m.tsr !== null) {
        return {
          ...m,
          playtimeWeight,
          contribution: m.tsr,
          contributionType: "tsr",
        };
      }
      if (m.compositeCsr !== null) {
        return {
          ...m,
          playtimeWeight,
          contribution: Math.round(clamp(m.compositeCsr + teamOffset, 1, 5000)),
          contributionType: "predicted",
        };
      }
      return {
        ...m,
        playtimeWeight,
        contribution: null,
        contributionType: "none",
      };
    }
    // CSR fallback path: every player contributes their composite CSR.
    return {
      ...m,
      playtimeWeight,
      contribution: m.compositeCsr,
      contributionType: m.compositeCsr !== null ? "csr" : "none",
    };
  });

  const contributing = detail.filter(
    (m) => m.contribution !== null && m.playtimeSeconds > 0
  );
  const value = weightedMean(
    contributing.map((m) => ({
      value: m.contribution!,
      weight: m.playtimeSeconds,
    }))
  );

  let source: TeamTsrSource;
  let confidence: TeamTsrConfidence;
  if (!useTsrPath) {
    source = "csr_fallback";
    confidence = "low";
  } else if (
    ratedCount === enriched.filter((m) => m.playtimeSeconds > 0).length &&
    playtimeBackedShare >= 0.99
  ) {
    source = "tsr";
    confidence =
      offsetStdev !== null && offsetStdev > PREDICTION_VARIANCE_THRESHOLD
        ? "low"
        : "high";
  } else {
    source = "predicted";
    if (offsetStdev !== null && offsetStdev > PREDICTION_VARIANCE_THRESHOLD) {
      confidence = "low";
    } else if (playtimeBackedShare >= 0.8) {
      confidence = "high";
    } else if (playtimeBackedShare >= 0.6) {
      confidence = "medium";
    } else {
      confidence = "low";
    }
  }

  // Sort members by playtime descending so the heaviest contributors
  // surface first in the breakdown.
  detail.sort((a, b) => b.playtimeSeconds - a.playtimeSeconds);

  return {
    value: value !== null ? Math.round(value) : null,
    source,
    confidence,
    rosterSize: members.length,
    ratedCount,
    contributingCount: contributing.length,
    playtimeBackedShare,
    offsetStdev,
    members: detail,
  };
}
