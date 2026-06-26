import { AppRuntime } from "@/data/runtime";
import { FaceitPlayerScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PlayerProfileHeader } from "@/components/faceit/player-profile-header";
import { PlayerThreatAssessment } from "@/components/faceit/player-threat-assessment";
import { PlayerFsrCard } from "@/components/faceit/player-fsr-card";
import { PlayerStatProfile } from "@/components/faceit/player-stat-profile";
import { PlayerRoleUsage } from "@/components/faceit/player-role-usage";
import { PlayerMapWinrates } from "@/components/faceit/player-map-winrates";
import { PlayerMatchHistory } from "@/components/faceit/player-match-history";
import { PlayerTeams } from "@/components/faceit/player-teams";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const t = await getTranslations("faceitPlayerPage.metadata");
  const player = await prisma.faceitPlayer.findUnique({
    where: { faceitPlayerId: playerId },
    select: { faceitNickname: true },
  });
  const name = player?.faceitNickname ?? "FACEIT player";
  return {
    title: t("profileTitle", { player: name }),
    description: t("profileDescription", { player: name }),
  };
}

export default async function FaceitPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const enabled = await faceitScouting();
  if (!enabled) notFound();
  const { playerId } = await params;
  const profile = await AppRuntime.runPromise(
    FaceitPlayerScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitPlayerProfile(playerId))
    )
  );
  if (!profile) notFound();
  const primary =
    profile.fsrRoles.find((r) => r.primary) ?? profile.fsrRoles[0] ?? null;

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <PlayerProfileHeader player={profile.player} />
        <PlayerThreatAssessment
          rated={profile.rated}
          roles={profile.fsrRoles}
          byMap={profile.mapWinrates.byMap}
          matchHistory={profile.matchHistory}
        />
        {profile.rated ? (
          <>
            <PlayerFsrCard roles={profile.fsrRoles} />
            {primary ? <PlayerStatProfile role={primary} /> : null}
            <PlayerRoleUsage usage={profile.roleUsage} />
          </>
        ) : null}
        <PlayerMapWinrates
          byMap={profile.mapWinrates.byMap}
          byType={profile.mapWinrates.byType}
        />
        <PlayerMatchHistory entries={profile.matchHistory} />
        <PlayerTeams teams={profile.teams} />
      </div>
    </div>
  );
}
