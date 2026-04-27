import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import prisma from "@/lib/prisma";
import { getPlayerTsrByBattletag } from "@/lib/tsr/lookup";
import type { HeroName } from "@/types/heroes";

export type TeamTsrSource = "tsr" | "predicted" | "csr_fallback";
export type TeamTsrConfidence = "high" | "medium" | "low";

export type TeamTsrStarter = {
  userId: string;
  name: string;
  battletag: string | null;
  tsr: number | null;
  compositeCsr: number | null;
  contribution: number;
  contributionType: "tsr" | "predicted" | "csr";
};

export type TeamTsrResult = {
  value: number | null;
  source: TeamTsrSource;
  confidence: TeamTsrConfidence;
  starterCount: number;
  realTsrCount: number;
  rosterSize: number;
  offsetStdev: number | null;
  starters: TeamTsrStarter[];
};

type TeamMember = {
  id: string;
  name: string | null;
  battletag: string | null;
};

const STARTING_ROSTER_SIZE = 5;
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
  const sq = values.reduce((s, v) => s + (v - avg) * (v - avg), 0) / values.length;
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

// Mean of the top two heroes' Raw CSR by playtime — the spec's
// "player composite CSR" used as the predictor input.
async function getPlayerCompositeCsr(
  playerName: string
): Promise<number | null> {
  type HeroRow = { player_hero: string; total_time_played: bigint };
  const heroes = await prisma.$queryRaw<HeroRow[]>`
    WITH final_rows AS (
      SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
        player_hero, hero_time_played
      FROM "PlayerStat"
      WHERE player_name ILIKE ${playerName} AND hero_time_played > 0
      ORDER BY "MapDataId", player_name, player_hero, round_number DESC, id DESC
    )
    SELECT player_hero, SUM(hero_time_played) AS total_time_played
    FROM final_rows
    GROUP BY player_hero
    ORDER BY total_time_played DESC
    LIMIT 2
  `;
  if (heroes.length === 0) return null;
  const ratings: number[] = [];
  for (const h of heroes) {
    try {
      const row = await getCompositeSRLeaderboard({
        hero: h.player_hero as HeroName,
        player: playerName,
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
};

async function enrichMember(member: TeamMember): Promise<EnrichedMember> {
  const name = member.name ?? member.battletag ?? "";
  const [tsrSnapshot, csr] = await Promise.all([
    getPlayerTsrByBattletag(battletagCandidates(member)),
    name ? getPlayerCompositeCsr(name) : Promise.resolve(null),
  ]);
  return {
    userId: member.id,
    name,
    battletag: member.battletag,
    tsr: tsrSnapshot?.rating ?? null,
    compositeCsr: csr,
  };
}

export async function computeTeamTsr(
  members: TeamMember[]
): Promise<TeamTsrResult> {
  if (members.length === 0) {
    return {
      value: null,
      source: "csr_fallback",
      confidence: "low",
      starterCount: 0,
      realTsrCount: 0,
      rosterSize: 0,
      offsetStdev: null,
      starters: [],
    };
  }

  const enriched = await Promise.all(members.map(enrichMember));

  // Pick up to 5 starters, sorted by best available rating signal so the
  // strongest five represent the team. Smaller rosters use what's there.
  const ranked = enriched.slice().sort((a, b) => {
    const ar = a.tsr ?? a.compositeCsr ?? 0;
    const br = b.tsr ?? b.compositeCsr ?? 0;
    return br - ar;
  });
  const starters = ranked.slice(0, STARTING_ROSTER_SIZE);
  const realTsrCount = starters.filter((s) => s.tsr !== null).length;

  // Path 1: 3+ real TSRs → use real values, predict the missing ones.
  if (realTsrCount >= 3) {
    const offsets = starters
      .filter((s) => s.tsr !== null && s.compositeCsr !== null)
      .map((s) => s.tsr! - s.compositeCsr!);
    const teamOffset = offsets.length > 0 ? mean(offsets) : 0;
    const offsetStdev = offsets.length >= 2 ? stdev(offsets) : null;

    const detail: TeamTsrStarter[] = starters.map((s) => {
      if (s.tsr !== null) {
        return {
          ...s,
          contribution: s.tsr,
          contributionType: "tsr",
        };
      }
      if (s.compositeCsr !== null) {
        return {
          ...s,
          contribution: Math.round(
            clamp(s.compositeCsr + teamOffset, 1, 5000)
          ),
          contributionType: "predicted",
        };
      }
      // No data at all for this player; fall back to the team mean of
      // available signals so they don't pull the average to zero.
      const fallback =
        teamOffset !== 0 ? Math.round(clamp(2500 + teamOffset, 1, 5000)) : 2500;
      return {
        ...s,
        contribution: fallback,
        contributionType: "predicted",
      };
    });

    const value = Math.round(mean(detail.map((d) => d.contribution)));
    let confidence: TeamTsrConfidence = realTsrCount >= 4 ? "high" : "medium";
    if (
      offsetStdev !== null &&
      offsetStdev > PREDICTION_VARIANCE_THRESHOLD
    ) {
      confidence = "low";
    }

    return {
      value,
      source: realTsrCount === starters.length ? "tsr" : "predicted",
      confidence,
      starterCount: starters.length,
      realTsrCount,
      rosterSize: members.length,
      offsetStdev,
      starters: detail,
    };
  }

  // Path 2: 0-2 real TSRs → CSR fallback (not comparable to TSR scale).
  const csrDetail: TeamTsrStarter[] = starters
    .filter((s) => s.compositeCsr !== null)
    .map((s) => ({
      ...s,
      contribution: s.compositeCsr!,
      contributionType: "csr",
    }));
  const csrValue =
    csrDetail.length > 0
      ? Math.round(mean(csrDetail.map((d) => d.contribution)))
      : null;
  return {
    value: csrValue,
    source: "csr_fallback",
    confidence: "low",
    starterCount: starters.length,
    realTsrCount,
    rosterSize: members.length,
    offsetStdev: null,
    starters: csrDetail.length > 0
      ? csrDetail
      : starters.map((s) => ({
          ...s,
          contribution: 0,
          contributionType: "csr",
        })),
  };
}
