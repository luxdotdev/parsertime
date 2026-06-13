import type {
  AttackDefenseSplit,
  FaceitMapAnalysis,
  FaceitRecommendation,
  FaceitRosterPlayer,
  FaceitTeamMapRow,
  FaceitTeamMatchRow,
  FaceitTeamOverview,
  HeroBanEnvironmentEntry,
  MapWinrateEntry,
  OverwatchPatchLite,
  PatchEra,
  RelatedTeam,
  RosterStrength,
} from "@/data/faceit/types";

export const MIN_SAMPLE = 4;
export const STARTER_SHARE = 0.5;
const HALF_LIFE_DAYS = 120;
const DECAY = Math.LN2 / HALF_LIFE_DAYS;

function pct(won: number, played: number): number {
  return played === 0 ? 0 : (won / played) * 100;
}

export function weightedWinRate(items: { won: boolean; ageDays: number }[]): number {
  let total = 0;
  let winW = 0;
  for (const it of items) {
    const w = Math.exp(-DECAY * Math.max(0, it.ageDays));
    total += w;
    if (it.won) winW += w;
  }
  return total === 0 ? 0 : (winW / total) * 100;
}

function ageDays(d: Date, now: number): number {
  return (now - d.getTime()) / (1000 * 60 * 60 * 24);
}

export function buildOverview(
  matches: FaceitTeamMatchRow[],
  now: number = Date.now()
): FaceitTeamOverview {
  const sorted = [...matches].sort(
    (a, b) => b.finishedAt.getTime() - a.finishedAt.getTime()
  );
  const wins = sorted.filter((m) => m.won).length;
  const totalMatches = sorted.length;
  const tierCounts: Record<string, number> = {};
  for (const m of sorted) tierCounts[m.tier] = (tierCounts[m.tier] ?? 0) + 1;
  return {
    totalMatches,
    wins,
    losses: totalMatches - wins,
    winRate: pct(wins, totalMatches),
    weightedWinRate: weightedWinRate(
      sorted.map((m) => ({ won: m.won, ageDays: ageDays(m.finishedAt, now) }))
    ),
    recentForm: sorted.slice(0, 10).map((m) => (m.won ? "win" : "loss")),
    tierCounts,
  };
}

function winrateEntries(
  rows: FaceitTeamMapRow[],
  keyOf: (r: FaceitTeamMapRow) => string | null,
  now: number
): MapWinrateEntry[] {
  const groups = new Map<string, FaceitTeamMapRow[]>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    const arr = groups.get(k) ?? [];
    arr.push(r);
    groups.set(k, arr);
  }
  const out: MapWinrateEntry[] = [];
  for (const [key, members] of groups) {
    const won = members.filter((m) => m.won).length;
    out.push({
      key,
      played: members.length,
      won,
      winRate: pct(won, members.length),
      weightedWinRate: weightedWinRate(
        members.map((m) => ({ won: m.won, ageDays: ageDays(m.finishedAt, now) }))
      ),
      rated: members.length >= MIN_SAMPLE,
    });
  }
  return out.sort((a, b) => b.played - a.played);
}

export function mapWinrates(
  rows: FaceitTeamMapRow[],
  now: number = Date.now()
): { byMap: MapWinrateEntry[]; byType: MapWinrateEntry[] } {
  return {
    byMap: winrateEntries(rows, (r) => r.mapName, now),
    byType: winrateEntries(rows, (r) => r.mapType, now),
  };
}

export function attackDefenseSplit(rows: FaceitTeamMapRow[]): AttackDefenseSplit {
  const atk = rows.filter((r) => r.attackedFirst === true);
  const def = rows.filter((r) => r.attackedFirst === false);
  const atkWon = atk.filter((r) => r.won).length;
  const defWon = def.filter((r) => r.won).length;
  return {
    attackPlayed: atk.length,
    attackWon: atkWon,
    attackWinRate: pct(atkWon, atk.length),
    defensePlayed: def.length,
    defenseWon: defWon,
    defenseWinRate: pct(defWon, def.length),
  };
}

export function heroBanEnvironment(
  rows: FaceitTeamMapRow[]
): HeroBanEnvironmentEntry[] {
  const heroes = new Set<string>();
  for (const r of rows) for (const h of r.heroBans) heroes.add(h);
  const out: HeroBanEnvironmentEntry[] = [];
  for (const hero of heroes) {
    const banned = rows.filter((r) => r.heroBans.includes(hero));
    const notBanned = rows.filter((r) => !r.heroBans.includes(hero));
    const bWon = banned.filter((r) => r.won).length;
    const nWon = notBanned.filter((r) => r.won).length;
    const bWr = pct(bWon, banned.length);
    const nWr = pct(nWon, notBanned.length);
    out.push({
      hero,
      bannedPlayed: banned.length,
      bannedWon: bWon,
      bannedWinRate: bWr,
      notBannedPlayed: notBanned.length,
      notBannedWon: nWon,
      notBannedWinRate: nWr,
      delta: nWr - bWr,
      rated: banned.length >= MIN_SAMPLE && notBanned.length >= MIN_SAMPLE,
    });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function meanOrNull(xs: number[]): number | null {
  return xs.length === 0 ? null : Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
}

export function rosterStrength(roster: FaceitRosterPlayer[]): RosterStrength {
  const starters = roster.filter((p) => p.starter);
  const fsrs = starters.map((p) => p.fsr).filter((v): v is number => v != null);
  const tsrs = starters.map((p) => p.tsr).filter((v): v is number => v != null);
  return {
    fsr: meanOrNull(fsrs),
    tsr: meanOrNull(tsrs),
    fsrCovered: fsrs.length,
    tsrCovered: tsrs.length,
    rosterSize: roster.length,
  };
}

export function rankRelatedTeams(related: RelatedTeam[]): RelatedTeam[] {
  return [...related].sort(
    (a, b) =>
      b.sharedCorePlayers - a.sharedCorePlayers || b.matchCount - a.matchCount
  );
}

export function buildRecommendations(input: {
  byMap: MapWinrateEntry[];
  heroBanEnvironment: HeroBanEnvironmentEntry[];
}): FaceitRecommendation[] {
  const recs: FaceitRecommendation[] = [];
  const ratedMaps = input.byMap.filter((m) => m.rated);
  const weakest = [...ratedMaps].sort((a, b) => a.weightedWinRate - b.weightedWinRate).slice(0, 3);
  const strongest = [...ratedMaps].sort((a, b) => b.weightedWinRate - a.weightedWinRate).slice(0, 3);
  for (const m of weakest) {
    recs.push({
      kind: "map_pick",
      subject: m.key,
      metric: m.weightedWinRate,
      sample: m.played,
      winRate: m.winRate,
      played: m.played,
    });
  }
  for (const m of strongest) {
    recs.push({
      kind: "map_avoid",
      subject: m.key,
      metric: m.weightedWinRate,
      sample: m.played,
      winRate: m.winRate,
      played: m.played,
    });
  }
  const ratedBans = input.heroBanEnvironment.filter((h) => h.rated);
  const banThese = [...ratedBans].sort((a, b) => b.delta - a.delta).slice(0, 3).filter((h) => h.delta > 0);
  const dontBan = [...ratedBans].sort((a, b) => a.delta - b.delta).slice(0, 3).filter((h) => h.delta < 0);
  for (const h of banThese) {
    recs.push({
      kind: "ban_hero",
      subject: h.hero,
      metric: h.delta,
      sample: Math.min(h.bannedPlayed, h.notBannedPlayed),
      bannedWinRate: h.bannedWinRate,
      notBannedWinRate: h.notBannedWinRate,
      bannedSample: h.bannedPlayed,
      notBannedSample: h.notBannedPlayed,
    });
  }
  for (const h of dontBan) {
    recs.push({
      kind: "do_not_ban_hero",
      subject: h.hero,
      metric: h.delta,
      sample: Math.min(h.bannedPlayed, h.notBannedPlayed),
      bannedWinRate: h.bannedWinRate,
      notBannedWinRate: h.notBannedWinRate,
      bannedSample: h.bannedPlayed,
      notBannedSample: h.notBannedPlayed,
    });
  }
  return recs;
}

const TIMELINE_TOP_BANS = 3;

/**
 * Bucket a team's matches into patch windows and report record + most-banned
 * heroes per window. Patch dates are the window boundaries; matches before the
 * earliest tracked patch fall into a single "pre" bucket. Returns eras
 * chronologically (pre first, then patches ascending) for those with matches.
 * Winrate is per-match; ban tallies are per-map.
 */
export function buildPatchTimeline(
  matchRows: FaceitTeamMatchRow[],
  mapRows: FaceitTeamMapRow[],
  patches: OverwatchPatchLite[]
): PatchEra[] {
  const sorted = [...patches].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Index of the latest patch active at date d, or -1 (pre-tracking).
  function eraIndexFor(d: Date): number {
    const t = d.getTime();
    let idx = -1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].date.getTime() <= t) idx = i;
      else break;
    }
    return idx;
  }

  type Acc = { matches: number; wins: number; bans: Map<string, number> };
  const byEra = new Map<number, Acc>();
  function acc(i: number): Acc {
    let a = byEra.get(i);
    if (!a) {
      a = { matches: 0, wins: 0, bans: new Map() };
      byEra.set(i, a);
    }
    return a;
  }

  for (const m of matchRows) {
    const a = acc(eraIndexFor(m.finishedAt));
    a.matches += 1;
    if (m.won) a.wins += 1;
  }
  for (const mr of mapRows) {
    const a = acc(eraIndexFor(mr.finishedAt));
    for (const hero of mr.heroBans) {
      a.bans.set(hero, (a.bans.get(hero) ?? 0) + 1);
    }
  }

  return [...byEra.keys()]
    .sort((a, b) => a - b)
    .map((i) => {
      const a = byEra.get(i);
      if (!a || a.matches === 0) return null;
      const patch = i >= 0 ? sorted[i] : null;
      const next = i >= 0 && i + 1 < sorted.length ? sorted[i + 1] : null;
      const topBans = [...a.bans.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, TIMELINE_TOP_BANS)
        .map(([hero, count]) => ({ hero, count }));
      return {
        key: patch ? patch.id : "pre",
        patchType:
          patch?.type === "SEASON" || patch?.type === "MID_SEASON"
            ? patch.type
            : null,
        name: patch?.name ?? "",
        startDate: patch ? patch.date : null,
        endDate: next ? next.date : null,
        matches: a.matches,
        wins: a.wins,
        winRate: pct(a.wins, a.matches),
        rated: a.matches >= MIN_SAMPLE,
        topBans,
      } satisfies PatchEra;
    })
    .filter((e): e is PatchEra => e !== null);
}

export type { FaceitMapAnalysis };
