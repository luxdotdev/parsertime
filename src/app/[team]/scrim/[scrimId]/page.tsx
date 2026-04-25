import { DashboardLayout } from "@/components/dashboard-layout";
import { DirectionalTransition } from "@/components/directional-transition";
import { AddMapCard } from "@/components/map/add-map";
import { ClientDate } from "@/components/scrim/client-date";
import { CompareSelectedButton } from "@/components/scrim/compare-selected-button";
import { MapCardWithSelection } from "@/components/scrim/map-card-with-selection";
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
import { ScrimOverviewService, ScrimService } from "@/data/scrim";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { mapComparison, overviewCard } from "@/lib/flags";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
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
  const scrimId = decodeURIComponent(params.scrimId);

  const scrim = await prisma.scrim.findFirst({
    where: {
      id: parseInt(scrimId),
    },
    select: {
      name: true,
    },
  });

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
          url: `https://parsertime.app/api/og?title=${t("ogImage", { scrimName })}`,
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

  const maps = (
    await prisma.map.findMany({
      where: {
        scrimId: id,
      },
    })
  ).sort((a, b) => a.id - b.id);

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

  const visibility = (await prisma.scrim.findFirst({
    where: {
      id: parseInt(params.scrimId),
    },
    select: {
      guestMode: true,
    },
  })) ?? { guestMode: false };

  const [mapComparisonEnabled, overviewCardEnabled, opponentFullName] =
    await Promise.all([
      mapComparison(),
      overviewCard(),
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

  const overviewData =
    overviewCardEnabled && maps.length > 0 && teamId
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

          {showOverview && (
            <div className="mt-8">
              <ScrimOverviewSection data={overviewData} />
            </div>
          )}

          {hasPerms && (
            <div className="mt-6">
              <AddMapCard />
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("maps.title")}
            </h2>

            {maps.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {maps.map((map) => (
                  <MapCardWithSelection
                    key={map.id}
                    map={map}
                    scrimId={scrim.id}
                    teamId={teamId ?? params.team}
                    locale={params.locale}
                    mapComparisonEnabled={mapComparisonEnabled}
                  />
                ))}
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
