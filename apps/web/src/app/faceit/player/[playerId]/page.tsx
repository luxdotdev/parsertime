import { AppRuntime } from "@/data/runtime";
import { FaceitPlayerScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayerProfileHeader } from "@/components/faceit/player-profile-header";
import { PlayerThreatAssessment } from "@/components/faceit/player-threat-assessment";
import { PlayerFsrCard } from "@/components/faceit/player-fsr-card";
import { PlayerStatProfile } from "@/components/faceit/player-stat-profile";
import { PlayerRoleUsage } from "@/components/faceit/player-role-usage";
import { PlayerMapWinrates } from "@/components/faceit/player-map-winrates";
import { PlayerMatchHistory } from "@/components/faceit/player-match-history";
import { PlayerTeams } from "@/components/faceit/player-teams";
import { Skeleton } from "@/components/ui/skeleton";

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

// Static shell: the page frame prerenders and the profile (flag check, param,
// DB reads) streams into ONE boundary whose fallback mirrors the loaded
// sections, so navigation shows a single stable skeleton.
export default function FaceitPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <Suspense fallback={<PlayerProfileSkeleton />}>
          <FaceitPlayerContent params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function FaceitPlayerContent({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const enabled = await getFlag(faceitScouting);
  if (!enabled) notFound();
  const { playerId } = await params;
  const { season: seasonParam } = await searchParams;
  const parsedSeason = Number.parseInt(seasonParam ?? "", 10);
  const season = Number.isNaN(parsedSeason) ? undefined : parsedSeason;
  const profile = await AppRuntime.runPromise(
    FaceitPlayerScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitPlayerProfile(playerId, { season }))
    )
  );
  if (!profile) notFound();
  const primary =
    profile.fsrRoles.find((r) => r.primary) ?? profile.fsrRoles[0] ?? null;

  return (
    <>
      <PlayerProfileHeader
        player={profile.player}
        seasons={profile.seasons.map((s) => s.season)}
        season={profile.season}
      />
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
    </>
  );
}

// Mirrors the loaded sections (profile header + ribbon, threat assessment,
// FSR, stat profile, role usage, map winrates, match history, teams) so the
// streamed content replaces this in place.
function PlayerProfileSkeleton() {
  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="flex flex-col gap-1 px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </dl>
      </div>

      <section className="space-y-5">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="border-border space-y-3 border-y py-4">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-12 w-28" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {["a", "b", "c", "d"].map((k) => (
                <div key={k} className="space-y-1">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="flex flex-col gap-1 px-4 py-3">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            ))}
          </dl>
          <div className="border-border rounded-md border">
            <Skeleton className="h-8 w-full rounded-none rounded-t-md" />
            {["a", "b", "c", "d"].map((k) => (
              <Skeleton
                key={k}
                className="h-10 w-full rounded-none border-t border-[var(--border)]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid items-center gap-x-10 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-2.5 lg:col-span-7">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div key={k} className="flex items-center gap-3">
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-4 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <ul className="space-y-3">
          {["a", "b", "c"].map((k) => (
            <li key={k} className="flex items-center gap-4">
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-4 w-12 shrink-0" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="border-border rounded-md border">
            <Skeleton className="h-8 w-full rounded-none rounded-t-md" />
            {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
              <Skeleton
                key={k}
                className="h-10 w-full rounded-none border-t border-[var(--border)]"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="border-border rounded-md border">
            <Skeleton className="h-8 w-full rounded-none rounded-t-md" />
            {["a", "b", "c"].map((k) => (
              <Skeleton
                key={k}
                className="h-10 w-full rounded-none border-t border-[var(--border)]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="border-border rounded-md border">
          <Skeleton className="h-8 w-full rounded-none rounded-t-md" />
          {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
            <Skeleton
              key={k}
              className="h-10 w-full rounded-none border-t border-[var(--border)]"
            />
          ))}
        </div>
      </section>

      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <ul className="space-y-2">
          {["a", "b", "c"].map((k) => (
            <li key={k} className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
