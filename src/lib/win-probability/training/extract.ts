import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { extractFeatures } from "@/lib/win-probability/features";
import { statesAt } from "@/lib/win-probability/game-state";
import {
  type DatasetRow,
  mapTypeToModeFamily,
  SNAPSHOT_INTERVAL_SECONDS,
  type WPEventLog,
} from "@/lib/win-probability/types";

export const FIGHT_GAP_SECONDS = 15;

export function fightBoundaries(
  kills: { time: number }[],
  gapSeconds: number
): { start: number; end: number }[] {
  const sorted = [...kills].sort((a, b) => a.time - b.time);
  const fights: { start: number; end: number }[] = [];
  for (const kill of sorted) {
    const last = fights[fights.length - 1];
    if (last !== undefined && kill.time - last.end <= gapSeconds) {
      last.end = kill.time;
    } else {
      fights.push({ start: kill.time, end: kill.time });
    }
  }
  return fights;
}

export function snapshotTimes(
  rounds: WPEventLog["rounds"],
  fights: { start: number; end: number }[]
): number[] {
  const times = new Set<number>();
  for (const round of rounds) {
    for (let t = round.start; t <= round.end; t += SNAPSHOT_INTERVAL_SECONDS) {
      times.add(t);
    }
    times.add(round.end);
  }
  function inRound(t: number): boolean {
    return rounds.some((r) => t >= r.start && t <= r.end);
  }
  for (const fight of fights) {
    if (inRound(fight.start)) times.add(fight.start);
    if (inRound(fight.end)) times.add(fight.end);
  }
  return [...times].sort((a, b) => a - b);
}

/** roundNumber → winning team name, or null when unlabeled (tie). */
export function roundLabels(log: WPEventLog): Map<number, string | null> {
  const labels = new Map<number, string | null>();
  if (log.modeFamily === "control") {
    for (const r of log.rounds) {
      const d1 = r.endScore1 - r.startScore1;
      const d2 = r.endScore2 - r.startScore2;
      labels.set(
        r.roundNumber,
        d1 > d2 ? log.team1 : d2 > d1 ? log.team2 : null
      );
    }
    return labels;
  }
  const last = log.rounds[log.rounds.length - 1];
  const scoreWinner =
    last === undefined
      ? null
      : last.endScore1 > last.endScore2
        ? log.team1
        : last.endScore2 > last.endScore1
          ? log.team2
          : null;
  // mapWinner carries calculateWinner's captures→distance→score verdict and
  // labels the ~45% of escort/hybrid maps whose final scores tie.
  const winner = log.mapWinner ?? scoreWinner;
  for (const r of log.rounds) labels.set(r.roundNumber, winner);
  return labels;
}

export function buildRows(log: WPEventLog, matchId: number): DatasetRow[] {
  const labels = roundLabels(log);
  const fights = fightBoundaries(log.kills, FIGHT_GAP_SECONDS);
  const times = snapshotTimes(log.rounds, fights);
  if (times.length === 0) return [];
  const snapshots = statesAt(log, times);
  const rows: DatasetRow[] = [];
  for (const snap of snapshots) {
    const winner = labels.get(snap.roundNumber);
    if (winner === null || winner === undefined) continue;
    const roundId = `${matchId}-${snap.roundNumber}`;
    rows.push(
      {
        matchId,
        roundId,
        label: winner === log.team1 ? 1 : 0,
        features: extractFeatures(snap.team1),
      },
      {
        matchId,
        roundId,
        label: winner === log.team2 ? 1 : 0,
        features: extractFeatures(snap.team2),
      }
    );
  }
  return rows;
}

/** Loads one map's events and normalizes them into a WPEventLog.
 * Returns null for unsupported modes (Clash) or maps without round data. */
export async function fetchEventLog(
  mapDataId: number
): Promise<WPEventLog | null> {
  const where = { MapDataId: mapDataId };
  const [
    matchStart,
    kills,
    rezzes,
    ultCharged,
    ultStart,
    roundStarts,
    roundEnds,
    pointProgress,
    payloadProgress,
    objectiveCaptured,
    setupCompletes,
  ] = await Promise.all([
    prisma.matchStart.findFirst({ where }),
    prisma.kill.findMany({ where, orderBy: { match_time: "asc" } }),
    prisma.mercyRez.findMany({ where }),
    prisma.ultimateCharged.findMany({ where }),
    prisma.ultimateStart.findMany({ where }),
    prisma.roundStart.findMany({ where, orderBy: { round_number: "asc" } }),
    prisma.roundEnd.findMany({ where, orderBy: { round_number: "asc" } }),
    prisma.pointProgress.findMany({ where }),
    prisma.payloadProgress.findMany({ where }),
    prisma.objectiveCaptured.findMany({ where }),
    prisma.setupComplete.findMany({ where }),
  ]);

  if (matchStart === null) return null;
  const modeFamily = mapTypeToModeFamily(matchStart.map_type);
  if (modeFamily === null) return null;

  const ends = new Map(roundEnds.map((r) => [r.round_number, r]));
  const rounds = roundStarts.flatMap((rs) => {
    const re = ends.get(rs.round_number);
    if (re === undefined) return [];
    return [
      {
        roundNumber: rs.round_number,
        start: rs.match_time,
        end: re.match_time,
        capturingTeam: rs.capturing_team,
        startScore1: rs.team_1_score,
        startScore2: rs.team_2_score,
        endScore1: re.team_1_score,
        endScore2: re.team_2_score,
      },
    ];
  });
  // Flashpoint loggers emit a single round_start (r1) but number the final
  // round_end by points played (r6); when nothing pairs, span first → last.
  if (rounds.length === 0 && roundStarts.length > 0 && roundEnds.length > 0) {
    const rs = roundStarts[0];
    const re = roundEnds[roundEnds.length - 1];
    if (re.match_time > rs.match_time) {
      rounds.push({
        roundNumber: rs.round_number,
        start: rs.match_time,
        end: re.match_time,
        capturingTeam: rs.capturing_team,
        startScore1: rs.team_1_score,
        startScore2: rs.team_2_score,
        endScore1: re.team_1_score,
        endScore2: re.team_2_score,
      });
    }
  }
  if (rounds.length === 0) return null;

  const team1 = matchStart.team_1_name;
  const team2 = matchStart.team_2_name;
  const lastRound = roundEnds[roundEnds.length - 1];
  // calculateWinner's Flashpoint branch force-picks team 2 on tied scores
  // (incomplete logs) — a tie there is unlabelable, not a team-2 win.
  const flashpointTie =
    matchStart.map_type === "Flashpoint" &&
    lastRound !== undefined &&
    lastRound.team_1_score === lastRound.team_2_score;
  const canonicalWinner = calculateWinner({
    matchDetails: matchStart,
    finalRound: roundEnds[roundEnds.length - 1] ?? null,
    team1Captures: objectiveCaptured.filter((o) => o.capturing_team === team1),
    team2Captures: objectiveCaptured.filter((o) => o.capturing_team === team2),
    team1PayloadProgress: payloadProgress.filter(
      (p) => p.capturing_team === team1
    ),
    team2PayloadProgress: payloadProgress.filter(
      (p) => p.capturing_team === team2
    ),
    team1PointProgress: pointProgress.filter((p) => p.capturing_team === team1),
    team2PointProgress: pointProgress.filter((p) => p.capturing_team === team2),
  });

  return {
    modeFamily,
    team1,
    team2,
    mapWinner:
      !flashpointTie && (canonicalWinner === team1 || canonicalWinner === team2)
        ? canonicalWinner
        : null,
    kills: kills.map((k) => ({
      time: k.match_time,
      victimTeam: k.victim_team,
      victimName: k.victim_name,
      attackerTeam: k.attacker_team,
      attackerName: k.attacker_name,
    })),
    rezzes: rezzes.map((r) => ({
      time: r.match_time,
      team: r.resurrectee_team,
      player: r.resurrectee_player,
    })),
    ultCharged: ultCharged.map((u) => ({
      time: u.match_time,
      team: u.player_team,
      player: u.player_name,
    })),
    ultStart: ultStart.map((u) => ({
      time: u.match_time,
      team: u.player_team,
      player: u.player_name,
    })),
    rounds,
    progress: [
      ...pointProgress.map((p) => ({
        time: p.match_time,
        team: p.capturing_team,
        value: p.point_capture_progress,
        roundNumber: p.round_number,
      })),
      ...payloadProgress.map((p) => ({
        time: p.match_time,
        team: p.capturing_team,
        value: p.payload_capture_progress,
        roundNumber: p.round_number,
      })),
    ],
    objectiveCaptured: objectiveCaptured.map((o) => ({
      time: o.match_time,
      team: o.capturing_team,
      roundNumber: o.round_number,
      objectiveIndex: o.objective_index,
      progress1: o.control_team_1_progress,
      progress2: o.control_team_2_progress,
    })),
    setupCompletes: setupCompletes.map((s) => ({
      time: s.match_time,
      roundNumber: s.round_number,
      timeRemaining: s.match_time_remaining,
    })),
  };
}
