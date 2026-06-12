import { EffectObservabilityLive } from "@/instrumentation";
import {
  getControlSubMapName,
  getControlSubMapNames,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import type { MapTransform } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import { $Enums } from "@/generated/prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "./errors";
import { mapCacheMissTotal, mapCacheRequestTotal } from "./metrics";
import type {
  HeatPoint,
  KillContribution,
  PlayerHeatLayer,
  PlayerHeatmapResult,
  PlayerHeatmapSubMap,
  PlayerMarkerLayer,
  PlayerMarkerPoint,
  PlayerRole,
  PlayerTelemetry,
  PlayerTelemetryResult,
  TelemetryChannel,
  TelemetrySeriesPoint,
} from "./player-telemetry-types";

// ── KDE smoothing (mirrors the map tempo curve for visual consistency) ───────

/** Kernel width in seconds. Wide enough to read as a continuous trace. */
const SIGMA_SEC = 4;
/** Sample spacing in seconds for the rendered series. */
const SAMPLE_INTERVAL = 0.5;
const NORM = SIGMA_SEC * Math.sqrt(2 * Math.PI);
const TWO_SIGMA_SQ = 2 * SIGMA_SEC * SIGMA_SEC;

type WeightedEvent = { time: number; weight: number };

/**
 * Smooth a stream of weighted events into a continuous rate (units/second)
 * using a Gaussian kernel, sampled across the whole map. Returns the series,
 * its peak rate, and the summed weight (e.g. total damage).
 */
function weightedRateSeries(
  events: WeightedEvent[],
  start: number,
  end: number
): TelemetryChannel {
  const span = Math.max(0, end - start);
  const n = Math.floor(span / SAMPLE_INTERVAL) + 1;
  const values = new Float64Array(n);

  let total = 0;
  for (const e of events) {
    total += e.weight;
    const lo = Math.max(
      0,
      Math.floor((e.time - 3 * SIGMA_SEC - start) / SAMPLE_INTERVAL)
    );
    const hi = Math.min(
      n - 1,
      Math.ceil((e.time + 3 * SIGMA_SEC - start) / SAMPLE_INTERVAL)
    );
    for (let i = lo; i <= hi; i++) {
      const t = start + i * SAMPLE_INTERVAL;
      const diff = t - e.time;
      values[i] += e.weight * Math.exp(-(diff * diff) / TWO_SIGMA_SQ);
    }
  }

  let peak = 0;
  const points: TelemetrySeriesPoint[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i] / NORM;
    points.push({ time: start + i * SAMPLE_INTERVAL, value });
    if (value > peak) peak = value;
  }

  return { points, peak, total };
}

// ── Focus fire ────────────────────────────────────────────────────────────────

/** Seconds before a kill counted as the burst that secured it. */
const FOCUS_WINDOW_SEC = 5;

type TeamKill = { match_time: number; victim_name: string };
type EnemyDamage = {
  match_time: number;
  victim_name: string;
  attacker_name: string;
  event_damage: number;
};

/**
 * For every kill the player's team secured, sum the damage dealt to that victim
 * in the {@link FOCUS_WINDOW_SEC}-second window before death and compute the
 * player's share. Returns the distribution of those shares across kills plus the
 * overall focus contribution and participation rate. Kills with no tracked
 * damage in the window (melee, environmental) are skipped.
 */
function computeKillContribution(
  teamKills: TeamKill[],
  enemyDamage: EnemyDamage[],
  playerName: string
): KillContribution {
  const byVictim = new Map<
    string,
    { t: number; attacker: string; dmg: number }[]
  >();
  for (const d of enemyDamage) {
    const arr = byVictim.get(d.victim_name) ?? [];
    arr.push({
      t: d.match_time,
      attacker: d.attacker_name,
      dmg: d.event_damage,
    });
    byVictim.set(d.victim_name, arr);
  }
  for (const arr of byVictim.values()) arr.sort((a, b) => a.t - b.t);

  const bins = [0, 0, 0, 0, 0];
  let participated = 0;
  let killsWithDamage = 0;
  let totalPlayer = 0;
  let totalTeam = 0;

  for (const k of teamKills) {
    const arr = byVictim.get(k.victim_name);
    if (!arr) continue;
    let team = 0;
    let player = 0;
    for (const ev of arr) {
      if (ev.t > k.match_time) break;
      if (ev.t >= k.match_time - FOCUS_WINDOW_SEC) {
        team += ev.dmg;
        if (ev.attacker === playerName) player += ev.dmg;
      }
    }
    if (team <= 0) continue;
    killsWithDamage++;
    totalTeam += team;
    totalPlayer += player;
    if (player > 0) participated++;
    const pct = (player / team) * 100;
    const idx =
      pct === 0 ? 0 : pct <= 25 ? 1 : pct <= 50 ? 2 : pct <= 75 ? 3 : 4;
    bins[idx]++;
  }

  return {
    bins,
    focusContribution:
      totalTeam > 0 ? Math.round((totalPlayer / totalTeam) * 100) : 0,
    participation:
      killsWithDamage > 0
        ? Math.round((participated / killsWithDamage) * 100)
        : 0,
    totalKills: killsWithDamage,
  };
}

// ── Positional helpers ───────────────────────────────────────────────────────

type RawPoint = { match_time: number; x: number | null; z: number | null };
type RawMarker = RawPoint & {
  hero: string;
  label: string;
  ability?: string;
};

type RawHeatmap = {
  damageDealt: RawPoint[];
  damageTaken: RawPoint[];
  healingDealt: RawPoint[];
  kills: RawMarker[];
  deaths: RawMarker[];
  abilities: RawMarker[];
};

function transformPoints(pts: RawPoint[], t: MapTransform): HeatPoint[] {
  const out: HeatPoint[] = [];
  for (const p of pts) {
    if (p.x == null || p.z == null) continue;
    out.push(worldToImage({ x: p.x, y: p.z }, t));
  }
  return out;
}

function transformMarkers(
  ms: RawMarker[],
  t: MapTransform
): PlayerMarkerPoint[] {
  const out: PlayerMarkerPoint[] = [];
  for (const m of ms) {
    if (m.x == null || m.z == null) continue;
    const { u, v } = worldToImage({ x: m.x, y: m.z }, t);
    out.push({
      u,
      v,
      time: m.match_time,
      hero: m.hero,
      label: m.label,
      ability: m.ability,
    });
  }
  return out;
}

function buildSubMap(
  subMapName: string,
  cal: NonNullable<Awaited<ReturnType<typeof loadCalibration>>>,
  raw: RawHeatmap
): PlayerHeatmapSubMap {
  const heatLayers: PlayerHeatLayer[] = [];
  const dealt = transformPoints(raw.damageDealt, cal.transform);
  const taken = transformPoints(raw.damageTaken, cal.transform);
  const healing = transformPoints(raw.healingDealt, cal.transform);
  if (dealt.length) heatLayers.push({ key: "damageDealt", points: dealt });
  if (taken.length) heatLayers.push({ key: "damageTaken", points: taken });
  if (healing.length) heatLayers.push({ key: "healingDealt", points: healing });

  const markerLayers: PlayerMarkerLayer[] = [];
  const kills = transformMarkers(raw.kills, cal.transform);
  const deaths = transformMarkers(raw.deaths, cal.transform);
  const abilities = transformMarkers(raw.abilities, cal.transform);
  if (kills.length) markerLayers.push({ key: "kills", points: kills });
  if (deaths.length) markerLayers.push({ key: "deaths", points: deaths });
  if (abilities.length)
    markerLayers.push({ key: "abilities", points: abilities });

  return {
    subMapName,
    imagePresignedUrl: cal.imagePresignedUrl,
    imageWidth: cal.imageWidth,
    imageHeight: cal.imageHeight,
    heatLayers,
    markerLayers,
  };
}

function hasAnyCoords(raw: RawHeatmap): boolean {
  function hit(p: RawPoint) {
    return p.x != null && p.z != null;
  }
  return (
    raw.damageDealt.some(hit) ||
    raw.damageTaken.some(hit) ||
    raw.healingDealt.some(hit) ||
    raw.kills.some(hit) ||
    raw.deaths.some(hit) ||
    raw.abilities.some(hit)
  );
}

// ── Service ──────────────────────────────────────────────────────────────────

export type PlayerTelemetryServiceInterface = {
  readonly getPlayerTelemetry: (
    mapId: number,
    playerName: string
  ) => Effect.Effect<PlayerTelemetryResult, MapQueryError>;
};

export class PlayerTelemetryService extends Context.Tag(
  "@app/data/map/PlayerTelemetryService"
)<PlayerTelemetryService, PlayerTelemetryServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<PlayerTelemetryServiceInterface> = Effect.gen(
  function* () {
    function compute(
      mapId: number,
      playerName: string
    ): Effect.Effect<PlayerTelemetryResult, MapQueryError> {
      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapId", mapId);

        const mapDataId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapId),
          catch: (error) =>
            new MapQueryError({
              operation: "resolve map data id for player telemetry",
              cause: error,
            }),
        });

        const where = { MapDataId: mapDataId };
        const fetched = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.matchStart.findFirst({
                where,
                select: {
                  map_name: true,
                  map_type: true,
                  team_1_name: true,
                  team_2_name: true,
                  match_time: true,
                },
              }),
              prisma.matchEnd.findFirst({
                where,
                select: { match_time: true },
              }),
              prisma.roundStart.findMany({
                where,
                select: {
                  match_time: true,
                  round_number: true,
                  objective_index: true,
                },
                orderBy: { match_time: "asc" },
              }),
              prisma.playerStat.findMany({
                where,
                select: {
                  player_name: true,
                  player_hero: true,
                  hero_time_played: true,
                  player_team: true,
                },
              }),
              prisma.damage.findMany({
                where: { ...where, attacker_name: playerName },
                select: {
                  match_time: true,
                  event_damage: true,
                  attacker_x: true,
                  attacker_z: true,
                  victim_name: true,
                  victim_team: true,
                  victim_hero: true,
                },
              }),
              prisma.damage.findMany({
                where: { ...where, victim_name: playerName },
                select: {
                  match_time: true,
                  event_damage: true,
                  victim_x: true,
                  victim_z: true,
                  attacker_name: true,
                  attacker_team: true,
                  attacker_hero: true,
                },
              }),
              prisma.healing.findMany({
                where: { ...where, healer_name: playerName },
                select: {
                  match_time: true,
                  event_healing: true,
                  healer_x: true,
                  healer_z: true,
                },
              }),
              prisma.healing.findMany({
                where: { ...where, healee_name: playerName },
                select: { match_time: true, event_healing: true },
              }),
              prisma.kill.findMany({
                where: { ...where, attacker_name: playerName },
                select: {
                  match_time: true,
                  attacker_hero: true,
                  victim_name: true,
                  victim_hero: true,
                  event_ability: true,
                  victim_x: true,
                  victim_z: true,
                },
              }),
              prisma.kill.findMany({
                where: { ...where, victim_name: playerName },
                select: {
                  match_time: true,
                  attacker_name: true,
                  attacker_hero: true,
                  victim_hero: true,
                  event_ability: true,
                  victim_x: true,
                  victim_z: true,
                },
              }),
              prisma.ultimateStart.findMany({
                where: { ...where, player_name: playerName },
                select: {
                  match_time: true,
                  player_hero: true,
                  player_x: true,
                  player_z: true,
                },
              }),
              prisma.ability1Used.findMany({
                where: { ...where, player_name: playerName },
                select: {
                  match_time: true,
                  player_hero: true,
                  player_x: true,
                  player_z: true,
                },
              }),
              prisma.ability2Used.findMany({
                where: { ...where, player_name: playerName },
                select: {
                  match_time: true,
                  player_hero: true,
                  player_x: true,
                  player_z: true,
                },
              }),
              prisma.heroSwap.findMany({
                where: { ...where, player_name: playerName },
                select: {
                  match_time: true,
                  player_hero: true,
                  previous_hero: true,
                },
                orderBy: { match_time: "asc" },
              }),
            ]),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch player telemetry events",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.playerTelemetry.fetch", {
            attributes: { mapId, mapDataId },
          })
        );

        const [
          matchStart,
          matchEnd,
          roundStarts,
          allPlayerStats,
          dmgDealt,
          dmgTaken,
          healDealt,
          healReceived,
          killsAsAttacker,
          killsAsVictim,
          ults,
          ability1,
          ability2,
          heroSwaps,
        ] = fetched;

        const hasEvents =
          dmgDealt.length +
            dmgTaken.length +
            healDealt.length +
            healReceived.length +
            killsAsAttacker.length +
            killsAsVictim.length +
            ults.length +
            ability1.length +
            ability2.length >
          0;

        if (!matchStart || !hasEvents) {
          return { type: "no_data" } as const;
        }

        const startTime = matchStart.match_time;
        const lastEventTime = Math.max(
          startTime,
          ...dmgDealt.map((d) => d.match_time),
          ...dmgTaken.map((d) => d.match_time),
          ...killsAsAttacker.map((k) => k.match_time),
          ...killsAsVictim.map((k) => k.match_time)
        );
        const endTime = matchEnd?.match_time ?? lastEventTime;

        // Role + team from the player's most-played hero.
        const playerStats = allPlayerStats.filter(
          (s) => s.player_name === playerName
        );
        const heroTime = new Map<string, number>();
        for (const s of playerStats) {
          heroTime.set(
            s.player_hero,
            Math.max(heroTime.get(s.player_hero) ?? 0, s.hero_time_played)
          );
        }
        let topHero = playerStats[0]?.player_hero ?? "";
        let maxTime = -1;
        for (const [hero, time] of heroTime) {
          if (time > maxTime) {
            maxTime = time;
            topHero = hero;
          }
        }
        const role: PlayerRole =
          heroRoleMapping[topHero as HeroName] ?? "Damage";
        const playerTeamName = playerStats[0]?.player_team ?? "";
        const playerTeam =
          playerTeamName === matchStart.team_1_name ? "Team1" : "Team2";

        const channels = {
          damageDealt: weightedRateSeries(
            dmgDealt.map((d) => ({
              time: d.match_time,
              weight: d.event_damage,
            })),
            startTime,
            endTime
          ),
          damageTaken: weightedRateSeries(
            dmgTaken.map((d) => ({
              time: d.match_time,
              weight: d.event_damage,
            })),
            startTime,
            endTime
          ),
          healingDealt: weightedRateSeries(
            healDealt.map((h) => ({
              time: h.match_time,
              weight: h.event_healing,
            })),
            startTime,
            endTime
          ),
          healingReceived: weightedRateSeries(
            healReceived.map((h) => ({
              time: h.match_time,
              weight: h.event_healing,
            })),
            startTime,
            endTime
          ),
        };

        // Damage dealt to enemies, split by the victim's role (time-series +
        // totals) and tallied per opponent. Self / friendly events are skipped.
        const roleEvents: Record<PlayerRole, WeightedEvent[]> = {
          Tank: [],
          Damage: [],
          Support: [],
        };
        const roleTotals = { tank: 0, damage: 0, support: 0 };
        const dealtByOpponent = new Map<string, number>();
        for (const d of dmgDealt) {
          if (d.victim_team === playerTeamName) continue;
          dealtByOpponent.set(
            d.victim_name,
            (dealtByOpponent.get(d.victim_name) ?? 0) + d.event_damage
          );
          const victimRole = heroRoleMapping[d.victim_hero as HeroName];
          if (!victimRole) continue;
          roleEvents[victimRole].push({
            time: d.match_time,
            weight: d.event_damage,
          });
          if (victimRole === "Tank") roleTotals.tank += d.event_damage;
          else if (victimRole === "Support")
            roleTotals.support += d.event_damage;
          else roleTotals.damage += d.event_damage;
        }

        // Damage the player took from enemies, tallied per opponent and split
        // by the attacker's role (mirror of the damage-dealt role split).
        const receivedByOpponent = new Map<string, number>();
        const takenRoleTotals = { tank: 0, damage: 0, support: 0 };
        for (const d of dmgTaken) {
          if (d.attacker_team === playerTeamName) continue;
          receivedByOpponent.set(
            d.attacker_name,
            (receivedByOpponent.get(d.attacker_name) ?? 0) + d.event_damage
          );
          const attackerRole = heroRoleMapping[d.attacker_hero as HeroName];
          if (!attackerRole) continue;
          if (attackerRole === "Tank") takenRoleTotals.tank += d.event_damage;
          else if (attackerRole === "Support")
            takenRoleTotals.support += d.event_damage;
          else takenRoleTotals.damage += d.event_damage;
        }

        // Enemy roster + each enemy's most-played hero, for the matchup radar.
        const enemyTopHero = new Map<string, { hero: string; time: number }>();
        for (const s of allPlayerStats) {
          if (s.player_team === playerTeamName) continue;
          const current = enemyTopHero.get(s.player_name);
          if (!current || s.hero_time_played > current.time) {
            enemyTopHero.set(s.player_name, {
              hero: s.player_hero,
              time: s.hero_time_played,
            });
          }
        }
        const opponents = [...enemyTopHero.entries()]
          .map(([name, { hero }]) => ({
            name,
            hero,
            dealt: Math.round(dealtByOpponent.get(name) ?? 0),
            received: Math.round(receivedByOpponent.get(name) ?? 0),
          }))
          .sort((a, b) => b.dealt + b.received - (a.dealt + a.received));

        const enemyTeamName =
          playerTeamName === matchStart.team_1_name
            ? matchStart.team_2_name
            : matchStart.team_1_name;

        const [teamKills, enemyDamage] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.kill.findMany({
                where: {
                  MapDataId: mapDataId,
                  attacker_team: playerTeamName,
                  victim_team: enemyTeamName,
                },
                select: { match_time: true, victim_name: true },
              }),
              prisma.damage.findMany({
                where: { MapDataId: mapDataId, victim_team: enemyTeamName },
                select: {
                  match_time: true,
                  victim_name: true,
                  attacker_name: true,
                  event_damage: true,
                },
              }),
            ]),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch focus-fire data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.playerTelemetry.focusFire", {
            attributes: { mapId, mapDataId },
          })
        );

        const killContribution = computeKillContribution(
          teamKills,
          enemyDamage,
          playerName
        );

        const rounds = roundStarts.map((r, i) => ({
          roundNumber: r.round_number,
          start: r.match_time,
          end: roundStarts[i + 1]?.match_time ?? endTime,
        }));

        const telemetry: PlayerTelemetry = {
          matchStartTime: startTime,
          matchEndTime: endTime,
          role,
          playerTeam,
          topHero,
          channels,
          damageByRole: {
            tank: weightedRateSeries(roleEvents.Tank, startTime, endTime),
            damage: weightedRateSeries(roleEvents.Damage, startTime, endTime),
            support: weightedRateSeries(roleEvents.Support, startTime, endTime),
          },
          damageByRoleTotals: roleTotals,
          damageTakenByRoleTotals: takenRoleTotals,
          killContribution,
          opponents,
          totals: {
            damageDealt: channels.damageDealt.total,
            damageTaken: channels.damageTaken.total,
            healingDealt: channels.healingDealt.total,
            healingReceived: channels.healingReceived.total,
            eliminations: killsAsAttacker.length,
            deaths: killsAsVictim.length,
          },
          ults: ults.map((u) => ({ time: u.match_time, hero: u.player_hero })),
          abilities: [
            ...ability1.map((a) => ({
              time: a.match_time,
              hero: a.player_hero,
              slot: 1 as const,
            })),
            ...ability2.map((a) => ({
              time: a.match_time,
              hero: a.player_hero,
              slot: 2 as const,
            })),
          ].sort((a, b) => a.time - b.time),
          kills: killsAsAttacker.map((k) => ({
            time: k.match_time,
            playerHero: k.attacker_hero,
            victimName: k.victim_name,
            victimHero: k.victim_hero,
            ability: k.event_ability,
          })),
          deaths: killsAsVictim.map((k) => ({
            time: k.match_time,
            attackerName: k.attacker_name,
            attackerHero: k.attacker_hero,
            playerHero: k.victim_hero,
            ability: k.event_ability,
          })),
          heroSwaps: heroSwaps.map((h) => ({
            time: h.match_time,
            fromHero: h.previous_hero,
            toHero: h.player_hero,
          })),
          rounds,
        };

        // Build the player-scoped positional heatmap.
        const raw: RawHeatmap = {
          damageDealt: dmgDealt.map((d) => ({
            match_time: d.match_time,
            x: d.attacker_x,
            z: d.attacker_z,
          })),
          damageTaken: dmgTaken.map((d) => ({
            match_time: d.match_time,
            x: d.victim_x,
            z: d.victim_z,
          })),
          healingDealt: healDealt.map((h) => ({
            match_time: h.match_time,
            x: h.healer_x,
            z: h.healer_z,
          })),
          kills: killsAsAttacker.map((k) => ({
            match_time: k.match_time,
            x: k.victim_x,
            z: k.victim_z,
            hero: k.victim_hero,
            label: k.victim_name,
            ability: k.event_ability,
          })),
          deaths: killsAsVictim.map((k) => ({
            match_time: k.match_time,
            x: k.victim_x,
            z: k.victim_z,
            hero: k.attacker_hero,
            label: k.attacker_name,
            ability: k.event_ability,
          })),
          abilities: [
            ...ability1.map((a) => ({
              match_time: a.match_time,
              x: a.player_x,
              z: a.player_z,
              hero: a.player_hero,
              label: "ability_1",
            })),
            ...ability2.map((a) => ({
              match_time: a.match_time,
              x: a.player_x,
              z: a.player_z,
              hero: a.player_hero,
              label: "ability_2",
            })),
            ...ults.map((u) => ({
              match_time: u.match_time,
              x: u.player_x,
              z: u.player_z,
              hero: u.player_hero,
              label: "ultimate",
            })),
          ],
        };

        const heatmap = yield* buildHeatmap(
          mapDataId,
          matchStart.map_name,
          matchStart.map_type,
          roundStarts,
          raw
        );

        return { type: "ready", telemetry, heatmap } as const;
      }).pipe(
        Effect.withSpan("map.playerTelemetry.getPlayerTelemetry", {
          attributes: { mapId, playerName },
        })
      );
    }

    function buildHeatmap(
      mapDataId: number,
      mapName: string,
      mapType: $Enums.MapType,
      roundStarts: { match_time: number; objective_index: number }[],
      raw: RawHeatmap
    ): Effect.Effect<PlayerHeatmapResult, MapQueryError> {
      return Effect.gen(function* () {
        if (!hasAnyCoords(raw)) {
          return { type: "no_coordinates" } as const;
        }

        if (mapType === $Enums.MapType.Control && isControlMap(mapName)) {
          return yield* buildControlHeatmap(mapName, roundStarts, raw);
        }

        const cal = yield* Effect.tryPromise({
          try: () => loadCalibration(mapName),
          catch: (error) =>
            new MapQueryError({
              operation: "load calibration for player heatmap",
              cause: error,
            }),
        });
        if (!cal) return { type: "no_calibration" } as const;

        return {
          type: "single",
          subMap: buildSubMap(mapName, cal, raw),
        } as const;
      });
    }

    function buildControlHeatmap(
      mapName: string,
      roundStarts: { match_time: number; objective_index: number }[],
      raw: RawHeatmap
    ): Effect.Effect<PlayerHeatmapResult, MapQueryError> {
      return Effect.gen(function* () {
        function assignName(matchTime: number): string | null {
          let idx = 0;
          for (let i = roundStarts.length - 1; i >= 0; i--) {
            if (matchTime >= roundStarts[i].match_time) {
              idx = roundStarts[i].objective_index;
              break;
            }
          }
          return getControlSubMapName(mapName, idx);
        }

        function split<T extends { match_time: number }>(
          items: T[]
        ): Map<string, T[]> {
          const grouped = new Map<string, T[]>();
          for (const item of items) {
            const name = assignName(item.match_time);
            if (!name) continue;
            const arr = grouped.get(name) ?? [];
            arr.push(item);
            grouped.set(name, arr);
          }
          return grouped;
        }

        const dealtBy = split(raw.damageDealt);
        const takenBy = split(raw.damageTaken);
        const healBy = split(raw.healingDealt);
        const killsBy = split(raw.kills);
        const deathsBy = split(raw.deaths);
        const abilitiesBy = split(raw.abilities);

        const subMaps: PlayerHeatmapSubMap[] = [];
        for (const calibrationMapName of getControlSubMapNames(mapName)) {
          const cal = yield* Effect.tryPromise({
            try: () => loadCalibration(calibrationMapName),
            catch: (error) =>
              new MapQueryError({
                operation: "load calibration for control sub-map",
                cause: error,
              }),
          });
          if (!cal) continue;

          const subRaw: RawHeatmap = {
            damageDealt: dealtBy.get(calibrationMapName) ?? [],
            damageTaken: takenBy.get(calibrationMapName) ?? [],
            healingDealt: healBy.get(calibrationMapName) ?? [],
            kills: killsBy.get(calibrationMapName) ?? [],
            deaths: deathsBy.get(calibrationMapName) ?? [],
            abilities: abilitiesBy.get(calibrationMapName) ?? [],
          };

          const subMap = buildSubMap(calibrationMapName, cal, subRaw);
          if (subMap.heatLayers.length || subMap.markerLayers.length) {
            subMaps.push(subMap);
          }
        }

        if (subMaps.length === 0) return { type: "no_calibration" } as const;
        return { type: "control", subMaps } as const;
      });
    }

    const cache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [mapId, playerName] = JSON.parse(key) as [number, string];
        return compute(mapId, playerName).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        );
      },
    });

    return {
      getPlayerTelemetry: (mapId: number, playerName: string) =>
        cache
          .get(JSON.stringify([mapId, playerName]))
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies PlayerTelemetryServiceInterface;
  }
);

export const PlayerTelemetryServiceLive = Layer.effect(
  PlayerTelemetryService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
