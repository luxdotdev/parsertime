import { getHeroRole, type RoleName } from "@/types/heroes";
import {
  type GameState,
  RESPAWN_SECONDS,
  type Snapshot,
  type WPEventLog,
} from "./types";

type SweepEvent =
  | { time: number; kind: "kill"; team: string; player: string; hero?: string }
  | { time: number; kind: "rez"; team: string; player: string }
  | {
      time: number;
      kind: "ult_charged";
      team: string;
      player: string;
      hero?: string;
      heroDuplicated?: boolean;
    }
  | { time: number; kind: "ult_start"; team: string; player: string }
  | { time: number; kind: "round_start"; roundIndex: number }
  | {
      time: number;
      kind: "progress";
      team: string;
      value: number;
      roundNumber: number;
    }
  | {
      time: number;
      kind: "objective_captured";
      team: string;
      roundNumber: number;
      objectiveIndex: number;
      progress1: number;
      progress2: number;
    }
  | { time: number; kind: "setup"; timeRemaining: number; roundNumber: number };

function mergedEvents(log: WPEventLog): SweepEvent[] {
  const events: SweepEvent[] = [];
  for (const k of log.kills) {
    events.push({
      time: k.time,
      kind: "kill",
      team: k.victimTeam,
      player: k.victimName,
      hero: k.victimHero,
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
      hero: u.hero,
      heroDuplicated: u.heroDuplicated,
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
      roundNumber: p.roundNumber,
    });
  }
  for (const o of log.objectiveCaptured) {
    events.push({
      time: o.time,
      kind: "objective_captured",
      team: o.team,
      roundNumber: o.roundNumber,
      objectiveIndex: o.objectiveIndex,
      progress1: o.progress1,
      progress2: o.progress2,
    });
  }
  for (const s of log.setupCompletes) {
    events.push({
      time: s.time,
      kind: "setup",
      timeRemaining: s.timeRemaining,
      roundNumber: s.roundNumber,
    });
  }
  // At equal timestamps, round_start sorts last: the dying round's final
  // state ticks (e.g. its 100% progress event) must land before the reset,
  // or they leak into the new round.
  return events.sort(
    (a, b) =>
      a.time - b.time ||
      Number(a.kind === "round_start") - Number(b.kind === "round_start")
  );
}

function clampUnit(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** A duplicated ult belongs to Echo (Damage), not the copied hero's role. */
function ultRole(hero: string | undefined, duplicated: boolean | undefined): RoleName {
  if (duplicated === true) return "Damage";
  return getHeroRole(hero ?? "");
}

/**
 * Single chronological sweep. `times` must be ascending. Returns one
 * Snapshot per requested time with both team perspectives.
 */
export function statesAt(log: WPEventLog, times: number[]): Snapshot[] {
  const events = mergedEvents(log);
  const deadUntil = new Map<string, { until: number; role: RoleName }>(); // "team player" → {until, role}
  const banked = {
    t1: new Map<string, RoleName>(),
    t2: new Map<string, RoleName>(),
  };
  const progress = { t1: 0, t2: 0 }; // raw 0..100
  const control = { t1: 0, t2: 0 }; // raw 0..100, control-mode win %
  let holder: "t1" | "t2" | null = null;
  let objectiveIndex: number | null = null;
  // Flashpoint emits a single round_start, so its running score is derived:
  // each objective-index transition credits the team holding the dying point.
  const derivedScore = { t1: 0, t2: 0 };
  let roundIndex = 0;
  let setupBaseline: {
    time: number;
    remaining: number;
    roundNumber: number;
  } | null = null;

  function isTeam1(team: string): boolean {
    return team === log.team1;
  }
  function bankOf(team: string): Map<string, RoleName> {
    return isTeam1(team) ? banked.t1 : banked.t2;
  }

  const snapshots: Snapshot[] = [];
  let cursor = 0;

  for (const t of times) {
    while (cursor < events.length && events[cursor].time <= t) {
      const e = events[cursor];
      switch (e.kind) {
        case "kill":
          deadUntil.set(`${e.team} ${e.player}`, {
            until: e.time + RESPAWN_SECONDS,
            role: getHeroRole(e.hero ?? ""),
          });
          break;
        case "rez":
          deadUntil.delete(`${e.team} ${e.player}`);
          break;
        case "ult_charged":
          bankOf(e.team).set(e.player, ultRole(e.hero, e.heroDuplicated));
          break;
        case "ult_start":
          bankOf(e.team).delete(e.player);
          break;
        case "round_start":
          roundIndex = e.roundIndex;
          progress.t1 = 0;
          progress.t2 = 0;
          control.t1 = 0;
          control.t2 = 0;
          holder = null;
          objectiveIndex = null;
          break;
        case "progress":
          // Stale spill: a previous round's tick arriving after the next
          // round started. Later round numbers are fine (flashpoint emits
          // r2..r6 under a single round_start).
          if (e.roundNumber < (log.rounds[roundIndex]?.roundNumber ?? 0)) {
            break;
          }
          // Escort/Hybrid: only the round's attacker pushes — spill ticks
          // sometimes carry the NEW round's number, so staleness alone is
          // not enough. The defender cannot generate progress.
          if (
            log.modeFamily === "escort_hybrid" &&
            e.team !== log.rounds[roundIndex]?.capturingTeam
          ) {
            break;
          }
          if (isTeam1(e.team)) progress.t1 = e.value;
          else progress.t2 = e.value;
          break;
        case "objective_captured": {
          if (e.roundNumber < (log.rounds[roundIndex]?.roundNumber ?? 0)) {
            break;
          }
          if (objectiveIndex !== null && e.objectiveIndex !== objectiveIndex) {
            // A new point: credit whoever held the old one, reset its state.
            if (holder !== null) derivedScore[holder]++;
            control.t1 = 0;
            control.t2 = 0;
            holder = null;
          }
          objectiveIndex = e.objectiveIndex;
          control.t1 = e.progress1;
          control.t2 = e.progress2;
          // "All Teams" (neutral unlock) and unknown names clear the holder.
          holder =
            e.team === log.team1 ? "t1" : e.team === log.team2 ? "t2" : null;
          break;
        }
        case "setup":
          setupBaseline = {
            time: e.time,
            remaining: e.timeRemaining,
            roundNumber: e.roundNumber,
          };
          break;
      }
      cursor++;
    }

    const dead = {
      t1: { Tank: 0, Damage: 0, Support: 0 },
      t2: { Tank: 0, Damage: 0, Support: 0 },
    };
    for (const [key, info] of deadUntil) {
      if (info.until <= t) continue;
      const side = isTeam1(key.split(" ")[0]) ? "t1" : "t2";
      dead[side][info.role]++;
    }
    const dead1 = dead.t1.Tank + dead.t1.Damage + dead.t1.Support;
    const dead2 = dead.t2.Tank + dead.t2.Damage + dead.t2.Support;

    const round = log.rounds[roundIndex];
    const ended = round !== undefined && t >= round.end;
    // Flashpoint logs emit one round_start for the whole map, so its round
    // scores are frozen at 0 — use the derived per-point score instead.
    const score1 =
      log.modeFamily === "flashpoint"
        ? derivedScore.t1
        : round === undefined
          ? 0
          : ended
            ? round.endScore1
            : round.startScore1;
    const score2 =
      log.modeFamily === "flashpoint"
        ? derivedScore.t2
        : round === undefined
          ? 0
          : ended
            ? round.endScore2
            : round.startScore2;
    const roundNumber = round?.roundNumber ?? 0;
    const capturing = round?.capturingTeam ?? "";
    const timeRemaining =
      setupBaseline === null
        ? 0
        : Math.max(0, setupBaseline.remaining - (t - setupBaseline.time));

    // Overtime: the clock ran out but round_end hasn't come — the round only
    // persists because the attacker is touching. Escort/hybrid only: control
    // has no clock, and flashpoint's single-round_start log shape makes
    // timeRemaining unreliable mid-map.
    const isOvertime: 0 | 1 =
      log.modeFamily === "escort_hybrid" &&
      setupBaseline?.roundNumber === roundNumber &&
      timeRemaining === 0 &&
      round !== undefined &&
      t < round.end
        ? 1
        : 0;

    const bank = {
      t1: { Tank: 0, Damage: 0, Support: 0 },
      t2: { Tank: 0, Damage: 0, Support: 0 },
    };
    for (const role of banked.t1.values()) bank.t1[role]++;
    for (const role of banked.t2.values()) bank.t2[role]++;

    function perspective(own: "t1" | "t2"): GameState {
      const sign = own === "t1" ? 1 : -1;
      return {
        modeFamily: log.modeFamily,
        matchTime: t,
        roundNumber,
        aliveDiff: sign * (dead2 - dead1),
        tankAliveDiff: sign * (dead.t2.Tank - dead.t1.Tank),
        dpsAliveDiff: sign * (dead.t2.Damage - dead.t1.Damage),
        supportAliveDiff: sign * (dead.t2.Support - dead.t1.Support),
        ultBankDiff: sign * (banked.t1.size - banked.t2.size),
        tankUltDiff: sign * (bank.t1.Tank - bank.t2.Tank),
        dpsUltDiff: sign * (bank.t1.Damage - bank.t2.Damage),
        supportUltDiff: sign * (bank.t1.Support - bank.t2.Support),
        scoreDiff: sign * (score1 - score2),
        objProgressOwn: clampUnit(
          (own === "t1" ? progress.t1 : progress.t2) / 100
        ),
        objProgressEnemy: clampUnit(
          (own === "t1" ? progress.t2 : progress.t1) / 100
        ),
        controlProgressOwn: clampUnit(
          (own === "t1" ? control.t1 : control.t2) / 100
        ),
        controlProgressEnemy: clampUnit(
          (own === "t1" ? control.t2 : control.t1) / 100
        ),
        holdsObjective: holder === null ? 0 : holder === own ? 1 : -1,
        timeRemaining,
        isAttacker:
          capturing === (own === "t1" ? log.team1 : log.team2) ? 1 : 0,
        isOvertime,
        objectiveIndex: null,
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
