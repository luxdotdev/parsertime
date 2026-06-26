export type GhostAlignMode = "ROUND_START" | "FIRST_CONTACT";

/** The minimal event shape this module reads (subset of DisplayEvent). */
type AnchorEvent =
  | {
      type: "round_start";
      t: number;
      roundNumber: number;
      objectiveIndex: number;
    }
  | { type: string; t: number };

export type GhostRoundInfo = {
  /** [start, end) of the ghost's round on the ghost timeline. */
  window: [number, number];
  /** Objective index of the ghost's round (Control arena identity). */
  objectiveIndex: number;
};

function roundStart(
  events: AnchorEvent[],
  roundNumber: number
): { t: number; objectiveIndex: number } | null {
  for (const e of events) {
    if (e.type === "round_start") {
      const r = e as Extract<AnchorEvent, { type: "round_start" }>;
      if (r.roundNumber === roundNumber) {
        return { t: r.t, objectiveIndex: r.objectiveIndex };
      }
    }
  }
  return null;
}

/**
 * Alignment anchor on a source's own timeline. FIRST_CONTACT = first kill
 * at/after the round start, falling back to the round start when the
 * round has no kills.
 */
export function computeAnchor(
  events: AnchorEvent[],
  roundNumber: number,
  mode: GhostAlignMode
): number | null {
  const start = roundStart(events, roundNumber);
  if (!start) return null;
  if (mode === "ROUND_START") return start.t;

  let firstKill: number | null = null;
  for (const e of events) {
    if (e.type !== "kill" || e.t < start.t) continue;
    if (firstKill === null || e.t < firstKill) firstKill = e.t;
  }
  return firstKill ?? start.t;
}

/** ghostTime = primaryTime + offset. */
export function computeGhostOffset(
  primaryAnchor: number,
  ghostAnchor: number,
  nudgeSec: number
): number {
  return ghostAnchor - primaryAnchor + nudgeSec;
}

export function ghostTimeAt(primaryTime: number, offset: number): number {
  return primaryTime + offset;
}

/** [round start, next round start) — or maxTime for the last round. */
export function ghostRoundWindow(
  events: AnchorEvent[],
  roundNumber: number,
  maxTime: number
): [number, number] | null {
  const start = roundStart(events, roundNumber);
  if (!start) return null;
  let end = maxTime;
  for (const e of events) {
    if (e.type !== "round_start") continue;
    if (e.t > start.t && e.t < end) end = e.t;
  }
  return [start.t, end];
}

/**
 * primaryObjectiveIndex: the objective index of the primary's CURRENT
 * round, or null on non-Control maps (no arena constraint).
 */
export function isGhostVisible(
  ghostTime: number,
  ghost: GhostRoundInfo,
  primaryObjectiveIndex: number | null
): boolean {
  if (ghostTime < ghost.window[0] || ghostTime > ghost.window[1]) return false;
  if (
    primaryObjectiveIndex !== null &&
    ghost.objectiveIndex !== primaryObjectiveIndex
  ) {
    return false;
  }
  return true;
}
