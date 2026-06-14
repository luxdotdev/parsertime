/** A kill's attacking-player position, team-tagged, with its event time. */
export type PushKill = {
  team: string;
  x: number;
  z: number;
  match_time: number;
};

export type PushWinnerInput = {
  team1Name: string;
  team2Name: string;
  /** Kill-attacker positions for both teams (any coord validity). */
  kills: PushKill[];
};

export type PushWinnerResult = {
  winner: string;
  /** Difference in deepest advance between the teams, in world units. */
  margin: number;
  /** Normalized 0..1 — margin relative to half the axis length. */
  confidence: number;
};

/** Minimum finite kills a team needs before we trust an anchor + push depth. */
export const MIN_KILLS_PER_TEAM = 3;
/** How many earliest kills define a team's spawn anchor. */
export const ANCHOR_SAMPLE_COUNT = 5;

type Pt = { x: number; z: number };

function isFinitePt(k: PushKill): boolean {
  return Number.isFinite(k.x) && Number.isFinite(k.z);
}

function centroidOfEarliest(kills: PushKill[]): Pt {
  const earliest = [...kills]
    .sort((a, b) => a.match_time - b.match_time)
    .slice(0, ANCHOR_SAMPLE_COUNT);
  const sum = earliest.reduce(
    (acc, k) => ({ x: acc.x + k.x, z: acc.z + k.z }),
    { x: 0, z: 0 }
  );
  return { x: sum.x / earliest.length, z: sum.z / earliest.length };
}

/**
 * Approximate a Push map winner from kill positions: whichever team pushed
 * deepest toward the enemy spawn wins. Returns null when there isn't enough
 * coordinate data to decide (caller leaves the winner "N/A").
 */
export function computePushWinner(
  input: PushWinnerInput
): PushWinnerResult | null {
  const team1 = input.kills.filter(
    (k) => k.team === input.team1Name && isFinitePt(k)
  );
  const team2 = input.kills.filter(
    (k) => k.team === input.team2Name && isFinitePt(k)
  );
  if (team1.length < MIN_KILLS_PER_TEAM || team2.length < MIN_KILLS_PER_TEAM) {
    return null;
  }

  const anchor1 = centroidOfEarliest(team1);
  const anchor2 = centroidOfEarliest(team2);

  // Axis team1 base -> team2 base.
  const ax = anchor2.x - anchor1.x;
  const az = anchor2.z - anchor1.z;
  const axisLen = Math.hypot(ax, az);
  if (axisLen === 0) return null; // degenerate: anchors coincide

  const ux = ax / axisLen;
  const uz = az / axisLen;
  const center = {
    x: (anchor1.x + anchor2.x) / 2,
    z: (anchor1.z + anchor2.z) / 2,
  };

  // Signed projection relative to center: positive = toward team2 base.
  function proj(p: Pt): number {
    return (p.x - center.x) * ux + (p.z - center.z) * uz;
  }

  // Team1's deepest advance is its furthest positive projection (toward
  // team2's base); Team2's is its furthest negative projection, sign-flipped.
  const d1 = Math.max(0, ...team1.map((k) => proj(k)));
  const d2 = Math.max(0, ...team2.map((k) => -proj(k)));

  const winner = d1 >= d2 ? input.team1Name : input.team2Name;
  const margin = Math.abs(d1 - d2);
  const confidence = Math.min(1, margin / (axisLen / 2));

  return { winner, margin, confidence };
}
