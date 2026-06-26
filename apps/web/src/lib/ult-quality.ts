import { round } from "@/lib/utils";
import { tagZone, type TaggableZone } from "@/lib/zones/tag";

/** Conversion kills count within this radius (meters) of the ult start. */
export const ULT_IMPACT_RADIUS = 20;
/** ... and within this many seconds after the ult start. */
export const ULT_IMPACT_WINDOW = 8;
/** Cap for ults whose end event never arrives. */
export const MAX_ULT_DURATION_SEC = 20;
/** Below this many ults, per-player aggregates are null. */
export const MIN_ULTS_FOR_STATS = 3;

export const ULT_STAT_TYPES = [
  "AVERAGE_ULT_CONVERSION_KILLS",
  "ULT_DEATH_PERCENTAGE",
  "AVERAGE_ULT_DISPLACEMENT",
  "ULTS_ON_OBJECTIVE_PERCENTAGE",
] as const;

export type UltStartEvent = {
  match_time: number;
  player_name: string;
  player_team: string;
  player_hero: string;
  ultimate_id: number;
  player_x: number | null;
  player_y: number | null;
  player_z: number | null;
};
export type UltEndEvent = UltStartEvent;

export type UltKill = {
  match_time: number;
  attacker_name: string;
  attacker_team: string;
  victim_name: string;
  victim_team: string;
  attacker_x: number | null;
  attacker_y: number | null;
  attacker_z: number | null;
  victim_x: number | null;
  victim_y: number | null;
  victim_z: number | null;
};

export type UltPair = {
  playerName: string;
  playerTeam: string;
  hero: string;
  ultimateId: number;
  startTime: number;
  endTime: number;
  unpaired: boolean;
  startX: number | null;
  startY: number | null;
  startZ: number | null;
  endX: number | null;
  endY: number | null;
  endZ: number | null;
};

export type UltInstance = {
  playerName: string;
  playerTeam: string;
  hero: string;
  startTime: number;
  endTime: number;
  unpaired: boolean;
  x: number | null;
  z: number | null;
  displacement: number | null;
  conversionKills: number | null;
  diedDuringUlt: boolean;
  zone: { name: string; category: "POINT" | "LANE" } | null;
};

export type UltQualityStats = {
  averageUltConversionKills: number | null;
  ultDeathPercentage: number | null;
  averageUltDisplacement: number | null;
  ultsOnObjectivePercentage: number | null;
};

/**
 * Match each UltimateStart to the earliest UltimateEnd with the same
 * player_name + ultimate_id at or after it. Unmatched starts are capped
 * at MAX_ULT_DURATION_SEC and flagged unpaired (real-data pairing
 * reliability is unverified — be defensive).
 */
export function pairUltEvents(
  starts: UltStartEvent[],
  ends: UltEndEvent[]
): UltPair[] {
  const used = new Set<UltEndEvent>();
  return starts.map((s) => {
    let match: UltEndEvent | null = null;
    for (const e of ends) {
      if (used.has(e)) continue;
      if (e.player_name !== s.player_name) continue;
      if (e.ultimate_id !== s.ultimate_id) continue;
      if (e.match_time < s.match_time) continue;
      if (!match || e.match_time < match.match_time) match = e;
    }
    if (match) used.add(match);
    return {
      playerName: s.player_name,
      playerTeam: s.player_team,
      hero: s.player_hero,
      ultimateId: s.ultimate_id,
      startTime: s.match_time,
      endTime: match ? match.match_time : s.match_time + MAX_ULT_DURATION_SEC,
      unpaired: !match,
      startX: s.player_x,
      startY: s.player_y,
      startZ: s.player_z,
      endX: match?.player_x ?? null,
      endY: match?.player_y ?? null,
      endZ: match?.player_z ?? null,
    };
  });
}

/**
 * zonesAt(matchTime) returns the published zones in effect for that
 * moment — calibration-wide for normal maps, the active sub-map's zones
 * for Control (sub-map arenas can overlap in world space).
 */
export function buildUltInstances(
  pairs: UltPair[],
  kills: UltKill[],
  zonesAt: (matchTime: number) => TaggableZone[]
): UltInstance[] {
  return pairs.map((p) => {
    const hasStartPos = p.startX != null && p.startZ != null;

    let conversionKills: number | null = null;
    if (hasStartPos) {
      conversionKills = 0;
      for (const k of kills) {
        if (k.attacker_team !== p.playerTeam) continue;
        if (k.match_time < p.startTime) continue;
        if (k.match_time > p.startTime + ULT_IMPACT_WINDOW) continue;
        const kx = k.attacker_x ?? k.victim_x;
        const kz = k.attacker_z ?? k.victim_z;
        if (kx == null || kz == null) continue;
        if (Math.hypot(kx - p.startX!, kz - p.startZ!) <= ULT_IMPACT_RADIUS) {
          conversionKills++;
        }
      }
    }

    const diedDuringUlt = kills.some(
      (k) =>
        k.victim_name === p.playerName &&
        k.match_time >= p.startTime &&
        k.match_time <= p.endTime
    );

    let displacement: number | null = null;
    if (hasStartPos && p.endX != null && p.endZ != null) {
      const dy = p.startY != null && p.endY != null ? p.endY - p.startY : 0;
      displacement = round(
        Math.hypot(p.endX - p.startX!, dy, p.endZ - p.startZ!)
      );
    }

    const zone = hasStartPos
      ? (tagZone(p.startX!, p.startZ!, zonesAt(p.startTime)) ?? null)
      : null;

    return {
      playerName: p.playerName,
      playerTeam: p.playerTeam,
      hero: p.hero,
      startTime: p.startTime,
      endTime: p.endTime,
      unpaired: p.unpaired,
      x: p.startX ?? null,
      z: p.startZ ?? null,
      displacement,
      conversionKills,
      diedDuringUlt,
      zone: zone ? { name: zone.name, category: zone.category } : null,
    };
  });
}

function avg(values: number[]): number | null {
  return values.length >= MIN_ULTS_FOR_STATS
    ? round(values.reduce((a, b) => a + b, 0) / values.length)
    : null;
}

/**
 * hasPointZones: whether the map has any published POINT zones — when
 * false, ultsOnObjectivePercentage is null (not 0): absence of zones is
 * missing data, not "never on objective".
 */
export function computeUltQualityStats(
  allInstances: UltInstance[],
  playerName: string,
  hasPointZones: boolean
): UltQualityStats {
  const ults = allInstances.filter((u) => u.playerName === playerName);
  if (ults.length < MIN_ULTS_FOR_STATS) {
    return {
      averageUltConversionKills: null,
      ultDeathPercentage: null,
      averageUltDisplacement: null,
      ultsOnObjectivePercentage: null,
    };
  }

  const conversions = ults
    .map((u) => u.conversionKills)
    .filter((v): v is number => v !== null);
  const displacements = ults
    .map((u) => u.displacement)
    .filter((v): v is number => v !== null);

  const withCoords = ults.filter((u) => u.x != null && u.z != null);
  let ultsOnObjectivePercentage: number | null = null;
  if (hasPointZones && withCoords.length >= MIN_ULTS_FOR_STATS) {
    const onPoint = withCoords.filter(
      (u) => u.zone?.category === "POINT"
    ).length;
    ultsOnObjectivePercentage = round((onPoint / withCoords.length) * 100);
  }

  return {
    averageUltConversionKills: avg(conversions),
    ultDeathPercentage: round(
      (ults.filter((u) => u.diedDuringUlt).length / ults.length) * 100
    ),
    averageUltDisplacement: avg(displacements),
    ultsOnObjectivePercentage,
  };
}
