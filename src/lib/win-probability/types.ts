export type ModeFamily = "control" | "escort_hybrid" | "push" | "flashpoint";

export const MODE_FAMILIES: ModeFamily[] = [
  "control",
  "escort_hybrid",
  "push",
  "flashpoint",
];

/** Clash is retired and unsupported; unknown future modes are also null. */
export function mapTypeToModeFamily(mapType: string): ModeFamily | null {
  switch (mapType) {
    case "Control":
      return "control";
    case "Escort":
    case "Hybrid":
      return "escort_hybrid";
    case "Push":
      return "push";
    case "Flashpoint":
      return "flashpoint";
    default:
      return null;
  }
}

/** One team's view of the game at an instant. All "Diff"s are own − enemy. */
export type GameState = {
  modeFamily: ModeFamily;
  matchTime: number;
  roundNumber: number;
  aliveDiff: number; // −5..+5; always equals tank+dps+support splits
  tankAliveDiff: number; // typically −1..+1 (role queue)
  dpsAliveDiff: number; // typically −2..+2 (role queue)
  supportAliveDiff: number; // typically −2..+2 (role queue)
  ultBankDiff: number; // banked (charged, unspent) ults; equals role splits' sum
  tankUltDiff: number;
  dpsUltDiff: number;
  supportUltDiff: number;
  scoreDiff: number;
  objProgressOwn: number; // 0..1, latest contest progress attributed to own team
  objProgressEnemy: number; // 0..1
  controlProgressOwn: number; // 0..1, control-mode win % (0 outside control)
  controlProgressEnemy: number; // 0..1
  holdsObjective: -1 | 0 | 1; // own team holds the point (+1) / enemy (−1)
  timeRemaining: number; // seconds; 0 when unknown
  isAttacker: 0 | 1; // current round's capturing team is own team
  isOvertime: 0 | 1; // escort/hybrid only: clock expired but the round persists
  objectiveIndex: number | null; // contested point/checkpoint; null when unknown
};

/** Normalized event log for one map — decoupled from Prisma rows and the
 * parser workbook so the sweep is testable with synthetic data. */
export type WPEventLog = {
  modeFamily: ModeFamily;
  team1: string;
  team2: string;
  /** Canonical map winner (calculateWinner semantics: captures → distance →
   * score). null = unknown; non-control labeling falls back to score diff. */
  mapWinner: string | null;
  kills: {
    time: number;
    victimTeam: string;
    victimName: string;
    victimHero?: string;
    attackerTeam?: string;
    attackerName?: string;
  }[];
  rezzes: { time: number; team: string; player: string }[];
  ultCharged: {
    time: number;
    team: string;
    player: string;
    hero?: string;
    heroDuplicated?: boolean;
  }[];
  ultStart: { time: number; team: string; player: string }[];
  rounds: {
    roundNumber: number;
    start: number;
    end: number;
    capturingTeam: string;
    startScore1: number;
    startScore2: number;
    endScore1: number;
    endScore2: number;
    objectiveIndex?: number;
  }[];
  /** Point + payload progress merged; value is the raw 0..100 figure.
   * roundNumber marks stale spillover from a previous round. */
  progress: {
    time: number;
    team: string;
    value: number;
    roundNumber: number;
    objectiveIndex?: number;
  }[];
  /** Control-mode capture flips: per-team win % at each capture. */
  objectiveCaptured: {
    time: number;
    team: string;
    roundNumber: number;
    objectiveIndex: number;
    progress1: number; // raw 0..100, team 1's control win %
    progress2: number;
  }[];
  setupCompletes: {
    time: number;
    roundNumber: number;
    timeRemaining: number;
  }[];
};

export type Snapshot = {
  matchTime: number;
  roundNumber: number;
  team1: GameState;
  team2: GameState;
};

export type DatasetRow = {
  matchId: number; // MapDataId — CV grouping key
  roundId: string; // `${matchId}-${roundNumber}`
  label: 0 | 1;
  features: number[];
};

export const RESPAWN_SECONDS = 10;
export const SNAPSHOT_INTERVAL_SECONDS = 5;
/** Minimum |WP delta| before a cascade carryover is surfaced to users.
 * Lives here (dependency-free) so client components can import it without
 * dragging the timeline's server-side module graph into the bundle. */
export const CASCADE_MIN_WP = 0.05;
