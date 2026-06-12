import {
  type GameState,
  RESPAWN_SECONDS,
  type Snapshot,
  type WPEventLog,
} from "./types";

type SweepEvent =
  | { time: number; kind: "kill"; team: string; player: string }
  | { time: number; kind: "rez"; team: string; player: string }
  | { time: number; kind: "ult_charged"; team: string; player: string }
  | { time: number; kind: "ult_start"; team: string; player: string }
  | { time: number; kind: "round_start"; roundIndex: number }
  | { time: number; kind: "progress"; team: string; value: number }
  | { time: number; kind: "setup"; timeRemaining: number };

function mergedEvents(log: WPEventLog): SweepEvent[] {
  const events: SweepEvent[] = [];
  for (const k of log.kills) {
    events.push({
      time: k.time,
      kind: "kill",
      team: k.victimTeam,
      player: k.victimName,
    });
  }
  for (const r of log.rezzes) {
    events.push({ time: r.time, kind: "rez", team: r.team, player: r.player });
  }
  for (const u of log.ultCharged) {
    events.push({
      time: u.time,
      kind: "ult_charged",
      team: u.team,
      player: u.player,
    });
  }
  for (const u of log.ultStart) {
    events.push({
      time: u.time,
      kind: "ult_start",
      team: u.team,
      player: u.player,
    });
  }
  log.rounds.forEach((r, i) => {
    events.push({ time: r.start, kind: "round_start", roundIndex: i });
  });
  for (const p of log.progress) {
    events.push({
      time: p.time,
      kind: "progress",
      team: p.team,
      value: p.value,
    });
  }
  for (const s of log.setupCompletes) {
    events.push({
      time: s.time,
      kind: "setup",
      timeRemaining: s.timeRemaining,
    });
  }
  return events.sort((a, b) => a.time - b.time);
}

function clampUnit(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Single chronological sweep. `times` must be ascending. Returns one
 * Snapshot per requested time with both team perspectives.
 */
export function statesAt(log: WPEventLog, times: number[]): Snapshot[] {
  const events = mergedEvents(log);
  const deadUntil = new Map<string, number>(); // "team player" → respawn time
  const banked = { t1: new Set<string>(), t2: new Set<string>() };
  const progress = { t1: 0, t2: 0 }; // raw 0..100
  let roundIndex = 0;
  let setupBaseline: { time: number; remaining: number } | null = null;

  function isTeam1(team: string): boolean {
    return team === log.team1;
  }
  function bankOf(team: string): Set<string> {
    return isTeam1(team) ? banked.t1 : banked.t2;
  }

  const snapshots: Snapshot[] = [];
  let cursor = 0;

  for (const t of times) {
    while (cursor < events.length && events[cursor].time <= t) {
      const e = events[cursor];
      switch (e.kind) {
        case "kill":
          deadUntil.set(`${e.team} ${e.player}`, e.time + RESPAWN_SECONDS);
          break;
        case "rez":
          deadUntil.delete(`${e.team} ${e.player}`);
          break;
        case "ult_charged":
          bankOf(e.team).add(e.player);
          break;
        case "ult_start":
          bankOf(e.team).delete(e.player);
          break;
        case "round_start":
          roundIndex = e.roundIndex;
          progress.t1 = 0;
          progress.t2 = 0;
          break;
        case "progress":
          if (isTeam1(e.team)) progress.t1 = e.value;
          else progress.t2 = e.value;
          break;
        case "setup":
          setupBaseline = { time: e.time, remaining: e.timeRemaining };
          break;
      }
      cursor++;
    }

    let dead1 = 0;
    let dead2 = 0;
    for (const [key, until] of deadUntil) {
      if (until <= t) continue;
      if (isTeam1(key.split(" ")[0])) dead1++;
      else dead2++;
    }

    const round = log.rounds[roundIndex];
    const ended = round !== undefined && t >= round.end;
    const score1 =
      round === undefined ? 0 : ended ? round.endScore1 : round.startScore1;
    const score2 =
      round === undefined ? 0 : ended ? round.endScore2 : round.startScore2;
    const roundNumber = round?.roundNumber ?? 0;
    const capturing = round?.capturingTeam ?? "";
    const timeRemaining =
      setupBaseline === null
        ? 0
        : Math.max(0, setupBaseline.remaining - (t - setupBaseline.time));

    function perspective(own: "t1" | "t2"): GameState {
      const sign = own === "t1" ? 1 : -1;
      return {
        modeFamily: log.modeFamily,
        matchTime: t,
        roundNumber,
        aliveDiff: sign * (dead2 - dead1),
        ultBankDiff: sign * (banked.t1.size - banked.t2.size),
        scoreDiff: sign * (score1 - score2),
        objProgressOwn: clampUnit(
          (own === "t1" ? progress.t1 : progress.t2) / 100
        ),
        objProgressEnemy: clampUnit(
          (own === "t1" ? progress.t2 : progress.t1) / 100
        ),
        timeRemaining,
        isAttacker:
          capturing === (own === "t1" ? log.team1 : log.team2) ? 1 : 0,
      };
    }

    snapshots.push({
      matchTime: t,
      roundNumber,
      team1: perspective("t1"),
      team2: perspective("t2"),
    });
  }

  return snapshots;
}
