export type Vec = { x: number; y: number };

export type Sample = { x: number; y: number; t: number };

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type HeadingOptions = {
  /** Ignore links farther than this many px from the cursor. */
  maxDistance: number;
  /** Half-angle (degrees) of the cone around the cursor's heading. */
  coneAngleDeg: number;
  /** Minimum speed (px/ms); below this the cursor is treated as resting. */
  minSpeed: number;
};

/**
 * Estimate cursor velocity (px/ms) from the oldest and newest samples in the
 * buffer. Returns a zero vector when there are fewer than two samples or no
 * time has elapsed between them.
 */
export function estimateVelocity(samples: Sample[]): Vec {
  if (samples.length < 2) return { x: 0, y: 0 };
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  if (dt <= 0) return { x: 0, y: 0 };
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}

/**
 * True when the cursor is heading toward `rect`: within `maxDistance`, moving
 * faster than `minSpeed`, and within the heading cone (`coneAngleDeg`).
 */
export function isHeadingToward(
  cursor: Vec,
  velocity: Vec,
  rect: Rect,
  opts: HeadingOptions
): boolean {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = centerX - cursor.x;
  const dy = centerY - cursor.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > opts.maxDistance) return false;
  if (distance === 0) return true;

  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed < opts.minSpeed) return false;

  // Dot product of the normalized heading and cursor->link directions.
  const dot = (velocity.x * dx + velocity.y * dy) / (speed * distance);
  return dot >= Math.cos((opts.coneAngleDeg * Math.PI) / 180);
}
