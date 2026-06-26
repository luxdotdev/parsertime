/**
 * Flashpoint-style outcome attribution. Flashpoint logs emit a single
 * round_start/round_end pair per map, so round winners can't come from
 * RoundEnd score deltas. They CAN come from objective events:
 * ObjectiveUpdated marks each flashpoint transition with the new round's
 * number, and the last non-neutral ObjectiveCaptured within a period is
 * the team that secured that flashpoint.
 */

export type ObjectiveTransition = { t: number; roundNumber: number };
export type ObjectiveCapture = { t: number; capturingTeam: string };

/** The parser's neutral "point unlocked" capture marker. */
export const NEUTRAL_CAPTURE_TEAM = "All Teams";

export type ObjectivePeriod = {
  start: number;
  end: number;
  roundNumber: number;
};

/**
 * Periods between transitions. The initial period (map start → first
 * transition) belongs to the round preceding the first transition's.
 */
export function buildObjectivePeriods(
  transitions: ObjectiveTransition[],
  maxTime: number
): ObjectivePeriod[] {
  const sorted = [...transitions].sort((a, b) => a.t - b.t);
  if (sorted.length === 0) return [];

  const periods: ObjectivePeriod[] = [
    {
      start: 0,
      end: sorted[0].t,
      roundNumber: Math.max(1, sorted[0].roundNumber - 1),
    },
  ];
  for (let i = 0; i < sorted.length; i++) {
    periods.push({
      start: sorted[i].t,
      end: i + 1 < sorted.length ? sorted[i + 1].t : maxTime,
      roundNumber: sorted[i].roundNumber,
    });
  }
  return periods;
}

/** Per round: the last non-neutral capture in the period, or null. */
export function objectivePeriodOutcomes(
  periods: ObjectivePeriod[],
  captures: ObjectiveCapture[]
): Map<number, string | null> {
  const sorted = [...captures].sort((a, b) => a.t - b.t);
  const outcomes = new Map<number, string | null>();
  for (const period of periods) {
    let winner: string | null = null;
    for (const capture of sorted) {
      if (capture.t < period.start) continue;
      if (capture.t >= period.end) break;
      if (capture.capturingTeam === NEUTRAL_CAPTURE_TEAM) continue;
      winner = capture.capturingTeam;
    }
    outcomes.set(period.roundNumber, winner);
  }
  return outcomes;
}
