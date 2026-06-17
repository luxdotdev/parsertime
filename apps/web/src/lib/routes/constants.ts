/** Routes need at least this many position samples. */
export const MIN_ROUTE_POINTS = 4;
/** ... and at least this much traveled distance (meters). */
export const MIN_ROUTE_LENGTH_M = 10;
/** Routes are resampled to this many points before clustering. */
export const ROUTE_RESAMPLE_POINTS = 20;
/** Single-link merge threshold (meters, mean pointwise distance). */
export const ROUTE_CLUSTER_THRESHOLD_M = 15;
/** Tendencies aggregate over the team's most recent N scrims per map. */
export const TENDENCIES_SCRIM_WINDOW = 10;
/** Tendencies pools at most this many MapData rows per map. */
export const TENDENCIES_MAX_MAPDATA = 30;
/** Consecutive samples further apart than this (seconds) split a route. */
export const MAX_SAMPLE_GAP_SEC = 10;
/** ... or further apart than this (meters). */
export const MAX_SAMPLE_JUMP_M = 40;
