/** Below this absolute delta (seconds), us-vs-opponents reads as "about even". */
export const OPPONENT_EVEN_THRESHOLD = 1.0;

export type OpponentDeltaBucket = "faster" | "slower" | "even";

/**
 * One opponent player's value for a metric on one map. `name` is null when the
 * opponent's in-game team name is a generic default (collapsed into Unnamed).
 */
export type OpponentObservation = {
  value: number;
  name: string | null;
  mapId: number;
};

export type OpponentGroup = {
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

/**
 * True for generic default in-game team names ("Team 1", "Team 2", "Equipo 2",
 * …) that are not a real opponent identity and should pool into the Unnamed
 * bucket rather than appear as distinct opponents.
 */
export function isDefaultTeamName(name: string): boolean {
  return /^(team|equipo)\s*\d+$/i.test(name.trim());
}

/** Bucket an us-minus-opponent delta. Lower (negative) = we are faster. */
export function classifyOpponentDelta(delta: number): OpponentDeltaBucket {
  if (delta <= -OPPONENT_EVEN_THRESHOLD) return "faster";
  if (delta >= OPPONENT_EVEN_THRESHOLD) return "slower";
  return "even";
}

/**
 * Build the pooled + per-opponent comparison of our value against the opponents
 * faced. Groups by opponent name; null names collapse into a single Unnamed
 * bucket. Named groups sort by maps faced (desc); the Unnamed bucket is always
 * last. Returns null when there are no observations.
 */
export function buildOpponentComparison(
  ourValue: number,
  observations: OpponentObservation[]
): OpponentTempoComparison | null {
  if (observations.length === 0) return null;

  const opponentMean = mean(observations.map((o) => o.value));

  type Acc = { name: string | null; values: number[]; maps: Set<number> };
  const groups = new Map<string, Acc>();
  const allMaps = new Set<number>();
  for (const o of observations) {
    allMaps.add(o.mapId);
    const key = o.name ?? "__unnamed__";
    let acc = groups.get(key);
    if (!acc) {
      acc = { name: o.name, values: [], maps: new Set() };
      groups.set(key, acc);
    }
    acc.values.push(o.value);
    acc.maps.add(o.mapId);
  }

  const named: OpponentGroup[] = [];
  let unnamed: OpponentGroup | null = null;
  for (const acc of groups.values()) {
    const groupMean = mean(acc.values);
    const group: OpponentGroup = {
      name: acc.name,
      mean: groupMean,
      delta: ourValue - groupMean,
      maps: acc.maps.size,
    };
    if (acc.name === null) unnamed = group;
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
