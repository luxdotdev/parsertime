import "server-only";

import prisma from "@/lib/prisma";

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

/**
 * Resolves which data sources are available for a given team pairing and
 * selects the appropriate fallback path. Called once per page load and
 * threaded through every DTO and insight generator.
 */
export async function resolveDataAvailability(
  opponentAbbr: string,
  userTeamId: number | null
): Promise<DataAvailabilityProfile> {
  const [owcsMapsCount, scrimData, userScrimMaps] = await Promise.all([
    prisma.scoutingMapResult.count({
      where: {
        match: {
          OR: [{ team1: opponentAbbr }, { team2: opponentAbbr }],
        },
      },
    }),
    userTeamId
      ? prisma.scrim.findMany({
          where: { teamId: userTeamId, opponentTeamAbbr: opponentAbbr },
          select: {
            maps: {
              select: { mapData: { select: { id: true } } },
            },
          },
        })
      : Promise.resolve(null),
    userTeamId
      ? prisma.mapData.count({
          where: { Map: { Scrim: { teamId: userTeamId } } },
        })
      : Promise.resolve(0),
  ]);

  const opponentScrimMaps = scrimData
    ? scrimData.reduce(
        (sum, scrim) =>
          sum + scrim.maps.reduce((s, map) => s + map.mapData.length, 0),
        0
      )
    : 0;

  const hasOwcs = owcsMapsCount > 0;
  const hasScrims = opponentScrimMaps > 0;

  let opponentDataSource: DataSource;
  if (hasOwcs && hasScrims) {
    opponentDataSource = "owcs+scrim";
  } else if (hasOwcs) {
    opponentDataSource = "owcs";
  } else if (hasScrims) {
    opponentDataSource = "scrim";
  } else {
    opponentDataSource = "none";
  }

  const userDataSource: DataSource = userScrimMaps > 0 ? "scrim" : "none";

  return {
    opponentOwcsMaps: owcsMapsCount,
    opponentScrimMaps,
    userScrimMaps,
    opponentDataSource,
    userDataSource,
    canCrossReference:
      opponentDataSource !== "none" && userDataSource !== "none",
  };
}
