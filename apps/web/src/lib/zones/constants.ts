/** Density grid cell edge length in meters. */
export const GRID_CELL_SIZE_M = 3;
/** Seconds of padding around each contention event when building windows. */
export const CONTENTION_PAD_SEC = 5;
/** Point polygon = flood fill of cells >= this fraction of the peak density. */
export const POINT_CONTOUR_FRACTION = 0.4;
/** Minimum contention samples before a point proposal is emitted. */
export const MIN_POINT_SAMPLES = 200;
/** Minimum blurred peak density for a point proposal. */
export const MIN_POINT_PEAK = 5;
/** Sanity bounds on point polygon area (square meters). */
export const MIN_POINT_AREA_M2 = 25;
export const MAX_POINT_AREA_M2 = 2500;
/** Lane mask = cells >= this fraction of the max blurred density. */
export const LANE_MASK_FRACTION = 0.15;
/** Corridors shorter than this (meters) are pruned as spurs/noise. */
export const MIN_LANE_LENGTH_M = 30;
/** Overwatch maps are 3-lane designs. */
export const MAX_LANES = 3;
/** Lane corridor width clamp (meters, half-width marches each side). */
export const MIN_LANE_WIDTH_M = 4;
export const MAX_LANE_WIDTH_M = 16;
/** Payload progress bucket size (percent) for path tracing. */
export const PAYLOAD_PROGRESS_BUCKET = 10;
/** A corridor must be within this mean distance of the payload path to be MAIN. */
export const MAX_MAIN_LANE_DIST_M = 15;
/** Minimum pooled samples for the classifier to run at all. */
export const MIN_TOTAL_SAMPLES = 500;
/** Most recent MapData rows pooled per map. */
export const MAX_MAPDATA_POOLED = 100;
/** Keep every Nth centerline cell when simplifying corridors. */
export const CENTERLINE_DECIMATE = 3;
