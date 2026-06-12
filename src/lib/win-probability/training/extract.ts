import { extractFeatures } from "@/lib/win-probability/features";
import { statesAt } from "@/lib/win-probability/game-state";
import {
  type DatasetRow,
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
  const winner =
    last === undefined
      ? null
      : last.endScore1 > last.endScore2
        ? log.team1
        : last.endScore2 > last.endScore1
          ? log.team2
          : null;
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
