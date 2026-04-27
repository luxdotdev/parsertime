import prisma from "@/lib/prisma";
import type { FaceitTier, TsrRegion } from "@prisma/client";

export type PlayerTsrSnapshot = {
  rating: number;
  matchCount: number;
  recentMatchCount365d: number;
  maxTierReached: FaceitTier;
  region: TsrRegion;
  faceitNickname: string;
  faceitPlayerId: string;
  battletag: string | null;
};

// Resolve a player's TSR by trying every BattleTag they might be known by:
// the registered Parsertime user's battletag, the raw display name, and any
// rows in BattletagAlias. Returns null if nothing matches a FaceitPlayer
// that has a computed PlayerTsr row.
export async function getPlayerTsrByBattletag(
  candidates: (string | null | undefined)[]
): Promise<PlayerTsrSnapshot | null> {
  const tags = [...new Set(candidates.filter((c): c is string => !!c?.trim()))];
  if (tags.length === 0) return null;

  const direct = await prisma.faceitPlayer.findFirst({
    where: { battletag: { in: tags, mode: "insensitive" } },
    include: { tsr: true },
  });
  if (direct?.tsr) {
    return {
      rating: direct.tsr.rating,
      matchCount: direct.tsr.matchCount,
      recentMatchCount365d: direct.tsr.recentMatchCount365d,
      maxTierReached: direct.tsr.maxTierReached,
      region: direct.tsr.region,
      faceitNickname: direct.faceitNickname,
      faceitPlayerId: direct.faceitPlayerId,
      battletag: direct.battletag,
    };
  }

  const alias = await prisma.battletagAlias.findFirst({
    where: { battletag: { in: tags, mode: "insensitive" } },
    include: { player: { include: { tsr: true } } },
  });
  if (alias?.player.tsr) {
    return {
      rating: alias.player.tsr.rating,
      matchCount: alias.player.tsr.matchCount,
      recentMatchCount365d: alias.player.tsr.recentMatchCount365d,
      maxTierReached: alias.player.tsr.maxTierReached,
      region: alias.player.tsr.region,
      faceitNickname: alias.player.faceitNickname,
      faceitPlayerId: alias.player.faceitPlayerId,
      battletag: alias.player.battletag,
    };
  }

  return null;
}
