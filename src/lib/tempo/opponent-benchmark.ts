/** Below this absolute delta (seconds), us-vs-opponents reads as "about even". */
export const OPPONENT_EVEN_THRESHOLD = 1.0;

export type OpponentDeltaBucket = "faster" | "slower" | "even";

/** One opponent player's value for a metric on one map. */
export type OpponentObservation = {
  value: number;
  opponentTeamId: number | null;
  name: string | null;
  mapId: number;
};

export type OpponentGroup = {
  opponentTeamId: number | null;
  name: string | null; // null => the Unnamed bucket
  mean: number;
  delta: number; // ourValue - group mean (lower value = we are faster)
  maps: number; // distinct maps faced
};

export type OpponentTempoComparison = {
  ourValue: number;
  opponentMean: number;
  delta: number; // ourValue - opponentMean
  mapsWithData: number; // distinct maps with any opponent observation
  perOpponent: OpponentGroup[];
};

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Bucket an us-minus-opponent delta. Lower (negative) = we are faster. */
export function classifyOpponentDelta(delta: number): OpponentDeltaBucket {
  if (delta <= -OPPONENT_EVEN_THRESHOLD) return "faster";
  if (delta >= OPPONENT_EVEN_THRESHOLD) return "slower";
  return "even";
}

/**
 * Build the pooled + per-opponent comparison of our value against the opponents
 * faced. Groups by opponentTeamId; null collapses into a single Unnamed bucket.
 * Named groups sort by maps faced (desc); the Unnamed bucket is always last.
 * Returns null when there are no observations.
 */
export function buildOpponentComparison(
  ourValue: number,
  observations: OpponentObservation[]
): OpponentTempoComparison | null {
  if (observations.length === 0) return null;

  const opponentMean = mean(observations.map((o) => o.value));

  type Acc = { name: string | null; values: number[]; maps: Set<number> };
  const groups = new Map<number | "unnamed", Acc>();
  const allMaps = new Set<number>();
  for (const o of observations) {
    allMaps.add(o.mapId);
    const key = o.opponentTeamId ?? "unnamed";
    let acc = groups.get(key);
    if (!acc) {
      acc = {
        name: o.opponentTeamId === null ? null : o.name,
        values: [],
        maps: new Set(),
      };
      groups.set(key, acc);
    }
    acc.values.push(o.value);
    acc.maps.add(o.mapId);
  }

  const named: OpponentGroup[] = [];
  let unnamed: OpponentGroup | null = null;
  for (const [key, acc] of groups) {
    const groupMean = mean(acc.values);
    const group: OpponentGroup = {
      opponentTeamId: key === "unnamed" ? null : key,
      name: acc.name,
      mean: groupMean,
      delta: ourValue - groupMean,
      maps: acc.maps.size,
    };
    if (key === "unnamed") unnamed = group;
    else named.push(group);
  }
  named.sort((a, b) => b.maps - a.maps);

  const perOpponent = unnamed ? [...named, unnamed] : named;

  return {
    ourValue,
    opponentMean,
    delta: ourValue - opponentMean,
    mapsWithData: allMaps.size,
    perOpponent,
  };
}
