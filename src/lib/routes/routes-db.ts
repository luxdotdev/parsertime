import { CONTROL_OBJECTIVE_MAP } from "@/lib/map-calibration/control-map-index";
import prisma from "@/lib/prisma";
import { clusterRoutes } from "@/lib/routes/cluster";
import {
  extractRoutes,
  type ContactEvent,
  type DeathEvent,
  type Route,
  type RouteSample,
} from "@/lib/routes/extract";
import {
  buildObjectivePeriods,
  objectivePeriodOutcomes,
} from "@/lib/routes/objective-outcome";
import {
  partitionRoutesByObjective,
  type ObjectiveRoundMark,
} from "@/lib/routes/partition";
import { roundOutcomes } from "@/lib/routes/round-outcome";
import { zoneSignature } from "@/lib/routes/zone-signature";
import type { TaggableZone } from "@/lib/zones/tag";

type ZoneContext = {
  zonesAt: (matchTime: number) => TaggableZone[];
  hasPointZones: boolean;
};

type RouteContext = {
  routes: Route[];
  outcomes: Map<number, string | null>;
  zoneContext: ZoneContext;
  team1Name: string;
  team2Name: string;
  mapName: string | null;
  roundStarts: ObjectiveRoundMark[];
};

function toTaggable(
  zones: {
    id: number;
    name: string;
    category: string;
    vertices: unknown;
  }[]
): TaggableZone[] {
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    category: z.category as "POINT" | "LANE",
    vertices: z.vertices as [number, number][],
  }));
}

/**
 * Published zones for a MapData's map. Control maps: one zone set per
 * sub-map, selected by the round's objective_index at the given time
 * (sub-map arenas can overlap in world space — never tag across them).
 *
 * INTENTIONAL DUPLICATION: this mirrors `loadZoneContext` in
 * `@/lib/ult-quality-db.ts`. Route analysis (plan D2) must stay
 * independent of fight/ult quality (plan C), so the logic is copied here
 * rather than imported. A future pass can consolidate both into a shared
 * zone-context helper.
 */
async function loadZoneContext(mapDataId: number): Promise<ZoneContext> {
  const mapData = await prisma.mapData.findUnique({
    where: { id: mapDataId },
    select: { Map: { select: { name: true } } },
  });
  const mapName = mapData?.Map?.name;
  if (!mapName) return { zonesAt: () => [], hasPointZones: false };

  const subMaps = CONTROL_OBJECTIVE_MAP[mapName];
  if (!subMaps) {
    const calibration = await prisma.mapCalibration.findUnique({
      where: { mapName },
      select: {
        zones: {
          where: { status: "PUBLISHED" },
          select: { id: true, name: true, category: true, vertices: true },
        },
      },
    });
    const zones = toTaggable(calibration?.zones ?? []);
    return {
      zonesAt: () => zones,
      hasPointZones: zones.some((z) => z.category === "POINT"),
    };
  }

  // Control: zones per objective_index, rounds assign times to indexes
  const [calibrations, roundStarts] = await Promise.all([
    prisma.mapCalibration.findMany({
      where: { mapName: { in: subMaps } },
      select: {
        mapName: true,
        zones: {
          where: { status: "PUBLISHED" },
          select: { id: true, name: true, category: true, vertices: true },
        },
      },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, objective_index: true },
      orderBy: { match_time: "asc" },
    }),
  ]);
  const zonesByIndex = new Map<number, TaggableZone[]>();
  subMaps.forEach((subName, idx) => {
    const cal = calibrations.find((c) => c.mapName === subName);
    if (cal) zonesByIndex.set(idx, toTaggable(cal.zones));
  });
  function zonesAt(t: number): TaggableZone[] {
    let current: number | null = null;
    for (const r of roundStarts) {
      if (r.match_time <= t) current = r.objective_index;
      else break;
    }
    return current !== null ? (zonesByIndex.get(current) ?? []) : [];
  }
  const hasPointZones = [...zonesByIndex.values()].some((zones) =>
    zones.some((z) => z.category === "POINT")
  );
  return { zonesAt, hasPointZones };
}

export type SubMapRoutes = {
  routes: (Route & {
    outcome: "WON" | "LOST" | "UNKNOWN";
    signature: string | null;
  })[];
  clusters: {
    routeIndexes: number[];
    medoidIndex: number;
    label: string | null;
    outcomes: { won: number; lost: number; unknown: number };
  }[];
  team1Name: string;
  team2Name: string;
};

/** Back-compat alias for the flat builder's callers. */
export type RouteAnalysis = SubMapRoutes;

export type ControlSubMapRoutes = {
  objectiveIndex: number;
  calibrationMapName: string; // e.g. "Busan: Downtown" — the loadCalibration key
  subMapName: string; // e.g. "Downtown" — the tab label
  analysis: SubMapRoutes;
};

export type RouteAnalysisResult =
  | { type: "single"; analysis: SubMapRoutes }
  | { type: "control"; subMaps: ControlSubMapRoutes[] };

function pushSample(
  arr: RouteSample[],
  t: number,
  playerName: string,
  playerTeam: string,
  x: number | null,
  z: number | null
): void {
  if (x != null && z != null) {
    arr.push({ t, playerName, playerTeam, x, z });
  }
}

async function loadRouteContext(
  mapDataId: number
): Promise<RouteContext | null> {
  const [
    kills,
    damage,
    healing,
    ability1,
    ability2,
    ultStarts,
    ultEnds,
    objectiveUpdated,
    objectiveCaptured,
    roundStarts,
    roundEnds,
    matchStart,
  ] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        victim_name: true,
        victim_team: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.damage.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        victim_name: true,
        victim_team: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.healing.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        healer_name: true,
        healer_team: true,
        healer_x: true,
        healer_z: true,
        healee_name: true,
        healee_team: true,
        healee_x: true,
        healee_z: true,
      },
    }),
    prisma.ability1Used.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateEnd.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.objectiveUpdated.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, round_number: true },
      orderBy: { match_time: "asc" },
    }),
    prisma.objectiveCaptured.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, capturing_team: true },
      orderBy: { match_time: "asc" },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        round_number: true,
        objective_index: true,
      },
      orderBy: { match_time: "asc" },
    }),
    prisma.roundEnd.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        round_number: true,
        team_1_score: true,
        team_2_score: true,
      },
    }),
    prisma.matchStart.findFirst({
      where: { MapDataId: mapDataId },
      select: {
        team_1_name: true,
        team_2_name: true,
        map_name: true,
        map_type: true,
      },
    }),
  ]);

  const samples: RouteSample[] = [];
  for (const k of kills) {
    pushSample(
      samples,
      k.match_time,
      k.attacker_name,
      k.attacker_team,
      k.attacker_x,
      k.attacker_z
    );
    pushSample(
      samples,
      k.match_time,
      k.victim_name,
      k.victim_team,
      k.victim_x,
      k.victim_z
    );
  }
  for (const d of damage) {
    pushSample(
      samples,
      d.match_time,
      d.attacker_name,
      d.attacker_team,
      d.attacker_x,
      d.attacker_z
    );
    pushSample(
      samples,
      d.match_time,
      d.victim_name,
      d.victim_team,
      d.victim_x,
      d.victim_z
    );
  }
  for (const h of healing) {
    pushSample(
      samples,
      h.match_time,
      h.healer_name,
      h.healer_team,
      h.healer_x,
      h.healer_z
    );
    pushSample(
      samples,
      h.match_time,
      h.healee_name,
      h.healee_team,
      h.healee_x,
      h.healee_z
    );
  }
  for (const a of ability1) {
    pushSample(
      samples,
      a.match_time,
      a.player_name,
      a.player_team,
      a.player_x,
      a.player_z
    );
  }
  for (const a of ability2) {
    pushSample(
      samples,
      a.match_time,
      a.player_name,
      a.player_team,
      a.player_x,
      a.player_z
    );
  }
  for (const u of ultStarts) {
    pushSample(
      samples,
      u.match_time,
      u.player_name,
      u.player_team,
      u.player_x,
      u.player_z
    );
  }
  for (const u of ultEnds) {
    pushSample(
      samples,
      u.match_time,
      u.player_name,
      u.player_team,
      u.player_x,
      u.player_z
    );
  }
  samples.sort((a, b) => a.t - b.t);

  // Contact is a time fact — coords not required.
  const contacts: ContactEvent[] = [];
  for (const k of kills) {
    contacts.push({
      t: k.match_time,
      players: [k.attacker_name, k.victim_name],
    });
  }
  for (const d of damage) {
    contacts.push({
      t: d.match_time,
      players: [d.attacker_name, d.victim_name],
    });
  }

  const deaths: DeathEvent[] = kills.map((k) => ({
    t: k.match_time,
    playerName: k.victim_name,
  }));

  const maxSampleT = samples.length ? samples[samples.length - 1].t : 0;
  const maxRoundEndT = roundEnds.reduce(
    (acc, r) => Math.max(acc, r.match_time),
    0
  );
  const maxTime = Math.max(maxSampleT, maxRoundEndT);

  const team1Name = matchStart?.team_1_name ?? "Team 1";
  const team2Name = matchStart?.team_2_name ?? "Team 2";

  // No coordinate data at all → empty state.
  if (samples.length === 0) return null;

  // Life boundaries: round starts plus objective transitions. Flashpoint
  // logs emit a single round_start, so the per-flashpoint transitions in
  // ObjectiveUpdated (which carry the new round's number) are the real
  // boundaries there; on Control they coincide with round starts and are
  // deduped away.
  const boundaryMarks = roundStarts.map((r) => ({
    t: r.match_time,
    roundNumber: r.round_number,
  }));
  for (const o of objectiveUpdated) {
    if (boundaryMarks.some((m) => Math.abs(m.t - o.match_time) < 2)) continue;
    boundaryMarks.push({ t: o.match_time, roundNumber: o.round_number });
  }

  const routes = extractRoutes(
    samples,
    contacts,
    deaths,
    boundaryMarks,
    maxTime
  );

  // Outcome resolution: RoundEnd score deltas where decisive, objective
  // capture periods as the fallback (the only working source on
  // Flashpoint, where RoundEnd is a single final-score row).
  const captureOutcomes = objectivePeriodOutcomes(
    buildObjectivePeriods(
      objectiveUpdated.map((o) => ({
        t: o.match_time,
        roundNumber: o.round_number,
      })),
      maxTime
    ),
    objectiveCaptured.map((c) => ({
      t: c.match_time,
      capturingTeam: c.capturing_team,
    }))
  );
  const scoreOutcomes = roundOutcomes(
    roundEnds.map((r) => ({
      roundNumber: r.round_number,
      team1Score: r.team_1_score,
      team2Score: r.team_2_score,
    })),
    team1Name,
    team2Name
  );
  const outcomes = new Map<number, string | null>(captureOutcomes);
  for (const [round, winner] of scoreOutcomes) {
    if (winner != null) outcomes.set(round, winner);
    else if (!outcomes.has(round)) outcomes.set(round, null);
  }

  const zoneContext = await loadZoneContext(mapDataId);

  return {
    routes,
    outcomes,
    zoneContext,
    team1Name,
    team2Name,
    mapName: matchStart?.map_name ?? null,
    roundStarts: roundStarts.map((r) => ({
      match_time: r.match_time,
      objective_index: r.objective_index,
    })),
  };
}

function buildSubMapRoutes(
  routes: Route[],
  outcomes: Map<number, string | null>,
  zoneContext: ZoneContext,
  team1Name: string,
  team2Name: string
): SubMapRoutes {
  const augmentedRoutes: SubMapRoutes["routes"] = routes.map((route) => {
    const winner = outcomes.get(route.roundNumber);
    let outcome: "WON" | "LOST" | "UNKNOWN";
    if (winner == null) outcome = "UNKNOWN";
    else if (winner === route.playerTeam) outcome = "WON";
    else outcome = "LOST";

    return {
      ...route,
      outcome,
      signature: zoneSignature(route.points, zoneContext.zonesAt(route.startT)),
    };
  });

  const rawClusters = clusterRoutes(routes.map((r) => r.points));
  const clusters: SubMapRoutes["clusters"] = rawClusters.map((cluster) => {
    const counts = { won: 0, lost: 0, unknown: 0 };
    for (const idx of cluster.routeIndexes) {
      const outcome = augmentedRoutes[idx].outcome;
      if (outcome === "WON") counts.won++;
      else if (outcome === "LOST") counts.lost++;
      else counts.unknown++;
    }
    return {
      routeIndexes: cluster.routeIndexes,
      medoidIndex: cluster.medoidIndex,
      label: augmentedRoutes[cluster.medoidIndex]?.signature ?? null,
      outcomes: counts,
    };
  });

  return { routes: augmentedRoutes, clusters, team1Name, team2Name };
}

export async function buildRouteAnalysisForMapData(
  mapDataId: number
): Promise<RouteAnalysis | null> {
  const ctx = await loadRouteContext(mapDataId);
  if (!ctx) return null;
  return buildSubMapRoutes(
    ctx.routes,
    ctx.outcomes,
    ctx.zoneContext,
    ctx.team1Name,
    ctx.team2Name
  );
}

export async function buildRouteTabAnalysis(
  mapDataId: number
): Promise<RouteAnalysisResult | null> {
  const ctx = await loadRouteContext(mapDataId);
  if (!ctx) return null;

  const subMapNames = ctx.mapName
    ? CONTROL_OBJECTIVE_MAP[ctx.mapName]
    : undefined;

  // Non-control maps: a single view over all routes.
  if (!ctx.mapName || !subMapNames) {
    return {
      type: "single",
      analysis: buildSubMapRoutes(
        ctx.routes,
        ctx.outcomes,
        ctx.zoneContext,
        ctx.team1Name,
        ctx.team2Name
      ),
    };
  }

  // Control maps: one entry per capture point, in objective_index order.
  // Sub-maps with no routes yield an empty analysis (shown as an empty tab).
  const byIndex = partitionRoutesByObjective(ctx.routes, ctx.roundStarts);
  const subMaps: ControlSubMapRoutes[] = subMapNames.map(
    (calibrationMapName, objectiveIndex) => {
      const colonIdx = calibrationMapName.indexOf(": ");
      const subMapName =
        colonIdx >= 0
          ? calibrationMapName.slice(colonIdx + 2)
          : calibrationMapName;
      return {
        objectiveIndex,
        calibrationMapName,
        subMapName,
        analysis: buildSubMapRoutes(
          byIndex.get(objectiveIndex) ?? [],
          ctx.outcomes,
          ctx.zoneContext,
          ctx.team1Name,
          ctx.team2Name
        ),
      };
    }
  );

  return { type: "control", subMaps };
}
