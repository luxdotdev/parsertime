/**
 * Data availability types for the scouting intelligence system.
 *
 * The full `resolveDataAvailability` implementation is part of Phase 3.5.
 * This file defines the shared types so that Phase 2 DTOs can be written
 * with correct signatures today, keeping Phase 3.5 integration clean.
 */

export type DataSource = "owcs" | "scrim" | "owcs+scrim" | "none";

export type DataAvailabilityProfile = {
  opponentOwcsMaps: number;
  opponentScrimMaps: number;
  userScrimMaps: number;
  opponentDataSource: DataSource;
  userDataSource: DataSource;
  canCrossReference: boolean;
};

/**
 * Confidence thresholds applied when the data source includes scrim data.
 * Scrims receive a one-tier confidence penalty relative to OWCS maps,
 * reflecting lower signal strength in practice matches.
 */
export const SCRIM_CONFIDENCE_THRESHOLDS = {
  high: 30,
  medium: 15,
  low: 7,
} as const;

export function hasScrimData(profile: DataAvailabilityProfile): boolean {
  return (
    profile.opponentDataSource === "scrim" ||
    profile.opponentDataSource === "owcs+scrim"
  );
}

export function hasOwcsData(profile: DataAvailabilityProfile): boolean {
  return (
    profile.opponentDataSource === "owcs" ||
    profile.opponentDataSource === "owcs+scrim"
  );
}
