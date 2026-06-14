import { ScrimFeedbackBanner } from "@/components/team-ops/scrim-feedback-banner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DirectionalTransition } from "@/components/directional-transition";
import { AddMapCard } from "@/components/map/add-map";
import { ClientDate } from "@/components/scrim/client-date";
import { CompareSelectedButton } from "@/components/scrim/compare-selected-button";
import { MapCardWithSelection } from "@/components/scrim/map-card-with-selection";
import { PositionalStatsSection } from "@/components/scrim/positional-stats-section";
import { ScrimOverviewUnavailable } from "@/components/scrim/scrim-overview-unavailable";
import { ScrimWpaSection } from "@/components/scrim/scrim-wpa-section";
import { Suspense } from "react";
import {
  ScrimOverviewSection,
  WinLossBadge,
  WinRateBadge,
} from "@/components/scrim/scrim-overview-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrimOverviewService,
  ScrimPositionalArtifactsService,
  ScrimPositionalStatsService,
  ScrimService,
} from "@/data/scrim";
import { ScrimInitiationService } from "@/data/scrim/initiation-service";
import { resolveScrimMapWinners } from "@/data/scrim/map-winner-names";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, canManageTeam, isAuthedToViewScrim } from "@/lib/auth";
import { mapComparison, overviewCard, positionalData } from "@/lib/flags";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@/generated/prisma/browser";
import { BadgeCheck } from "lucide-react";
import { ExclamationTriangleIcon, Pencil2Icon } from "@radix-ui/react-icons";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "scrimPage.metadata",
  });
  const scrimId = Number(params.scrimId);
  const canViewScrim =
    Number.isSafeInteger(scrimId) &&
    scrimId > 0 &&
    (await isAuthedToViewScrim(scrimId));

  const scrim = canViewScrim
    ? await prisma.scrim.findFirst({
        where: {
          id: scrimId,
        },
        select: {
          name: true,
        },
      })
    : null;

  const scrimName = scrim?.name ?? t("scrim");

  return {
    title: t("title", { scrimName }),
    description: t("description", { scrimName }),
    openGraph: {
      title: t("ogTitle", { scrimName }),
      description: t("ogDescription", { scrimName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${encodeURIComponent(t("ogImage", { scrimName }))}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function ScrimDashboardPage(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]">
) {
  const params = await props.params;
  const id = parseInt(params.scrimId);
  const session = await auth();
  const t = await getTranslations("scrimPage");

  const scrim = await AppRuntime.runPromise(
    ScrimService.pipe(Effect.flatMap((svc) => svc.getScrim(id)))
  );
  if (!scrim) notFound();

  const teamId = scrim.teamId;

  const maps = await prisma.map.findMany({
    where: {
      scrimId: id,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  // Per-map team names (from the round's MatchStart) power the winner-override
  // dialog. The set-winner endpoint validates the submitted winner against the
  // map's own MatchStart names, so the dialog must offer them verbatim. Keyed
  // by Map.id via MapData.
  const mapTeamNames = new Map<number, { team1: string; team2: string }>();
  if (maps.length > 0) {
    const mapDataRows = await prisma.mapData.findMany({
      where: { scrimId: id },
      select: {
        Map: { select: { id: true } },
        match_start: {
          select: { team_1_name: true, team_2_name: true },
          take: 1,
        },
      },
    });
    for (const row of mapDataRows) {
      const mapId = row.Map?.id;
      const ms = row.match_start[0];
      if (mapId != null && ms && !mapTeamNames.has(mapId)) {
        mapTeamNames.set(mapId, {
          team1: ms.team_1_name,
          team2: ms.team_2_name,
        });
      }
    }
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  const isManager = teamId
    ? (await prisma.teamManager.findFirst({
        where: {
          teamId,
          userId: user?.id,
        },
      })) !== null && session !== null
    : false;

  const hasPerms =
    user?.id === scrim?.creatorId ||
    isManager ||
    user?.role === $Enums.UserRole.MANAGER ||
    user?.role === $Enums.UserRole.ADMIN;

  const feedbackScrim = await prisma.scrim.findUnique({
    where: { id },
    select: {
      id: true,
      teamId: true,
      opponentTeamId: true,
      feedback: { select: { id: true } },
      opponentTeam: { select: { name: true } },
    },
  });

  const canManage = await canManageTeam(feedbackScrim?.teamId, user);

  const visibility = (await prisma.scrim.findFirst({
    where: {
      id: parseInt(params.scrimId),
    },
    select: {
      guestMode: true,
    },
  })) ?? { guestMode: false };

  const [
    mapComparisonEnabled,
    overviewCardEnabled,
    showPositional,
    opponentFullName,
  ] = await Promise.all([
    mapComparison(),
    overviewCard(),
    positionalData(),
    scrim.opponentTeamAbbr
      ? prisma.scoutingMatch
          .findFirst({
            where: {
              OR: [
                { team1: scrim.opponentTeamAbbr },
                { team2: scrim.opponentTeamAbbr },
              ],
            },
            select: {
              team1: true,
              team1FullName: true,
              team2: true,
              team2FullName: true,
            },
          })
          .then((m) => {
            if (!m) return scrim.opponentTeamAbbr;
            return m.team1 === scrim.opponentTeamAbbr
              ? m.team1FullName
              : m.team2FullName;
          })
      : Promise.resolve(null),
  ]);

  // The overview's roster-identity heuristic (getTeamRoster) anchors on the
  // most-frequent player across the team's maps, which can't reliably tell
  // which side is "our team" until the team has at least two scrims. Mirror
  // the team stats page (totalScrimCount < 2 -> placeholder) and skip the
  // overview for new teams rather than render a possibly-inverted record.
  const totalScrimCount = teamId
    ? await prisma.scrim.count({ where: { teamId } })
    : 0;
  const isNewTeam = teamId !== null && totalScrimCount < 2;

  const overviewData =
    overviewCardEnabled && maps.length > 0 && teamId && !isNewTeam
      ? await AppRuntime.runPromise(
          ScrimOverviewService.pipe(
            Effect.flatMap((svc) => svc.getScrimOverview(id, teamId))
          )
        )
      : null;
  const showOverview =
    overviewData !== null &&
    overviewData.mapCount > 0 &&
    overviewData.teamPlayers.length > 0;
  const showOverviewUnavailable =
    overviewCardEnabled && isNewTeam && maps.length > 0;

  const positionalStats =
    showPositional && maps.length > 0
      ? await AppRuntime.runPromise(
          ScrimPositionalStatsService.pipe(
            Effect.flatMap((svc) => svc.getScrimPositionalStats(id))
          )
        )
      : null;

  const positionalArtifacts =
    showPositional && maps.length > 0 && teamId
      ? await AppRuntime.runPromise(
          ScrimPositionalArtifactsService.pipe(
            Effect.flatMap((svc) => svc.getScrimPositionalArtifacts(id, teamId))
          )
        )
      : null;

  const scrimInitiation =
    overviewCardEnabled && maps.length > 0 && teamId && !isNewTeam
      ? await AppRuntime.runPromise(
          ScrimInitiationService.pipe(
            Effect.flatMap((svc) => svc.getScrimInitiation(id))
          )
        )
      : null;

  // Build per-map winner metadata for the map cards' W/L badge + override
  // dialog. The resolved winner prefers the stored Map.winner (manual override
  // or auto-detected); otherwise it falls back to the overview's resolved
  // result mapped back to a team name. ourTeamName is consistent across a
  // scrim's maps, so the overview's global value drives the Won/Lost badge.
  const ourTeamName = overviewData?.ourTeamName ?? null;
  const opponentTeamName = overviewData?.opponentTeamName ?? null;
  const mapResultById = new Map(
    (overviewData?.mapResults ?? []).map((r) => [r.mapId, r.winner])
  );
  // When the overview is gated off (new team, individual scrim, or flag off)
  // there is no ourTeamName to classify Won/Lost and no mapResults to fall back
  // on. Resolve the literal winning team name per map instead so the card can
  // still surface the result (as a neutral winner badge).
  const ungatedWinners = overviewData ? null : await resolveScrimMapWinners(id);
  const mapMetaById = new Map<
    number,
    {
      team1Name: string | null;
      team2Name: string | null;
      resolvedWinner: string | null;
    }
  >();
  for (const m of maps) {
    const names = mapTeamNames.get(m.id) ?? null;
    let resolvedWinner: string | null = m.winner ?? null;
    if (!resolvedWinner) {
      if (overviewData) {
        const result = mapResultById.get(m.id);
        if (result === "our_team") resolvedWinner = ourTeamName;
        else if (result === "opponent") resolvedWinner = opponentTeamName;
        else if (result === "draw") resolvedWinner = "N/A";
      } else {
        resolvedWinner = ungatedWinners?.get(m.id) ?? null;
      }
    }
    mapMetaById.set(m.id, {
      team1Name: names?.team1 ?? null,
      team2Name: names?.team2 ?? null,
      resolvedWinner,
    });
  }

  return (
    <DirectionalTransition>
      <DashboardLayout guestMode={visibility.guestMode}>
        <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
          <nav className="text-muted-foreground flex items-center gap-3 text-sm">
            <Link href="/dashboard" transitionTypes={["contract-map"]}>
              &larr; {t("back")}
            </Link>
            {teamId && (
              <>
                <span className="text-muted-foreground/40" aria-hidden="true">
                  |
                </span>
                <Link
                  href={`/stats/team/${teamId}` as Route}
                  transitionTypes={["nav-forward"]}
                >
                  {t("viewStats")} &rarr;
                </Link>
              </>
            )}
          </nav>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {scrim?.name ?? t("newScrim")}
              </h1>
              {hasPerms && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={
                        `/${params.team}/scrim/${params.scrimId}/edit` as Route
                      }
                      aria-label={t("edit")}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
                    >
                      <Pencil2Icon className="h-3.5 w-3.5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{t("edit")}</TooltipContent>
                </Tooltip>
              )}
            </div>
            {showOverview && (
              <div className="ml-auto flex items-center gap-3">
                <WinLossBadge
                  wins={overviewData.wins}
                  losses={overviewData.losses}
                  draws={overviewData.draws}
                />
                <WinRateBadge
                  wins={overviewData.wins}
                  mapCount={overviewData.mapCount}
                />
              </div>
            )}
          </div>

          <div
            className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.04em] uppercase tabular-nums"
            aria-label="Scrim metadata"
          >
            <ClientDate date={scrim.date} />
            <span className="text-muted-foreground/40" aria-hidden="true">
              ·
            </span>
            <span>{t("meta.mapCount", { count: maps.length })}</span>
            {scrim.opponentTeamAbbr && (
              <>
                <span className="text-muted-foreground/40" aria-hidden="true">
                  ·
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={
                        `/scouting/team/${encodeURIComponent(scrim.opponentTeamAbbr)}` as Route
                      }
                      className="hover:text-foreground inline-flex items-center gap-1.5 no-underline"
                    >
                      <BadgeCheck
                        className="text-primary size-3"
                        aria-hidden="true"
                      />
                      <span>
                        {t("meta.opp")}{" "}
                        {opponentFullName ?? scrim.opponentTeamAbbr}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>View OWCS scouting report</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {feedbackScrim?.opponentTeamId != null &&
            feedbackScrim.opponentTeam &&
            !feedbackScrim.feedback &&
            canManage && (
              <div className="mt-4">
                <ScrimFeedbackBanner
                  scrimId={feedbackScrim.id}
                  opponentName={feedbackScrim.opponentTeam.name}
                />
              </div>
            )}

          {showOverview ? (
            <div className="mt-8">
              <ScrimOverviewSection
                data={overviewData}
                positionalStats={positionalStats}
                positionalArtifacts={positionalArtifacts}
                initiation={scrimInitiation}
                wpaSlot={
                  // Streams in as the last accordion item without blocking the
                  // page: aggregating WPA across a scrim's maps is the heaviest
                  // read here. Returns null (no item) when there's no data.
                  <Suspense fallback={null}>
                    <ScrimWpaSection scrimId={id} />
                  </Suspense>
                }
              />
            </div>
          ) : showOverviewUnavailable ? (
            <div className="mt-8">
              <ScrimOverviewUnavailable />
            </div>
          ) : (
            showPositional &&
            positionalStats && (
              <div className="mt-8">
                <PositionalStatsSection
                  data={positionalStats}
                  artifacts={positionalArtifacts}
                />
              </div>
            )
          )}

          {hasPerms && (
            <div className="mt-6">
              <AddMapCard scrimId={id} existingMapCount={maps.length} />
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("maps.title")}
            </h2>

            {maps.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {maps.map((map) => {
                  const meta = mapMetaById.get(map.id);
                  return (
                    <MapCardWithSelection
                      key={map.id}
                      map={map}
                      scrimId={scrim.id}
                      teamId={teamId ?? params.team}
                      locale={params.locale}
                      mapComparisonEnabled={mapComparisonEnabled}
                      team1Name={meta?.team1Name}
                      team2Name={meta?.team2Name}
                      ourTeamName={ourTeamName}
                      resolvedWinner={meta?.resolvedWinner}
                      canManage={hasPerms}
                    />
                  );
                })}
              </div>
            ) : (
              <Alert variant="destructive" className="mt-4 max-w-xl">
                <ExclamationTriangleIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                <AlertTitle>{t("noMaps.title")}</AlertTitle>
                <AlertDescription>
                  {t("noMaps.description")}
                  <Link
                    href="https://docs.parsertime.app"
                    target="_blank"
                    external
                  >
                    {t("noMaps.link")}
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {mapComparisonEnabled && teamId && (
          <CompareSelectedButton teamId={teamId} />
        )}
      </DashboardLayout>
    </DirectionalTransition>
  );
}
