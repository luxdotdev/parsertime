#!/usr/bin/env bun
/**
 * TSR (Tournament Skill Rating) dry-run.
 *
 * Pulls real FACEIT data for a seed player + opponents, replays the rating
 * algorithm in-memory, and prints per-player TSRs alongside the matches that
 * moved them most. No DB writes, no schema changes.
 *
 * Usage:
 *   FACEIT_API_KEY=xxx bun scripts/tsr-dry-run.ts [seed-nickname]
 *
 * Default seed nickname is "pge". Cached responses live in /tmp/parsertime-tsr-cache.
 * Delete that directory to force fresh fetches.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FACEIT_BASE = "https://open.faceit.com/data/v4";
const API_KEY = process.env.FACEIT_API_KEY;
if (!API_KEY) {
  console.error("FACEIT_API_KEY env var is required");
  process.exit(1);
}

const CACHE_DIR = "/tmp/parsertime-tsr-cache";
mkdirSync(CACHE_DIR, { recursive: true });

const TRACKED_ORGANIZERS = new Set([
  "faceit_ow2", // Overdrive Cup, WASB Cup, FACEIT-run cups
  "abd401de-e6ec-4ef1-8d4b-3d820f8f62ce", // OWCS 2024 (NA + EMEA stages)
  "f0e8a591-08fd-4619-9d59-d97f0571842e", // FACEIT Master league + OWCS Central S1-S8 + 2026 OQ
  "37d7c27f-ddb7-4c2c-91d5-771cfe3376cd", // Calling All Heroes
]);

type Tier =
  | "open"
  | "advanced"
  | "expert"
  | "masters"
  | "owcs"
  | "cah"
  | "unclassified";

const TIER_PRIORS: Record<Tier, number> = {
  unclassified: 2500,
  open: 2500,
  advanced: 2800,
  expert: 3100,
  masters: 3450,
  owcs: 3850,
  cah: 2500, // CAH explicitly does not have a tier prior; falls back to mean
};

const TIER_RANK: Record<Tier, number> = {
  unclassified: 0,
  open: 1,
  cah: 1,
  advanced: 2,
  expert: 3,
  masters: 4,
  owcs: 5,
};

// Bumped from spec default of 180. With 180d half-life, 2-year-old OWCS data
// weighs ~6%, which means historical anchor wins barely move the rating and
// inactive players cling to their priors. 365d half-life keeps 2024 matches
// at ~25% weight — historical results still pull active players upward.
const RECENCY_HALF_LIFE_DAYS = 365;
// Display floor: a player must have at least this many tracked matches in the
// last DISPLAY_ACTIVITY_WINDOW_DAYS to appear in the active leaderboard.
// Inactive players still have a computed rating; we just don't surface them.
const DISPLAY_MIN_RECENT_MATCHES = 3;
const DISPLAY_ACTIVITY_WINDOW_DAYS = 365;
const SOFT_CAP_START = 4000;
const HARD_CEILING = 5000;
const HARD_FLOOR = 1;

const SEED_NICKNAME = process.argv[2] ?? "pge";
const HISTORY_PAGE_LIMIT = 100;
const MAX_HISTORY_PAGES = 20;
const OPPONENT_FANOUT = 12; // additional players pulled from seed's match history
const FETCH_DELAY_MS = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, "_")}.json`);
}

async function faceit<T>(path: string, cacheKey?: string): Promise<T> {
  const key = cacheKey ?? path;
  const cp = cachePath(key);
  if (existsSync(cp)) {
    return JSON.parse(readFileSync(cp, "utf-8")) as T;
  }
  await sleep(FETCH_DELAY_MS);
  const res = await fetch(`${FACEIT_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FACEIT ${res.status} ${path}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as T;
  writeFileSync(cp, JSON.stringify(json));
  return json;
}

function classifyTier(name: string | undefined): Tier {
  if (!name) return "unclassified";
  const n = name.toLowerCase();
  // OW2 is 5v5; reject mini formats (1v1/2v2/3v3 duels and brawl learnings)
  // which run under the literal "faceit" organizer and would skew Elo wildly.
  if (
    /\b1v1\b|\b2v2\b|\b3v3\b|brawl vs brawl|\belimination\b|mini-poke|knight & squire|trial event/.test(
      n
    )
  ) {
    return "unclassified";
  }
  // OWCS umbrella — distinguish open qualifier paths from real OWCS play.
  // S4-S8 "OWCS Central - Regular Season/Playoffs" → owcs (top NA league).
  // OWCS 2024 Stage X Open Qualifiers / OWCS 202X Open Qualifier / OQ Phase → open.
  // OWWC (Overwatch World Cup) is also OWCS-tier prestige.
  if (/owcs|champions series|\bowwc\b/.test(n)) {
    if (/open\s*qualif|\boq\b|\bqualifier\b/.test(n)) return "open";
    return "owcs";
  }
  if (/master/.test(n)) return "masters";
  if (/expert/.test(n)) return "expert";
  if (/advanced/.test(n)) return "advanced";
  if (/calling all heroes|\bcah\b/.test(n)) return "cah";
  // FACEIT cups + generic open / qualifier.
  if (/open|qualif|cup|showdown/.test(n)) return "open";
  return "unclassified";
}

function inferRegion(
  name: string | undefined,
  faceitRegion: string | undefined
): "NA" | "EMEA" | "OTHER" {
  const n = (name ?? "").toLowerCase();
  if (/\bna\b|north america|americas/.test(n)) return "NA";
  if (/\bemea\b|\beu\b|europe/.test(n)) return "EMEA";
  if (faceitRegion === "US") return "NA";
  if (faceitRegion === "EU") return "EMEA";
  return "OTHER";
}

function kBase(matchCount: number): number {
  if (matchCount < 5) return 48;
  if (matchCount < 15) return 32;
  if (matchCount < 30) return 24;
  return 16;
}

function movMultiplier(bestOf: number, scoreA: number, scoreB: number): number {
  const maxDiff = Math.ceil(bestOf / 2);
  if (maxDiff <= 0) return 1;
  const actualDiff = Math.abs(scoreA - scoreB);
  const closeness = (maxDiff - actualDiff) / maxDiff;
  return 1.5 - closeness;
}

function gainDampener(rating: number, deltaSign: number): number {
  if (deltaSign <= 0) return 1;
  if (rating <= SOFT_CAP_START) return 1;
  const x = (rating - SOFT_CAP_START) / 1000;
  return Math.max(0, 1 - x * x);
}

function recencyWeight(ageDays: number): number {
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

interface FaceitPlayerLookup {
  player_id: string;
  nickname: string;
  country?: string;
  games?: Record<
    string,
    { game_player_id?: string; game_player_name?: string; region?: string }
  >;
}

interface HistoryItem {
  match_id: string;
  game_id?: string;
  competition_id?: string;
  competition_type?: string; // "championship" | "matchmaking" | "hub"
  competition_name?: string;
  organizer_id?: string;
  status?: string;
  finished_at?: number;
  started_at?: number;
}

interface HistoryResponse {
  items: HistoryItem[];
  start: number;
  end: number;
}

interface MatchDetail {
  match_id: string;
  competition_id?: string;
  competition_type?: string;
  competition_name?: string;
  organizer_id?: string;
  region?: string;
  status: string;
  best_of?: number;
  finished_at?: number;
  started_at?: number;
  results?: {
    winner?: string;
    score?: { faction1?: number; faction2?: number };
  };
  teams?: {
    faction1?: {
      name?: string;
      roster?: Array<{ player_id: string; nickname: string }>;
    };
    faction2?: {
      name?: string;
      roster?: Array<{ player_id: string; nickname: string }>;
    };
  };
}

interface SearchPlayerItem {
  player_id: string;
  nickname: string;
  country?: string;
  verified?: boolean;
  games?: Array<{ name: string; skill_level?: string | number }>;
}

interface SearchPlayersResponse {
  items: SearchPlayerItem[];
}

async function lookupPlayer(query: string): Promise<FaceitPlayerLookup> {
  // If the query is exact and matches a real FACEIT nickname, this 200s.
  // For pros whose FACEIT handle differs from their in-game name, this 404s
  // and we fall through to fuzzy search.
  try {
    return await faceit<FaceitPlayerLookup>(
      `/players?nickname=${encodeURIComponent(query)}&game=ow2`,
      `player_lookup_${query}`
    );
  } catch (err) {
    if (!String(err).includes("404")) throw err;
  }

  const search = await faceit<SearchPlayersResponse>(
    `/search/players?nickname=${encodeURIComponent(query)}&game=ow2&offset=0&limit=20`,
    `player_search_${query}`
  );
  const ow2Candidates = search.items.filter((p) =>
    p.games?.some((g) => g.name === "ow2")
  );
  if (ow2Candidates.length === 0) {
    throw new Error(
      `No OW2-bound FACEIT player found for "${query}". Search returned ${search.items.length} total candidates.`
    );
  }

  // Rank: verified first, then by OW2 skill level desc.
  const ranked = ow2Candidates.slice().sort((a, b) => {
    if (!!b.verified !== !!a.verified) return b.verified ? 1 : -1;
    const sa = Number(a.games?.find((g) => g.name === "ow2")?.skill_level ?? 0);
    const sb = Number(b.games?.find((g) => g.name === "ow2")?.skill_level ?? 0);
    return sb - sa;
  });

  console.log(
    `  (no exact match; search returned ${ow2Candidates.length} OW2 candidates):`
  );
  for (const c of ranked.slice(0, 5)) {
    const sl = c.games?.find((g) => g.name === "ow2")?.skill_level ?? "?";
    const v = c.verified ? "✓" : " ";
    console.log(
      `    ${v} ${c.nickname.padEnd(20)} ${c.player_id}  country=${c.country ?? "?"}  skill=${sl}`
    );
  }
  const picked = ranked[0]!;
  console.log(`  picking top: ${picked.nickname}`);
  return faceit<FaceitPlayerLookup>(
    `/players/${picked.player_id}`,
    `player_${picked.player_id}`
  );
}

async function getPlayerHistory(playerId: string): Promise<HistoryItem[]> {
  const all: HistoryItem[] = [];
  for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
    const offset = page * HISTORY_PAGE_LIMIT;
    const data = await faceit<HistoryResponse>(
      `/players/${playerId}/history?game=ow2&offset=${offset}&limit=${HISTORY_PAGE_LIMIT}`,
      `history_${playerId}_${offset}`
    );
    if (!data.items?.length) break;
    all.push(...data.items);
    if (data.items.length < HISTORY_PAGE_LIMIT) break;
  }
  return all;
}

async function getMatch(matchId: string): Promise<MatchDetail> {
  return faceit<MatchDetail>(`/matches/${matchId}`, `match_${matchId}`);
}

interface RatedMatch {
  match_id: string;
  finished_at: number; // unix seconds
  championship_id: string;
  championship_name: string;
  tier: Tier;
  region: "NA" | "EMEA" | "OTHER";
  best_of: number;
  score: [number, number]; // faction1, faction2
  winner_faction: 1 | 2;
  faction1: string[]; // player_ids
  faction2: string[]; // player_ids
  status: "finished";
}

interface PlayerState {
  player_id: string;
  nickname: string;
  region: "NA" | "EMEA" | "OTHER";
  rating: number;
  match_count: number;
  first_tier?: Tier;
  contributions: Array<{
    match_id: string;
    delta: number;
    opp_rating: number;
    won: boolean;
    finished_at: number;
    tier: Tier;
    score: [number, number];
  }>;
}

async function main() {
  console.log(`\n=== TSR dry-run · seed "${SEED_NICKNAME}" ===\n`);

  // 1. Look up seed player.
  console.log(`[1/5] Looking up seed player…`);
  const seed = await lookupPlayer(SEED_NICKNAME);
  console.log(
    `  ${seed.nickname} (player_id=${seed.player_id}, country=${seed.country ?? "?"})`
  );
  const ow2 = seed.games?.ow2;
  if (ow2) {
    console.log(
      `  BattleTag: ${ow2.game_player_id ?? "?"}  region: ${ow2.region ?? "?"}`
    );
  }

  // 2. Pull seed's full match history → fetch full match details for every
  // championship-type match. We classify tier and verify organizer from the
  // match detail itself (which carries competition_name and organizer_id),
  // bypassing /championships/{id} entirely — that endpoint 404s for many
  // active and archived events.
  console.log(`\n[2/5] Fetching seed match history & details…`);
  const seedHistory = await getPlayerHistory(seed.player_id);
  const seedChampMatches = seedHistory.filter(
    (m) => m.competition_type === "championship"
  );
  console.log(
    `  ${seedHistory.length} total matches, ${seedChampMatches.length} championship-type`
  );
  const matchDetails = new Map<string, MatchDetail>();
  for (const m of seedChampMatches) {
    try {
      const md = await getMatch(m.match_id);
      matchDetails.set(m.match_id, md);
    } catch (err) {
      console.warn(
        `  ! match ${m.match_id} fetch failed: ${(err as Error).message}`
      );
    }
  }

  // 3. Co-occurrence-based opponent fanout.
  console.log(`\n[3/5] Expanding to opponents (1 hop)…`);
  const opponentCounts = new Map<string, { nickname: string; count: number }>();
  for (const md of matchDetails.values()) {
    const roster = [
      ...(md.teams?.faction1?.roster ?? []),
      ...(md.teams?.faction2?.roster ?? []),
    ];
    for (const r of roster) {
      if (r.player_id === seed.player_id) continue;
      const cur = opponentCounts.get(r.player_id) ?? {
        nickname: r.nickname,
        count: 0,
      };
      cur.count += 1;
      cur.nickname = r.nickname;
      opponentCounts.set(r.player_id, cur);
    }
  }
  const opponents = [...opponentCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, OPPONENT_FANOUT);
  for (const [pid, info] of opponents) {
    console.log(
      `    - ${info.nickname.padEnd(24)} ${pid}  (${info.count} co-matches w/ seed)`
    );
  }
  for (const [pid, info] of opponents) {
    const hist = await getPlayerHistory(pid);
    const champMatches = hist.filter(
      (m) => m.competition_type === "championship"
    );
    let added = 0;
    for (const m of champMatches) {
      if (matchDetails.has(m.match_id)) continue;
      try {
        const md = await getMatch(m.match_id);
        matchDetails.set(m.match_id, md);
        added += 1;
      } catch {
        /* ignore */
      }
    }
    console.log(
      `    + ${info.nickname.padEnd(24)} pulled ${added} new champ matches`
    );
  }
  console.log(
    `  total championship-type matches in pool: ${matchDetails.size}`
  );

  // 4. Filter to tracked organizer + classifiable tier; build rated-match list.
  console.log(`\n[4/5] Classifying & filtering matches…`);
  const ratedMatches: RatedMatch[] = [];
  let skippedForfeits = 0;
  let skippedUntracked = 0;
  let skippedUnclassified = 0;
  let skippedMissingData = 0;
  const tierBuckets = new Map<Tier, number>();
  for (const md of matchDetails.values()) {
    if (md.status !== "FINISHED" && md.status !== "finished") {
      skippedForfeits += 1;
      continue;
    }
    if (!md.organizer_id || !TRACKED_ORGANIZERS.has(md.organizer_id)) {
      skippedUntracked += 1;
      continue;
    }
    const tier = classifyTier(md.competition_name);
    if (tier === "unclassified") {
      skippedUnclassified += 1;
      continue;
    }
    const f1 = md.teams?.faction1?.roster?.map((r) => r.player_id) ?? [];
    const f2 = md.teams?.faction2?.roster?.map((r) => r.player_id) ?? [];
    const s1 = md.results?.score?.faction1;
    const s2 = md.results?.score?.faction2;
    const winner = md.results?.winner;
    if (
      f1.length === 0 ||
      f2.length === 0 ||
      s1 === undefined ||
      s2 === undefined ||
      !winner ||
      !md.finished_at
    ) {
      skippedMissingData += 1;
      continue;
    }
    const winnerFaction: 1 | 2 = winner === "faction1" ? 1 : 2;
    const bestOf = md.best_of ?? Math.max(s1 + s2, 3);
    const region = inferRegion(md.competition_name, md.region);
    ratedMatches.push({
      match_id: md.match_id,
      finished_at: md.finished_at,
      championship_id: md.competition_id ?? "",
      championship_name: md.competition_name ?? "?",
      tier,
      region,
      best_of: bestOf,
      score: [s1, s2],
      winner_faction: winnerFaction,
      faction1: f1,
      faction2: f2,
      status: "finished",
    });
    tierBuckets.set(tier, (tierBuckets.get(tier) ?? 0) + 1);
  }
  ratedMatches.sort((a, b) => a.finished_at - b.finished_at);
  console.log(
    `  → ${ratedMatches.length} usable matches; skipped ${skippedForfeits} forfeits, ${skippedUntracked} untracked-org, ${skippedUnclassified} unclassified, ${skippedMissingData} with missing data`
  );
  console.log(`  tier mix:`, Object.fromEntries(tierBuckets));

  console.log(
    `\n[5/5] Replaying ${ratedMatches.length} matches chronologically…`
  );

  // Pre-scan: per player, find the highest tier they've ever appeared in.
  // We diverge from the spec's "first observed tier" rule because that rewards
  // inactive players (Dovestopher cling to OWCS prior with 3 stale matches)
  // and punishes players who started in OWCS Open Quals before reaching Main
  // Event (pge anchored at open-2500). Highest-tier-reached gives every player
  // credit for the level they've actually played at; the activity-window
  // display floor handles surfacing.
  const maxTierByPlayer = new Map<string, Tier>();
  for (const m of ratedMatches) {
    for (const pid of [...m.faction1, ...m.faction2]) {
      const cur = maxTierByPlayer.get(pid);
      if (!cur || TIER_RANK[m.tier] > TIER_RANK[cur]) {
        maxTierByPlayer.set(pid, m.tier);
      }
    }
  }

  const players = new Map<string, PlayerState>();
  function ensurePlayer(
    playerId: string,
    region: "NA" | "EMEA" | "OTHER",
    nickname: string
  ) {
    let p = players.get(playerId);
    if (!p) {
      const maxTier = maxTierByPlayer.get(playerId) ?? "unclassified";
      p = {
        player_id: playerId,
        nickname,
        region,
        rating: TIER_PRIORS[maxTier],
        match_count: 0,
        first_tier: maxTier, // field name kept; semantically now "max tier"
        contributions: [],
      };
      players.set(playerId, p);
    } else {
      if (!p.nickname && nickname) p.nickname = nickname;
      if (p.region === "OTHER" && region !== "OTHER") p.region = region;
    }
    return p;
  }

  // Build a nickname index from match details (for nicer reporting).
  const nicknameByPid = new Map<string, string>();
  for (const md of matchDetails.values()) {
    for (const r of md.teams?.faction1?.roster ?? [])
      nicknameByPid.set(r.player_id, r.nickname);
    for (const r of md.teams?.faction2?.roster ?? [])
      nicknameByPid.set(r.player_id, r.nickname);
  }
  nicknameByPid.set(seed.player_id, seed.nickname);

  const todayMs = Date.now();
  for (const m of ratedMatches) {
    const ageDays = (todayMs - m.finished_at * 1000) / (1000 * 60 * 60 * 24);
    const recency = recencyWeight(ageDays);
    const mov = movMultiplier(m.best_of, m.score[0], m.score[1]);

    // Average team rating per faction (for the head-to-head Elo).
    const f1Players = m.faction1.map((pid) =>
      ensurePlayer(pid, m.region, nicknameByPid.get(pid) ?? "")
    );
    const f2Players = m.faction2.map((pid) =>
      ensurePlayer(pid, m.region, nicknameByPid.get(pid) ?? "")
    );
    const f1Avg =
      f1Players.reduce((s, p) => s + p.rating, 0) / f1Players.length;
    const f2Avg =
      f2Players.reduce((s, p) => s + p.rating, 0) / f2Players.length;

    // Apply per-player Elo update against the opposing team's average.
    function update(side: PlayerState[], oppAvg: number, won: boolean) {
      for (const p of side) {
        const expected = 1 / (1 + Math.pow(10, (oppAvg - p.rating) / 400));
        const actual = won ? 1 : 0;
        const k = kBase(p.match_count);
        const baseDelta = k * mov * recency * (actual - expected);
        const dampener = gainDampener(p.rating, baseDelta);
        const delta = baseDelta * dampener;
        p.rating = clamp(p.rating + delta, HARD_FLOOR, HARD_CEILING);
        p.match_count += 1;
        p.contributions.push({
          match_id: m.match_id,
          delta,
          opp_rating: oppAvg,
          won,
          finished_at: m.finished_at,
          tier: m.tier,
          score: m.score,
        });
      }
    }
    const f1Won = m.winner_faction === 1;
    update(f1Players, f2Avg, f1Won);
    update(f2Players, f1Avg, !f1Won);
  }

  // Report. Active = ≥DISPLAY_MIN_RECENT_MATCHES tracked matches in the
  // last DISPLAY_ACTIVITY_WINDOW_DAYS. Inactive players still have a TSR;
  // we just don't surface them in the ranked board.
  const todayMsForReport = Date.now();
  const activityCutoffSec =
    (todayMsForReport - DISPLAY_ACTIVITY_WINDOW_DAYS * 86400 * 1000) / 1000;
  function recentMatchCount(p: PlayerState): number {
    return p.contributions.filter((c) => c.finished_at >= activityCutoffSec)
      .length;
  }
  function lastMatchDate(p: PlayerState): { sec: number; iso: string } {
    const sec = p.contributions.reduce((m, c) => Math.max(m, c.finished_at), 0);
    return {
      sec,
      iso: sec ? new Date(sec * 1000).toISOString().slice(0, 10) : "—",
    };
  }

  const allPlayers = [...players.values()].filter((p) => p.match_count >= 3);
  const active = allPlayers
    .filter((p) => recentMatchCount(p) >= DISPLAY_MIN_RECENT_MATCHES)
    .sort((a, b) => b.rating - a.rating);
  const inactive = allPlayers
    .filter((p) => recentMatchCount(p) < DISPLAY_MIN_RECENT_MATCHES)
    .sort((a, b) => b.rating - a.rating);

  console.log(
    `\n=== Active TSRs (${active.length} players · ≥${DISPLAY_MIN_RECENT_MATCHES} matches in last ${DISPLAY_ACTIVITY_WINDOW_DAYS}d) ===\n`
  );
  console.log(
    " rank  rating  nickname               region  total recent  prior          last-match"
  );
  for (const [i, p] of active.entries()) {
    const tier = p.first_tier ?? "unclassified";
    const last = lastMatchDate(p);
    console.log(
      ` ${String(i + 1).padStart(4)}  ${String(Math.round(p.rating)).padStart(6)}  ${p.nickname.padEnd(22)} ${p.region.padEnd(6)} ${String(p.match_count).padStart(5)} ${String(recentMatchCount(p)).padStart(6)}  ${`${tier}(${TIER_PRIORS[tier]})`.padEnd(13)}  ${last.iso}`
    );
  }

  console.log(
    `\n--- Inactive (top 10 of ${inactive.length}, hidden from active board) ---`
  );
  for (const p of inactive.slice(0, 10)) {
    const tier = p.first_tier ?? "unclassified";
    const last = lastMatchDate(p);
    console.log(
      `       ${String(Math.round(p.rating)).padStart(6)}  ${p.nickname.padEnd(22)} ${p.region.padEnd(6)} ${String(p.match_count).padStart(5)} ${String(recentMatchCount(p)).padStart(6)}  ${`${tier}(${TIER_PRIORS[tier]})`.padEnd(13)}  ${last.iso}`
    );
  }

  // Highlight seed's contributing matches.
  const seedState = players.get(seed.player_id);
  if (seedState) {
    console.log(`\n=== ${seed.nickname} top swings ===\n`);
    const top = [...seedState.contributions]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8);
    for (const c of top) {
      const date = new Date(c.finished_at * 1000).toISOString().slice(0, 10);
      const sign = c.delta >= 0 ? "+" : "";
      console.log(
        `  ${date}  ${c.tier.padEnd(8)}  ${c.won ? "W" : "L"} ${c.score[0]}-${c.score[1]}  vs avg ${Math.round(c.opp_rating)}  Δ ${sign}${c.delta.toFixed(1)}`
      );
    }
  }

  console.log(`\nDone. Cache lives in ${CACHE_DIR} — delete to refetch.\n`);
}

main().catch((err) => {
  console.error("\n!! dry-run failed:", err);
  process.exit(1);
});
