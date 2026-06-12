import type { RoleName as HeroRole } from "@/types/heroes";
import { mapNameToMapTypeMapping, type MapName } from "@/types/map";

const MAP_NAMES = Object.keys(mapNameToMapTypeMapping) as MapName[];
type MapType = (typeof mapNameToMapTypeMapping)[MapName];
const MAPS = (Object.entries(mapNameToMapTypeMapping) as [MapName, MapType][]).map(
  ([name, type]) => ({ name, type })
);
const MAP_TYPES: MapType[] = [...new Set(MAPS.map((m) => m.type))];

type MatchHeroData = {
  id: string;
  hero: string;
  role: string;
  percentage: number;
};

type MatchData = {
  id: string;
  map: string;
  mapType: string;
  result: string;
  groupSize: number;
  playedAt: Date;
  createdAt: Date;
  heroes: MatchHeroData[];
};

type RoleFilter = HeroRole | "all";

function filterMatchesByRole(
  matches: MatchData[],
  role: RoleFilter
): MatchData[] {
  if (role === "all") return matches;

  return matches
    .filter((match) => match.heroes.some((h) => h.role === role))
    .map((match) => ({
      ...match,
      heroes: match.heroes.filter((h) => h.role === role),
    }));
}

// --- Map Win/Loss ---

type MapWinLossEntry = {
  name: string;
  wins: number;
  losses: number;
};

type MapWinLossInsight = {
  bestMap: string;
  bestWinrate: number;
  worstMap: string;
  worstWinrate: number;
};

type MapWinLossResult = {
  data: MapWinLossEntry[];
  insight: MapWinLossInsight;
};

function getMapWinLossData(matches: MatchData[]): MapWinLossResult {
  const mapStats = new Map<string, { wins: number; losses: number }>();

  for (const match of matches) {
    const current = mapStats.get(match.map) ?? { wins: 0, losses: 0 };
    if (match.result === "win") current.wins++;
    else if (match.result === "loss") current.losses++;
    mapStats.set(match.map, current);
  }

  const data: MapWinLossEntry[] = Array.from(mapStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.wins + b.losses - (a.wins + a.losses));

  let bestMap = "";
  let bestWinrate = -1;
  let worstMap = "";
  let worstWinrate = 101;

  for (const entry of data) {
    const total = entry.wins + entry.losses;
    if (total === 0) continue;
    const winrate = (entry.wins / total) * 100;
    if (winrate > bestWinrate) {
      bestWinrate = winrate;
      bestMap = entry.name;
    }
    if (winrate < worstWinrate) {
      worstWinrate = winrate;
      worstMap = entry.name;
    }
  }

  return {
    data,
    insight: {
      bestMap,
      bestWinrate: Math.round(bestWinrate),
      worstMap,
      worstWinrate: Math.round(worstWinrate),
    },
  };
}

// --- Game Mode Distribution ---

type GameModeDistEntry = {
  mode: string;
  count: number;
  fill: string;
};

type GameModeDistInsight = {
  dominantMode: string;
  dominantPct: number;
};

type GameModeDistResult = {
  data: GameModeDistEntry[];
  insight: GameModeDistInsight;
};

const MODE_COLORS: Record<string, string> = {
  Control: "var(--chart-1)",
  Escort: "var(--chart-2)",
  Hybrid: "var(--chart-3)",
  Push: "var(--chart-4)",
  Flashpoint: "var(--chart-5)",
  Clash: "var(--color-primary)",
};

function getGameModeDistribution(matches: MatchData[]): GameModeDistResult {
  const modeCounts = new Map<string, number>();

  for (const match of matches) {
    modeCounts.set(match.mapType, (modeCounts.get(match.mapType) ?? 0) + 1);
  }

  const data: GameModeDistEntry[] = Array.from(modeCounts.entries())
    .map(([mode, count]) => ({
      mode,
      count,
      fill: MODE_COLORS[mode] ?? "var(--chart-1)",
    }))
    .sort((a, b) => b.count - a.count);

  const total = matches.length;
  const dominant = data[0];

  return {
    data,
    insight: {
      dominantMode: dominant?.mode ?? "",
      dominantPct: total > 0 ? Math.round((dominant.count / total) * 100) : 0,
    },
  };
}

// --- Game Mode Winrates ---

type GameModeWinrateEntry = {
  mode: string;
  winrate: number;
  wins: number;
  total: number;
};

type GameModeWinrateInsight = {
  bestMode: string;
  bestWinrate: number;
  worstMode: string;
  worstWinrate: number;
};

type GameModeWinrateResult = {
  data: GameModeWinrateEntry[];
  insight: GameModeWinrateInsight;
};

function getGameModeWinrates(matches: MatchData[]): GameModeWinrateResult {
  const modeStats = new Map<string, { wins: number; total: number }>();

  for (const match of matches) {
    const current = modeStats.get(match.mapType) ?? { wins: 0, total: 0 };
    current.total++;
    if (match.result === "win") current.wins++;
    modeStats.set(match.mapType, current);
  }

  const data: GameModeWinrateEntry[] = Array.from(modeStats.entries())
    .map(([mode, stats]) => ({
      mode,
      winrate: Math.round((stats.wins / stats.total) * 100),
      wins: stats.wins,
      total: stats.total,
    }))
    .sort((a, b) => b.winrate - a.winrate);

  return {
    data,
    insight: {
      bestMode: data[0]?.mode ?? "",
      bestWinrate: data[0]?.winrate ?? 0,
      worstMode: data.at(-1)?.mode ?? "",
      worstWinrate: data.at(-1)?.winrate ?? 0,
    },
  };
}

// --- Most Played Heroes ---

type MostPlayedHeroEntry = {
  hero: string;
  count: number;
  role: string;
};

type MostPlayedHeroInsight = {
  topHero: string;
  topCount: number;
  topRole: string;
};

type MostPlayedHeroResult = {
  data: MostPlayedHeroEntry[];
  insight: MostPlayedHeroInsight;
};

function getMostPlayedHeroes(
  matches: MatchData[],
  modeFilter?: MapType
): MostPlayedHeroResult {
  const filtered = modeFilter
    ? matches.filter((m) => m.mapType === modeFilter)
    : matches;

  const heroCounts = new Map<string, { count: number; role: string }>();

  for (const match of filtered) {
    for (const hero of match.heroes) {
      const current = heroCounts.get(hero.hero) ?? {
        count: 0,
        role: hero.role,
      };
      current.count++;
      heroCounts.set(hero.hero, current);
    }
  }

  const data: MostPlayedHeroEntry[] = Array.from(heroCounts.entries())
    .map(([hero, stats]) => ({ hero, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const top = data[0];

  return {
    data,
    insight: {
      topHero: top?.hero ?? "",
      topCount: top?.count ?? 0,
      topRole: top?.role ?? "",
    },
  };
}

// --- Hero Winrates ---

type HeroWinrateEntry = {
  hero: string;
  winrate: number;
  wins: number;
  total: number;
};

type HeroWinrateInsight = {
  bestHero: string;
  bestWinrate: number;
  bestTotal: number;
  worstHero: string;
  worstWinrate: number;
};

type HeroWinrateResult = {
  data: HeroWinrateEntry[];
  insight: HeroWinrateInsight;
};

const HERO_WINRATE_MIN_MATCHES = 3;

function getHeroWinrates(matches: MatchData[]): HeroWinrateResult {
  const heroStats = new Map<string, { wins: number; total: number }>();

  for (const match of matches) {
    for (const hero of match.heroes) {
      const current = heroStats.get(hero.hero) ?? { wins: 0, total: 0 };
      current.total++;
      if (match.result === "win") current.wins++;
      heroStats.set(hero.hero, current);
    }
  }

  const data: HeroWinrateEntry[] = Array.from(heroStats.entries())
    .filter(([, stats]) => stats.total >= HERO_WINRATE_MIN_MATCHES)
    .map(([hero, stats]) => ({
      hero,
      winrate: Math.round((stats.wins / stats.total) * 100),
      wins: stats.wins,
      total: stats.total,
    }))
    .sort((a, b) => b.winrate - a.winrate);

  const best = data[0];
  const worst = data.at(-1);

  return {
    data,
    insight: {
      bestHero: best?.hero ?? "",
      bestWinrate: best?.winrate ?? 0,
      bestTotal: best?.total ?? 0,
      worstHero: worst?.hero ?? "",
      worstWinrate: worst?.winrate ?? 0,
    },
  };
}

// --- Summary Stats ---

type SummaryStats = {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number;
  uniqueMaps: number;
  bestMap: string;
  bestMapWinrate: number;
  currentStreak: number;
  streakType: "win" | "loss" | "none";
};

function getSummaryStats(matches: MatchData[]): SummaryStats {
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const draws = matches.filter((m) => m.result === "draw").length;
  const total = matches.length;
  const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const uniqueMaps = new Set(matches.map((m) => m.map)).size;

  const { insight } = getMapWinLossData(matches);

  const sorted = [...matches].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

  let currentStreak = 0;
  let streakType: "win" | "loss" | "none" = "none";

  if (sorted.length > 0) {
    const firstResult = sorted[0].result;
    if (firstResult === "win" || firstResult === "loss") {
      streakType = firstResult;
      for (const match of sorted) {
        if (match.result === firstResult) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  return {
    totalMatches: total,
    wins,
    losses,
    draws,
    winrate,
    uniqueMaps,
    bestMap: insight.bestMap,
    bestMapWinrate: insight.bestWinrate,
    currentStreak,
    streakType,
  };
}

// --- Rolling Winrate ---

type RollingWinrateEntry = {
  gameIndex: number;
  date: string;
  rollingWinrate: number;
  result: string;
};

type RollingWinrateInsight = {
  trend: "improving" | "declining" | "stable";
  peakWinrate: number;
  currentWinrate: number;
  window: number;
};

type RollingWinrateResult = {
  data: RollingWinrateEntry[];
  insight: RollingWinrateInsight;
};

const ROLLING_WINDOW = 10;
const TREND_THRESHOLD = 5;

function getRollingWinrateData(
  matches: MatchData[],
  window = ROLLING_WINDOW
): RollingWinrateResult {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );

  const data: RollingWinrateEntry[] = sorted.map((match, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    const wins = slice.filter((m) => m.result === "win").length;
    const rollingWinrate = Math.round((wins / slice.length) * 100);
    return {
      gameIndex: i + 1,
      date: new Date(match.playedAt).toLocaleDateString(),
      rollingWinrate,
      result: match.result,
    };
  });

  const peakWinrate = data.reduce(
    (max, d) => Math.max(max, d.rollingWinrate),
    0
  );
  const currentWinrate = data.at(-1)?.rollingWinrate ?? 0;

  let trend: "improving" | "declining" | "stable" = "stable";
  if (data.length >= window * 2) {
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);
    const firstAvg =
      firstHalf.reduce((s, d) => s + d.rollingWinrate, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((s, d) => s + d.rollingWinrate, 0) / secondHalf.length;
    if (secondAvg - firstAvg >= TREND_THRESHOLD) trend = "improving";
    else if (firstAvg - secondAvg >= TREND_THRESHOLD) trend = "declining";
  }

  return { data, insight: { trend, peakWinrate, currentWinrate, window } };
}

// --- Activity Heatmap ---

type HeatmapEntry = {
  date: string;
  count: number;
};

type ActivityHeatmapInsight = {
  peakDayOfWeek: string;
  avgGamesPerActiveDay: number;
  totalActiveDays: number;
};

type ActivityHeatmapResult = {
  data: HeatmapEntry[];
  maxCount: number;
  insight: ActivityHeatmapInsight;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getActivityHeatmapData(
  matches: MatchData[],
  weeks = 16
): ActivityHeatmapResult {
  const countsByDate = new Map<string, number>();
  for (const match of matches) {
    const d = new Date(match.playedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + (6 - today.getDay()));

  const startDate = new Date(endSunday);
  startDate.setDate(endSunday.getDate() - weeks * 7 + 1);

  const data: HeatmapEntry[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endSunday) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    data.push({ date: key, count: countsByDate.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const maxCount = data.reduce((max, d) => Math.max(max, d.count), 0);

  const dayTotals = new Array(7).fill(0);
  for (const match of matches) {
    dayTotals[new Date(match.playedAt).getDay()]++;
  }
  const peakDayIndex = dayTotals.indexOf(
    dayTotals.reduce((max: number, v: number) => Math.max(max, v), 0)
  );
  const peakDayOfWeek = DAY_NAMES[peakDayIndex] ?? "Unknown";

  const activeDays = data.filter((d) => d.count > 0);
  const totalActiveDays = activeDays.length;
  const avgGamesPerActiveDay =
    totalActiveDays > 0
      ? Math.round(
          (activeDays.reduce((s, d) => s + d.count, 0) / totalActiveDays) * 10
        ) / 10
      : 0;

  return {
    data,
    maxCount,
    insight: { peakDayOfWeek, avgGamesPerActiveDay, totalActiveDays },
  };
}

// --- Streak Data ---

type RecentResult = {
  matchId: string;
  result: "win" | "loss" | "draw";
};

type StreakData = {
  currentStreak: number;
  currentStreakType: "win" | "loss" | "none";
  longestWinStreak: number;
  longestLossStreak: number;
  recentResults: RecentResult[];
};

function getStreakData(matches: MatchData[]): StreakData {
  const sorted = [...matches].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

  const recentResults: RecentResult[] = sorted.slice(0, 20).map((m) => ({
    matchId: m.id,
    result: m.result as "win" | "loss" | "draw",
  }));

  let currentStreak = 0;
  let currentStreakType: "win" | "loss" | "none" = "none";
  if (sorted.length > 0) {
    const first = sorted[0].result;
    if (first === "win" || first === "loss") {
      currentStreakType = first;
      for (const match of sorted) {
        if (match.result === first) currentStreak++;
        else break;
      }
    }
  }

  const chronological = [...sorted].reverse();
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let runWin = 0;
  let runLoss = 0;
  for (const match of chronological) {
    if (match.result === "win") {
      runWin++;
      runLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, runWin);
    } else if (match.result === "loss") {
      runLoss++;
      runWin = 0;
      longestLossStreak = Math.max(longestLossStreak, runLoss);
    } else {
      runWin = 0;
      runLoss = 0;
    }
  }

  return {
    currentStreak,
    currentStreakType,
    longestWinStreak,
    longestLossStreak,
    recentResults,
  };
}

// --- Recent Form ---

type FormStats = {
  winrate: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
};

type RecentFormData = {
  recent: FormStats;
  overall: FormStats;
  delta: number;
  trend: "improving" | "declining" | "stable";
};

const RECENT_FORM_WINDOW = 20;
const RECENT_FORM_THRESHOLD = 5;

function computeFormStats(matches: MatchData[]): FormStats {
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const draws = matches.filter((m) => m.result === "draw").length;
  const total = matches.length;
  return {
    wins,
    losses,
    draws,
    total,
    winrate: total > 0 ? Math.round((wins / total) * 100) : 0,
  };
}

function getRecentFormData(
  matches: MatchData[],
  window = RECENT_FORM_WINDOW
): RecentFormData {
  const sorted = [...matches].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

  const recentMatches = sorted.slice(0, window);
  const recent = computeFormStats(recentMatches);
  const overall = computeFormStats(matches);
  const delta = recent.winrate - overall.winrate;

  let trend: "improving" | "declining" | "stable" = "stable";
  if (delta >= RECENT_FORM_THRESHOLD) trend = "improving";
  else if (delta <= -RECENT_FORM_THRESHOLD) trend = "declining";

  return { recent, overall, delta, trend };
}

// --- Group Size ---

const GROUP_SIZE_LABELS: Record<number, string> = {
  1: "Solo",
  2: "Duo",
  3: "Trio",
  4: "4-Stack",
  5: "5-Stack",
  6: "Full Stack",
};

const GROUP_SIZE_MIN_MATCHES = 3;

type GroupSizeEntry = {
  groupSize: number;
  label: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winrate: number;
};

type GroupSizeInsight = {
  optimalSize: number;
  optimalLabel: string;
  optimalWinrate: number;
  soloWinrate: number | null;
  hasEnoughData: boolean;
};

type GroupSizeResult = {
  data: GroupSizeEntry[];
  insight: GroupSizeInsight;
};

function getGroupSizeWinrates(matches: MatchData[]): GroupSizeResult {
  const buckets = new Map<
    number,
    { wins: number; losses: number; draws: number }
  >();

  for (const match of matches) {
    const size = match.groupSize;
    const current = buckets.get(size) ?? { wins: 0, losses: 0, draws: 0 };
    if (match.result === "win") current.wins++;
    else if (match.result === "loss") current.losses++;
    else current.draws++;
    buckets.set(size, current);
  }

  const data: GroupSizeEntry[] = Array.from(buckets.entries())
    .map(([groupSize, stats]) => {
      const total = stats.wins + stats.losses + stats.draws;
      const winrate =
        total > 0 ? Math.round((stats.wins / total) * 1000) / 10 : 0;
      return {
        groupSize,
        label: GROUP_SIZE_LABELS[groupSize] ?? `${groupSize}-Stack`,
        ...stats,
        total,
        winrate,
      };
    })
    .sort((a, b) => a.groupSize - b.groupSize);

  const qualified = data.filter((e) => e.total >= GROUP_SIZE_MIN_MATCHES);
  const hasEnoughData = qualified.length > 0;

  let optimalEntry = qualified[0];
  for (const entry of qualified) {
    if (entry.winrate > optimalEntry.winrate) optimalEntry = entry;
  }

  const soloEntry = data.find((e) => e.groupSize === 1);
  const soloWinrate =
    soloEntry && soloEntry.total >= GROUP_SIZE_MIN_MATCHES
      ? soloEntry.winrate
      : null;

  return {
    data,
    insight: {
      optimalSize: optimalEntry?.groupSize ?? 1,
      optimalLabel: optimalEntry?.label ?? "Solo",
      optimalWinrate: optimalEntry?.winrate ?? 0,
      soloWinrate,
      hasEnoughData,
    },
  };
}

// --- Role Stats ---

// Achromatic amber ramp, kept in sync with the role encoding in
// most-played-heroes-chart.tsx so roles read the same across every surface.
const ROLE_COLORS: Record<string, string> = {
  Tank: "var(--chart-2)",
  Damage: "var(--chart-4)",
  Support: "var(--chart-win)",
};

const ROLES = ["Tank", "Damage", "Support"] as const;

type RoleDistEntry = {
  role: string;
  weightedCount: number;
  percentage: number;
  fill: string;
};

type RoleWinrateEntry = {
  role: string;
  winrate: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  fill: string;
};

type RoleFlexibilityData = {
  score: number;
  label: "Adaptive" | "Flexible" | "Specialist";
  description: string;
};

type RoleStatsInsight = {
  dominantRole: string;
  dominantPct: number;
  bestRole: string;
  bestWinrate: number;
  hasEnoughData: boolean;
};

type RoleStatsResult = {
  distribution: RoleDistEntry[];
  winrates: RoleWinrateEntry[];
  flexibility: RoleFlexibilityData;
  insight: RoleStatsInsight;
};

const ROLE_WINRATE_MIN_MATCHES = 3;

function getRoleStats(matches: MatchData[]): RoleStatsResult {
  const weightedCounts = new Map<string, number>(ROLES.map((r) => [r, 0]));
  const winrateBuckets = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >(ROLES.map((r) => [r, { wins: 0, losses: 0, draws: 0 }]));

  for (const match of matches) {
    const totalPct = match.heroes.reduce((sum, h) => sum + h.percentage, 0);
    const normalizer = totalPct > 0 ? totalPct : 1;

    for (const hero of match.heroes) {
      const role = hero.role;
      if (!ROLES.includes(role as (typeof ROLES)[number])) continue;
      const weight = hero.percentage / normalizer;
      weightedCounts.set(role, (weightedCounts.get(role) ?? 0) + weight);
    }

    const rolesInMatch = new Set(match.heroes.map((h) => h.role));
    for (const role of rolesInMatch) {
      if (!ROLES.includes(role as (typeof ROLES)[number])) continue;
      const bucket = winrateBuckets.get(role)!;
      if (match.result === "win") bucket.wins++;
      else if (match.result === "loss") bucket.losses++;
      else bucket.draws++;
    }
  }

  const totalWeight = Array.from(weightedCounts.values()).reduce(
    (s, v) => s + v,
    0
  );

  const distribution: RoleDistEntry[] = ROLES.map((role) => {
    const weightedCount = weightedCounts.get(role) ?? 0;
    const percentage =
      totalWeight > 0
        ? Math.round((weightedCount / totalWeight) * 1000) / 10
        : 0;
    return {
      role,
      weightedCount,
      percentage,
      fill: ROLE_COLORS[role] ?? "var(--chart-1)",
    };
  }).sort((a, b) => b.weightedCount - a.weightedCount);

  const winrates: RoleWinrateEntry[] = ROLES.map((role) => {
    const bucket = winrateBuckets.get(role)!;
    const total = bucket.wins + bucket.losses + bucket.draws;
    const winrate =
      total > 0 ? Math.round((bucket.wins / total) * 1000) / 10 : 0;
    return {
      role,
      winrate,
      wins: bucket.wins,
      losses: bucket.losses,
      draws: bucket.draws,
      total,
      fill: ROLE_COLORS[role] ?? "var(--chart-1)",
    };
  });

  // Flexibility: normalized deviation from a perfectly even split (1/3 each)
  // score = (1 - sum(|p_i - 1/3|) / (4/3)) * 100
  // max deviation (all on one role): |1 - 1/3| + |0 - 1/3| + |0 - 1/3| = 4/3
  const proportions = ROLES.map((role) => {
    const entry = distribution.find((d) => d.role === role);
    return entry ? entry.percentage / 100 : 0;
  });
  const deviation = proportions.reduce(
    (sum, p) => sum + Math.abs(p - 1 / 3),
    0
  );
  const flexScore = Math.round((1 - deviation / (4 / 3)) * 100);

  const flexLabel =
    flexScore >= 80 ? "Adaptive" : flexScore >= 55 ? "Flexible" : "Specialist";

  const dominantEntry = distribution[0];
  const flexDescription =
    flexScore >= 80
      ? "You play all three roles nearly equally — a true flex player"
      : flexScore >= 55
        ? `You lean toward ${dominantEntry?.role ?? "one role"} but still play others`
        : `You mainly play ${dominantEntry?.role ?? "one role"} — a dedicated specialist`;

  const qualifiedWinrates = winrates.filter(
    (r) => r.total >= ROLE_WINRATE_MIN_MATCHES
  );
  const bestRoleEntry = qualifiedWinrates.reduce<RoleWinrateEntry | null>(
    (best, r) => (!best || r.winrate > best.winrate ? r : best),
    null
  );

  return {
    distribution,
    winrates,
    flexibility: {
      score: flexScore,
      label: flexLabel,
      description: flexDescription,
    },
    insight: {
      dominantRole: dominantEntry?.role ?? "",
      dominantPct: dominantEntry?.percentage ?? 0,
      bestRole: bestRoleEntry?.role ?? "",
      bestWinrate: bestRoleEntry?.winrate ?? 0,
      hasEnoughData: qualifiedWinrates.length > 0,
    },
  };
}

// --- One-Trick Detection ---

const ONE_TRICK_THRESHOLD = 65;
const SPECIALIST_THRESHOLD = 50;

type OneTrickResult = {
  topHero: string;
  topHeroRole: string;
  topHeroPct: number;
  label: "One-Trick" | "Specialist" | "Diverse";
  description: string;
  topHeroesData: { hero: string; pct: number; role: string }[];
};

function getOneTrickStats(matches: MatchData[]): OneTrickResult {
  const totalMatches = matches.length;

  if (totalMatches === 0) {
    return {
      topHero: "",
      topHeroRole: "",
      topHeroPct: 0,
      label: "Diverse",
      description: "No matches tracked yet",
      topHeroesData: [],
    };
  }

  const heroWeights = new Map<string, { weight: number; role: string }>();

  for (const match of matches) {
    for (const hero of match.heroes) {
      const current = heroWeights.get(hero.hero) ?? {
        weight: 0,
        role: hero.role,
      };
      current.weight += hero.percentage;
      heroWeights.set(hero.hero, current);
    }
  }

  const topHeroesData = Array.from(heroWeights.entries())
    .map(([hero, { weight, role }]) => ({
      hero,
      pct: Math.round((weight / (totalMatches * 100)) * 1000) / 10,
      role,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const top = topHeroesData[0];
  const topHeroPct = top?.pct ?? 0;

  const label =
    topHeroPct >= ONE_TRICK_THRESHOLD
      ? "One-Trick"
      : topHeroPct >= SPECIALIST_THRESHOLD
        ? "Specialist"
        : "Diverse";

  const description =
    label === "One-Trick"
      ? `You've spent ${topHeroPct}% of your time on ${top?.hero} — a dedicated one-trick`
      : label === "Specialist"
        ? `You lean toward ${top?.hero} but still have some variety`
        : top?.hero
          ? `Your playtime is spread across many heroes`
          : "No matches tracked yet";

  return {
    topHero: top?.hero ?? "",
    topHeroRole: top?.role ?? "",
    topHeroPct,
    label,
    description,
    topHeroesData,
  };
}

// --- Hero Pool Diversity ---

type HeroPoolDiversityResult = {
  totalUnique: number;
  byRole: { role: string; count: number; fill: string }[];
  heroList: { hero: string; role: string }[];
};

function getHeroPoolDiversity(matches: MatchData[]): HeroPoolDiversityResult {
  const seen = new Map<string, string>();

  for (const match of matches) {
    for (const hero of match.heroes) {
      if (!seen.has(hero.hero)) {
        seen.set(hero.hero, hero.role);
      }
    }
  }

  const heroList = Array.from(seen.entries())
    .map(([hero, role]) => ({ hero, role }))
    .sort((a, b) => a.hero.localeCompare(b.hero));

  const roleCounts = new Map<string, number>(ROLES.map((r) => [r, 0]));
  for (const { role } of heroList) {
    if (ROLES.includes(role as (typeof ROLES)[number])) {
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    }
  }

  const byRole = ROLES.map((role) => ({
    role,
    count: roleCounts.get(role) ?? 0,
    fill: ROLE_COLORS[role] ?? "var(--chart-1)",
  }));

  return {
    totalUnique: seen.size,
    byRole,
    heroList,
  };
}

// --- Hero Swap Analytics ---

const SWAP_MIN_PERCENTAGE = 20;

type HeroSwapEntry = {
  label: "Swapped" | "Stayed";
  winrate: number;
  wins: number;
  total: number;
};

type HeroSwapResult = {
  data: HeroSwapEntry[];
  swapWinrate: number;
  noSwapWinrate: number;
  swapTotal: number;
  noSwapTotal: number;
  delta: number;
  avgHeroesPerSwapMatch: number;
  insight: string;
};

function getHeroSwapStats(matches: MatchData[]): HeroSwapResult {
  let swapWins = 0;
  let swapTotal = 0;
  let noSwapWins = 0;
  let noSwapTotal = 0;
  let totalSignificantHeroesInSwapMatches = 0;

  for (const match of matches) {
    const significantHeroes = match.heroes.filter(
      (h) => h.percentage >= SWAP_MIN_PERCENTAGE
    );
    const isSwap = significantHeroes.length >= 2;

    if (isSwap) {
      swapTotal++;
      totalSignificantHeroesInSwapMatches += significantHeroes.length;
      if (match.result === "win") swapWins++;
    } else {
      noSwapTotal++;
      if (match.result === "win") noSwapWins++;
    }
  }

  const swapWinrate =
    swapTotal > 0 ? Math.round((swapWins / swapTotal) * 1000) / 10 : 0;
  const noSwapWinrate =
    noSwapTotal > 0 ? Math.round((noSwapWins / noSwapTotal) * 1000) / 10 : 0;
  const delta = Math.round((swapWinrate - noSwapWinrate) * 10) / 10;
  const avgHeroesPerSwapMatch =
    swapTotal > 0
      ? Math.round((totalSignificantHeroesInSwapMatches / swapTotal) * 10) / 10
      : 0;

  const hasEnoughData = swapTotal >= 3 && noSwapTotal >= 3;

  let insight: string;
  if (!hasEnoughData) {
    insight = "Not enough data yet — play more matches to see swap correlation";
  } else if (Math.abs(delta) < 2) {
    insight = "Swapping heroes has no meaningful impact on your winrate";
  } else if (delta > 0) {
    insight = `Swapping heroes gives you a +${delta}% winrate boost`;
  } else {
    insight = `Staying on your hero gives you a +${Math.abs(delta)}% winrate advantage`;
  }

  const data: HeroSwapEntry[] = [
    {
      label: "Swapped",
      winrate: swapWinrate,
      wins: swapWins,
      total: swapTotal,
    },
    {
      label: "Stayed",
      winrate: noSwapWinrate,
      wins: noSwapWins,
      total: noSwapTotal,
    },
  ];

  return {
    data,
    swapWinrate,
    noSwapWinrate,
    swapTotal,
    noSwapTotal,
    delta,
    avgHeroesPerSwapMatch,
    insight,
  };
}

// --- Map Detailed Stats ---

function getConfidenceStars(total: number): 1 | 2 | 3 | 4 | 5 {
  if (total >= 50) return 5;
  if (total >= 35) return 4;
  if (total >= 20) return 3;
  if (total >= 10) return 2;
  return 1;
}

function assignMapTier(
  winrate: number,
  total: number
): "S" | "A" | "B" | "C" | "D" {
  if (total < 3) return "C";
  if (total < 5) {
    if (winrate >= 65) return "A";
    if (winrate >= 45) return "B";
    return "C";
  }
  if (winrate >= 65) return "S";
  if (winrate >= 55) return "A";
  if (winrate >= 45) return "B";
  if (winrate >= 35) return "C";
  return "D";
}

function computeMapVolatility(
  wins: number,
  losses: number,
  draws: number
): number {
  const total = wins + losses + draws;
  if (total < 2) return 0;
  const mean = (wins + 0.5 * draws) / total;
  const variance =
    (wins * (1 - mean) ** 2 +
      losses * (0 - mean) ** 2 +
      draws * (0.5 - mean) ** 2) /
    total;
  return Math.round(Math.sqrt(variance) * 200);
}

type MapDetailedEntry = {
  name: string;
  mapType: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winrate: number;
  deviation: number;
  volatility: number;
  confidenceStars: 1 | 2 | 3 | 4 | 5;
  tier: "S" | "A" | "B" | "C" | "D";
  hasEnoughData: boolean;
};

type MapDetailedResult = {
  data: MapDetailedEntry[];
  overallWinrate: number;
  insight: {
    bestMap: string;
    bestWinrate: number;
    worstMap: string;
    worstWinrate: number;
    mostVolatile: string;
    mostVolatileScore: number;
  };
};

const MAP_DETAILED_MIN_GAMES = 5;

function getMapDetailedStats(matches: MatchData[]): MapDetailedResult {
  const mapStats = new Map<
    string,
    { wins: number; losses: number; draws: number; mapType: string }
  >();

  for (const match of matches) {
    const current = mapStats.get(match.map) ?? {
      wins: 0,
      losses: 0,
      draws: 0,
      mapType: match.mapType,
    };
    if (match.result === "win") current.wins++;
    else if (match.result === "loss") current.losses++;
    else current.draws++;
    mapStats.set(match.map, current);
  }

  const totalMatches = matches.length;
  const totalWins = matches.filter((m) => m.result === "win").length;
  const overallWinrate =
    totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 50;

  const data: MapDetailedEntry[] = Array.from(mapStats.entries())
    .map(([name, stats]) => {
      const total = stats.wins + stats.losses + stats.draws;
      const winrate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
      const deviation = winrate - overallWinrate;
      const volatility = computeMapVolatility(
        stats.wins,
        stats.losses,
        stats.draws
      );
      const confidenceStars = getConfidenceStars(total);
      const tier = assignMapTier(winrate, total);
      return {
        name,
        mapType: stats.mapType,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        total,
        winrate,
        deviation,
        volatility,
        confidenceStars,
        tier,
        hasEnoughData: total >= MAP_DETAILED_MIN_GAMES,
      };
    })
    .sort((a, b) => b.winrate - a.winrate);

  const qualified = data.filter((d) => d.hasEnoughData);
  const best = qualified[0];
  const worst = qualified.at(-1);
  const mostVolatile = [...data].sort((a, b) => b.volatility - a.volatility)[0];

  return {
    data,
    overallWinrate,
    insight: {
      bestMap: best?.name ?? data[0]?.name ?? "",
      bestWinrate: best?.winrate ?? data[0]?.winrate ?? 0,
      worstMap: worst?.name ?? data.at(-1)?.name ?? "",
      worstWinrate: worst?.winrate ?? data.at(-1)?.winrate ?? 0,
      mostVolatile: mostVolatile?.name ?? "",
      mostVolatileScore: mostVolatile?.volatility ?? 0,
    },
  };
}

// --- Hero Map Synergy ---

const HERO_MAP_MIN_GAMES = 3;

function wilsonLower(wins: number, total: number): number {
  if (total === 0) return 0;
  const z = 1.96;
  const p = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const spread =
    z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return Math.max(0, Math.round(((center - spread) / denominator) * 100));
}

function wilsonUpper(wins: number, total: number): number {
  if (total === 0) return 100;
  const z = 1.96;
  const p = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const spread =
    z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return Math.min(100, Math.round(((center + spread) / denominator) * 100));
}

type HeroMapCell = {
  hero: string;
  map: string;
  wins: number;
  total: number;
  winrate: number;
  hasEnoughData: boolean;
};

type BestHeroPerMap = {
  map: string;
  mapType: string;
  hero: string;
  role: string;
  winrate: number;
  total: number;
  confidenceLow: number;
  confidenceHigh: number;
};

type HeroMapSynergyResult = {
  matrix: HeroMapCell[];
  heroes: string[];
  maps: string[];
  bestHeroPerMap: BestHeroPerMap[];
};

function getHeroMapSynergy(matches: MatchData[]): HeroMapSynergyResult {
  const cellStats = new Map<string, { wins: number; total: number }>();
  const heroRoles = new Map<string, string>();
  const mapTypes = new Map<string, string>();
  const heroCounts = new Map<string, number>();
  const mapCounts = new Map<string, number>();

  for (const match of matches) {
    mapTypes.set(match.map, match.mapType);
    mapCounts.set(match.map, (mapCounts.get(match.map) ?? 0) + 1);

    for (const hero of match.heroes) {
      heroRoles.set(hero.hero, hero.role);
      heroCounts.set(hero.hero, (heroCounts.get(hero.hero) ?? 0) + 1);

      const key = `${hero.hero}||${match.map}`;
      const current = cellStats.get(key) ?? { wins: 0, total: 0 };
      current.total++;
      if (match.result === "win") current.wins++;
      cellStats.set(key, current);
    }
  }

  const heroes = Array.from(heroCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([hero]) => hero);

  const maps = Array.from(mapCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([map]) => map);

  const matrix: HeroMapCell[] = [];
  for (const hero of heroes) {
    for (const map of maps) {
      const key = `${hero}||${map}`;
      const stats = cellStats.get(key) ?? { wins: 0, total: 0 };
      const winrate =
        stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
      matrix.push({
        hero,
        map,
        wins: stats.wins,
        total: stats.total,
        winrate,
        hasEnoughData: stats.total >= HERO_MAP_MIN_GAMES,
      });
    }
  }

  const bestHeroPerMap: BestHeroPerMap[] = [];
  for (const map of maps) {
    const candidates: { hero: string; wins: number; total: number }[] = [];
    for (const [hero] of heroCounts) {
      const key = `${hero}||${map}`;
      const stats = cellStats.get(key);
      if (stats && stats.total >= HERO_MAP_MIN_GAMES) {
        candidates.push({ hero, ...stats });
      }
    }
    if (candidates.length === 0) continue;

    const best = candidates.reduce((a, b) =>
      b.wins / b.total > a.wins / a.total ? b : a
    );

    bestHeroPerMap.push({
      map,
      mapType: mapTypes.get(map) ?? "",
      hero: best.hero,
      role: heroRoles.get(best.hero) ?? "",
      winrate: Math.round((best.wins / best.total) * 100),
      total: best.total,
      confidenceLow: wilsonLower(best.wins, best.total),
      confidenceHigh: wilsonUpper(best.wins, best.total),
    });
  }

  return { matrix, heroes, maps, bestHeroPerMap };
}

// --- Map Learning Curve ---

const MAP_LEARNING_MIN_GAMES = 6;

type MapLearningEntry = {
  map: string;
  mapType: string;
  earlyWinrate: number;
  lateWinrate: number;
  improvement: number;
  totalGames: number;
  earlyGames: number;
  lateGames: number;
  hasEnoughData: boolean;
};

type MapLearningResult = {
  data: MapLearningEntry[];
  insight: {
    mostImproved: string;
    improvementDelta: number;
    mostDeclined: string;
    declineDelta: number;
  };
};

function getMapLearningCurve(matches: MatchData[]): MapLearningResult {
  const mapMatches = new Map<
    string,
    { result: string; playedAt: Date; mapType: string }[]
  >();

  for (const match of matches) {
    const current = mapMatches.get(match.map) ?? [];
    current.push({
      result: match.result,
      playedAt: new Date(match.playedAt),
      mapType: match.mapType,
    });
    mapMatches.set(match.map, current);
  }

  const data: MapLearningEntry[] = [];

  for (const [map, matchList] of mapMatches) {
    const sorted = [...matchList].sort(
      (a, b) => a.playedAt.getTime() - b.playedAt.getTime()
    );
    const totalGames = sorted.length;
    const hasEnoughData = totalGames >= MAP_LEARNING_MIN_GAMES;

    const splitPoint = Math.floor(totalGames / 2);
    const early = sorted.slice(0, splitPoint);
    const late = sorted.slice(splitPoint);

    const earlyWins = early.filter((m) => m.result === "win").length;
    const lateWins = late.filter((m) => m.result === "win").length;

    const earlyWinrate =
      early.length > 0 ? Math.round((earlyWins / early.length) * 100) : 0;
    const lateWinrate =
      late.length > 0 ? Math.round((lateWins / late.length) * 100) : 0;
    const improvement = lateWinrate - earlyWinrate;

    data.push({
      map,
      mapType: sorted[0]?.mapType ?? "",
      earlyWinrate,
      lateWinrate,
      improvement,
      totalGames,
      earlyGames: early.length,
      lateGames: late.length,
      hasEnoughData,
    });
  }

  data.sort((a, b) => b.improvement - a.improvement);

  const qualified = data.filter((d) => d.hasEnoughData);
  const mostImproved = qualified[0];
  const mostDeclined = qualified.at(-1);

  return {
    data,
    insight: {
      mostImproved: mostImproved?.map ?? "",
      improvementDelta: mostImproved?.improvement ?? 0,
      mostDeclined: mostDeclined?.map ?? "",
      declineDelta: mostDeclined?.improvement ?? 0,
    },
  };
}

// --- Map Familiarity ---

function computeVarietyScore(
  mapCounts: Map<string, number>,
  totalGames: number
): number {
  if (totalGames === 0) return 0;

  let entropy = 0;
  for (const mapName of MAP_NAMES) {
    const count = mapCounts.get(mapName) ?? 0;
    if (count === 0) continue;
    const p = count / totalGames;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(MAP_NAMES.length);
  return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
}

type MapFamiliarityEntry = {
  name: string;
  mapType: string;
  gamesPlayed: number;
  pctOfTotal: number;
  lastResults: ("win" | "loss" | "draw")[];
};

type MapFamiliarityResult = {
  data: MapFamiliarityEntry[];
  varietyScore: number;
  avoidedMaps: { name: string; mapType: string }[];
  totalMapsPlayed: number;
  totalMapsAvailable: number;
};

function getMapFamiliarityData(matches: MatchData[]): MapFamiliarityResult {
  const mapStats = new Map<
    string,
    {
      count: number;
      mapType: string;
      results: { result: string; playedAt: Date }[];
    }
  >();
  const totalGames = matches.length;

  for (const match of matches) {
    const current = mapStats.get(match.map) ?? {
      count: 0,
      mapType: match.mapType,
      results: [],
    };
    current.count++;
    current.results.push({
      result: match.result,
      playedAt: new Date(match.playedAt),
    });
    mapStats.set(match.map, current);
  }

  const mapCounts = new Map<string, number>();
  for (const [map, stats] of mapStats) {
    mapCounts.set(map, stats.count);
  }

  const varietyScore = computeVarietyScore(mapCounts, totalGames);

  const data: MapFamiliarityEntry[] = Array.from(mapStats.entries())
    .map(([name, stats]) => {
      const sorted = [...stats.results].sort(
        (a, b) => b.playedAt.getTime() - a.playedAt.getTime()
      );
      const lastResults = sorted
        .slice(0, 10)
        .map((r) => r.result as "win" | "loss" | "draw");
      return {
        name,
        mapType: stats.mapType,
        gamesPlayed: stats.count,
        pctOfTotal:
          totalGames > 0 ? Math.round((stats.count / totalGames) * 100) : 0,
        lastResults,
      };
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  const playedMapNames = new Set(mapStats.keys());
  const avoidedMaps = MAPS.filter((m) => !playedMapNames.has(m.name)).map(
    (m) => ({ name: m.name, mapType: m.type })
  );

  return {
    data,
    varietyScore,
    avoidedMaps,
    totalMapsPlayed: playedMapNames.size,
    totalMapsAvailable: MAPS.length,
  };
}

// --- Repeat Map Data ---

type RepeatMapResult = {
  firstOccurrenceWinrate: number;
  repeatWinrate: number;
  firstOccurrenceTotal: number;
  repeatTotal: number;
  delta: number;
  hasEnoughData: boolean;
  insight: string;
};

function getRepeatMapData(matches: MatchData[]): RepeatMapResult {
  const sessions = groupMatchesIntoSessions(matches);

  let firstWins = 0;
  let firstTotal = 0;
  let repeatWins = 0;
  let repeatTotal = 0;

  for (const session of sessions) {
    const seenMaps = new Set<string>();

    for (const match of session) {
      if (!seenMaps.has(match.map)) {
        seenMaps.add(match.map);
        firstTotal++;
        if (match.result === "win") firstWins++;
      } else {
        repeatTotal++;
        if (match.result === "win") repeatWins++;
      }
    }
  }

  const firstOccurrenceWinrate =
    firstTotal > 0 ? Math.round((firstWins / firstTotal) * 100) : 0;
  const repeatWinrate =
    repeatTotal > 0 ? Math.round((repeatWins / repeatTotal) * 100) : 0;
  const delta = repeatWinrate - firstOccurrenceWinrate;
  const hasEnoughData = repeatTotal >= 5;

  let insight: string;
  if (!hasEnoughData) {
    insight =
      "Not enough repeat map data yet — play more sessions to see patterns";
  } else if (Math.abs(delta) < 5) {
    insight = "Repeat maps have no meaningful effect on your winrate";
  } else if (delta > 0) {
    insight = `You perform ${delta}% better when you see the same map twice in a session`;
  } else {
    insight = `You perform ${Math.abs(delta)}% worse on repeat maps — fatigue may be a factor`;
  }

  return {
    firstOccurrenceWinrate,
    repeatWinrate,
    firstOccurrenceTotal: firstTotal,
    repeatTotal,
    delta,
    hasEnoughData,
    insight,
  };
}

// --- Map Timeline ---

type MapTimelineEntry = {
  result: "win" | "loss" | "draw";
  playedAt: Date;
  index: number;
};

type MapTimelineMapData = {
  map: string;
  mapType: string;
  history: MapTimelineEntry[];
  lastPlayedDaysAgo: number | null;
  rotationGapDays: number | null;
};

type MapTimelineResult = {
  maps: MapTimelineMapData[];
};

function getMapTimelineData(matches: MatchData[]): MapTimelineResult {
  const mapMatches = new Map<
    string,
    { result: string; playedAt: Date; mapType: string }[]
  >();

  for (const match of matches) {
    const current = mapMatches.get(match.map) ?? [];
    current.push({
      result: match.result,
      playedAt: new Date(match.playedAt),
      mapType: match.mapType,
    });
    mapMatches.set(match.map, current);
  }

  const now = new Date();
  const maps: MapTimelineMapData[] = [];

  for (const [map, matchList] of mapMatches) {
    const sorted = [...matchList].sort(
      (a, b) => a.playedAt.getTime() - b.playedAt.getTime()
    );
    const history: MapTimelineEntry[] = sorted.slice(-20).map((m, i) => ({
      result: m.result as "win" | "loss" | "draw",
      playedAt: m.playedAt,
      index: i,
    }));

    const lastPlayed = sorted.at(-1)?.playedAt;
    const lastPlayedDaysAgo = lastPlayed
      ? Math.floor(
          (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    let rotationGapDays: number | null = null;
    if (sorted.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const gap =
          (sorted[i].playedAt.getTime() - sorted[i - 1].playedAt.getTime()) /
          (1000 * 60 * 60 * 24);
        gaps.push(gap);
      }
      gaps.sort((a, b) => a - b);
      const mid = Math.floor(gaps.length / 2);
      rotationGapDays = Math.round(
        gaps.length % 2 === 0
          ? ((gaps[mid - 1] ?? 0) + (gaps[mid] ?? 0)) / 2
          : (gaps[mid] ?? 0)
      );
    }

    maps.push({
      map,
      mapType: sorted[0]?.mapType ?? "",
      history,
      lastPlayedDaysAgo,
      rotationGapDays,
    });
  }

  maps.sort((a, b) => b.history.length - a.history.length);

  return { maps };
}

// --- Session Grouping ---

const SESSION_GAP_MINUTES = 180;

function groupMatchesIntoSessions(matches: MatchData[]): MatchData[][] {
  if (matches.length === 0) return [];

  const sorted = [...matches].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime()
  );

  const sessions: MatchData[][] = [];
  let current: MatchData[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap =
      (sorted[i].playedAt.getTime() - current.at(-1)!.playedAt.getTime()) /
      (1000 * 60);
    if (gap >= SESSION_GAP_MINUTES) {
      sessions.push(current);
      current = [sorted[i]];
    } else {
      current.push(sorted[i]);
    }
  }
  sessions.push(current);
  return sessions;
}

// --- Session Analysis ---

type SessionEntry = {
  sessionIndex: number;
  date: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winrate: number;
  durationMinutes: number | null;
};

type SessionAnalysisResult = {
  sessions: SessionEntry[];
  avgSessionWinrate: number;
  avgGamesPerSession: number;
  bestSession: SessionEntry | null;
  worstSession: SessionEntry | null;
  insight: string;
};

function getSessionAnalysis(matches: MatchData[]): SessionAnalysisResult {
  if (matches.length === 0) {
    return {
      sessions: [],
      avgSessionWinrate: 0,
      avgGamesPerSession: 0,
      bestSession: null,
      worstSession: null,
      insight: "No matches recorded yet.",
    };
  }

  const rawSessions = groupMatchesIntoSessions(matches);

  const sessions: SessionEntry[] = rawSessions.map((group, i) => {
    const wins = group.filter((m) => m.result === "win").length;
    const losses = group.filter((m) => m.result === "loss").length;
    const winrate =
      group.length > 0 ? Math.round((wins / group.length) * 100) : 0;

    const first = group[0].playedAt;
    const last = group.at(-1)!.playedAt;
    const durationMinutes =
      group.length > 1
        ? Math.round((last.getTime() - first.getTime()) / (1000 * 60))
        : null;

    const dateStr = first.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      sessionIndex: i + 1,
      date: dateStr,
      gamesPlayed: group.length,
      wins,
      losses,
      winrate,
      durationMinutes,
    };
  });

  const totalWinrate = sessions.reduce((sum, s) => sum + s.winrate, 0);
  const avgSessionWinrate =
    sessions.length > 0 ? Math.round(totalWinrate / sessions.length) : 0;
  const avgGamesPerSession =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + s.gamesPlayed, 0) / sessions.length
        )
      : 0;

  const qualifiedSessions = sessions.filter((s) => s.gamesPlayed >= 2);
  const bestSession =
    qualifiedSessions.length > 0
      ? qualifiedSessions.reduce((best, s) =>
          s.winrate > best.winrate ? s : best
        )
      : null;
  const worstSession =
    qualifiedSessions.length > 0
      ? qualifiedSessions.reduce((worst, s) =>
          s.winrate < worst.winrate ? s : worst
        )
      : null;

  const insight =
    sessions.length === 1
      ? `1 session tracked — ${avgSessionWinrate}% winrate with ${avgGamesPerSession} game${avgGamesPerSession !== 1 ? "s" : ""}.`
      : `Across ${sessions.length} sessions you average ${avgSessionWinrate}% winrate and ${avgGamesPerSession} game${avgGamesPerSession !== 1 ? "s" : ""} per session.`;

  return {
    sessions,
    avgSessionWinrate,
    avgGamesPerSession,
    bestSession,
    worstSession,
    insight,
  };
}

// --- Day of Week ---

const SHORT_DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type DayOfWeekEntry = {
  day: string;
  dayIndex: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winrate: number;
};

type DayOfWeekResult = {
  data: DayOfWeekEntry[];
  bestDay: string;
  worstDay: string;
  weekdayWinrate: number;
  weekendWinrate: number;
  insight: string;
};

function getDayOfWeekStats(matches: MatchData[]): DayOfWeekResult {
  const counts = new Map<
    number,
    { wins: number; losses: number; draws: number }
  >();

  const sessions = groupMatchesIntoSessions(matches);
  for (const session of sessions) {
    const sessionDay = session[0].playedAt.getDay();
    for (const match of session) {
      const current = counts.get(sessionDay) ?? {
        wins: 0,
        losses: 0,
        draws: 0,
      };
      if (match.result === "win") current.wins++;
      else if (match.result === "loss") current.losses++;
      else current.draws++;
      counts.set(sessionDay, current);
    }
  }

  const data: DayOfWeekEntry[] = DAY_ORDER.map((dayIndex) => {
    const stats = counts.get(dayIndex) ?? { wins: 0, losses: 0, draws: 0 };
    const total = stats.wins + stats.losses + stats.draws;
    const winrate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
    return {
      day: SHORT_DAY_NAMES[dayIndex],
      dayIndex,
      ...stats,
      total,
      winrate,
    };
  });

  const daysWithGames = data.filter((d) => d.total > 0);

  let bestDay = "";
  let worstDay = "";
  if (daysWithGames.length > 0) {
    bestDay = daysWithGames.reduce((best, d) =>
      d.winrate > best.winrate ? d : best
    ).day;
    worstDay = daysWithGames.reduce((worst, d) =>
      d.winrate < worst.winrate ? d : worst
    ).day;
  }

  const weekdayEntries = data.filter((d) => d.dayIndex >= 1 && d.dayIndex <= 4);
  const weekendEntries = data.filter(
    (d) => d.dayIndex === 0 || d.dayIndex === 5 || d.dayIndex === 6
  );

  function weightedWinrate(entries: DayOfWeekEntry[]): number {
    const totalWins = entries.reduce((sum, d) => sum + d.wins, 0);
    const totalGames = entries.reduce((sum, d) => sum + d.total, 0);
    return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  }

  const weekdayWinrate = weightedWinrate(weekdayEntries);
  const weekendWinrate = weightedWinrate(weekendEntries);

  let insight: string;
  if (daysWithGames.length === 0) {
    insight = "No matches recorded yet.";
  } else if (weekdayWinrate === weekendWinrate) {
    insight = `You perform equally well on weekdays and weekends (${weekdayWinrate}%). Your best day is ${bestDay}.`;
  } else {
    const better = weekendWinrate > weekdayWinrate ? "weekends" : "weekdays";
    const diff = Math.abs(weekendWinrate - weekdayWinrate);
    insight = `You perform ${diff}% better on ${better}. Your strongest day is ${bestDay}.`;
  }

  return { data, bestDay, worstDay, weekdayWinrate, weekendWinrate, insight };
}

export {
  MAP_TYPES,
  GROUP_SIZE_MIN_MATCHES,
  HERO_MAP_MIN_GAMES,
  HERO_WINRATE_MIN_MATCHES,
  MAP_DETAILED_MIN_GAMES,
  MAP_LEARNING_MIN_GAMES,
  ONE_TRICK_THRESHOLD,
  ROLE_WINRATE_MIN_MATCHES,
  SPECIALIST_THRESHOLD,
  SWAP_MIN_PERCENTAGE,
  filterMatchesByRole,
  getActivityHeatmapData,
  getDayOfWeekStats,
  getGameModeDistribution,
  getGameModeWinrates,
  getGroupSizeWinrates,
  getHeroMapSynergy,
  getHeroPoolDiversity,
  getHeroSwapStats,
  getHeroWinrates,
  getMapDetailedStats,
  getMapFamiliarityData,
  getMapLearningCurve,
  getMapTimelineData,
  getMapWinLossData,
  getMostPlayedHeroes,
  getOneTrickStats,
  getRecentFormData,
  getRepeatMapData,
  getRoleStats,
  getRollingWinrateData,
  getSessionAnalysis,
  getStreakData,
  getSummaryStats,
};

export type {
  ActivityHeatmapResult,
  BestHeroPerMap,
  DayOfWeekEntry,
  DayOfWeekResult,
  GameModeDistResult,
  GameModeWinrateResult,
  GroupSizeEntry,
  GroupSizeInsight,
  GroupSizeResult,
  HeroMapCell,
  HeroMapSynergyResult,
  HeroPoolDiversityResult,
  HeroSwapEntry,
  HeroSwapResult,
  HeroWinrateResult,
  MapDetailedEntry,
  MapDetailedResult,
  MapFamiliarityEntry,
  MapFamiliarityResult,
  MapLearningEntry,
  MapLearningResult,
  MapTimelineEntry,
  MapTimelineMapData,
  MapTimelineResult,
  MapWinLossResult,
  MatchData,
  MatchHeroData,
  MostPlayedHeroResult,
  OneTrickResult,
  RecentFormData,
  RecentResult,
  RepeatMapResult,
  RoleDistEntry,
  RoleFilter,
  RoleFlexibilityData,
  RoleStatsInsight,
  RoleStatsResult,
  RoleWinrateEntry,
  RollingWinrateEntry,
  RollingWinrateResult,
  SessionAnalysisResult,
  SessionEntry,
  StreakData,
  SummaryStats,
  MapType,
};
