import { AppRuntime } from "@/data/runtime";
import { FaceitPlayerScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { notFound } from "next/navigation";
import { PlayerProfileHeader } from "@/components/faceit/player-profile-header";
import { PlayerFsrCard } from "@/components/faceit/player-fsr-card";
import { PlayerStatRadar } from "@/components/faceit/player-stat-radar";
import { PlayerStrengthsWeaknesses } from "@/components/faceit/player-strengths-weaknesses";
import { PlayerRoleUsage } from "@/components/faceit/player-role-usage";
import { PlayerMapWinrates } from "@/components/faceit/player-map-winrates";
import { PlayerMatchHistory } from "@/components/faceit/player-match-history";
import { PlayerTeams } from "@/components/faceit/player-teams";

export default async function FaceitPlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const enabled = await faceitScouting();
  if (!enabled) notFound();
  const { playerId } = await params;
  const profile = await AppRuntime.runPromise(
    FaceitPlayerScoutingService.pipe(Effect.flatMap((svc) => svc.getFaceitPlayerProfile(playerId)))
  );
  if (!profile) notFound();
  const primary = profile.fsrRoles.find((r) => r.primary) ?? profile.fsrRoles[0] ?? null;
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <PlayerProfileHeader player={profile.player} />
        {profile.rated ? (
          <>
            <PlayerFsrCard roles={profile.fsrRoles} />
            {primary ? <PlayerStatRadar role={primary} /> : null}
            {primary ? <PlayerStrengthsWeaknesses role={primary} /> : null}
            <PlayerRoleUsage usage={profile.roleUsage} />
          </>
        ) : null}
        <PlayerMapWinrates byMap={profile.mapWinrates.byMap} byType={profile.mapWinrates.byType} />
        <PlayerMatchHistory entries={profile.matchHistory} />
        <PlayerTeams teams={profile.teams} />
      </div>
    </div>
  );
}
