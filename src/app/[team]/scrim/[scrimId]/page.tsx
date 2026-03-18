import { DashboardLayout } from "@/components/dashboard-layout";
import { AddMapCard } from "@/components/map/add-map";
import { ClientDate } from "@/components/scrim/client-date";
import { CompareSelectedButton } from "@/components/scrim/compare-selected-button";
import { MapCardWithSelection } from "@/components/scrim/map-card-with-selection";
import { ScrimOverviewCard } from "@/components/scrim/scrim-overview-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getScrim } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
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

  const scrim = await getScrim(id);
  if (!scrim?.teamId) notFound();

  const teamId = scrim.teamId; // TypeScript knows it's not null after the check

  const maps = (
    await prisma.map.findMany({
      where: {
        scrimId: id,
      },
    })
  ).sort((a, b) => a.id - b.id);

  const user = await getUser(session?.user?.email);

  const isManager =
    (await prisma.teamManager.findFirst({
      where: {
        teamId,
        userId: user?.id,
      },
    })) !== null && session !== null;

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

  return (
    <DashboardLayout guestMode={visibility.guestMode}>
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header Section */}
        <div>
          <h4 className="text-gray-600 dark:text-gray-400">
            <Link href="/dashboard">&larr; {t("back")}</Link>
            {" | "}
            <Link href={`/stats/team/${teamId}` as Route}>
              {t("viewStats")} &rarr;
            </Link>
          </h4>
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-3xl leading-none font-bold tracking-tight">
              <span className="flex items-center space-x-2">
                {scrim?.name ?? t("newScrim")}{" "}
                {hasPerms && (
                  <Link
                    className="inline-flex items-center pl-2"
                    href={
                      `/${params.team}/scrim/${params.scrimId}/edit` as Route
                    }
                    aria-label={t("edit")}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Pencil2Icon className="h-6 w-6 align-middle" />
                      </TooltipTrigger>
                      <TooltipContent>{t("edit")}</TooltipContent>
                    </Tooltip>
                  </Link>
                )}
              </span>
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h4 className="text-xl font-semibold tracking-tight">
              <ClientDate date={scrim.date} />
            </h4>
            {scrim.opponentTeamAbbr && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={
                      `/scouting/team/${encodeURIComponent(scrim.opponentTeamAbbr)}` as Route
                    }
                    className="no-underline"
                  >
                    <Badge
                      variant="secondary"
                      className="gap-1.5 text-xs font-medium"
                    >
                      <BadgeCheck
                        className="h-3.5 w-3.5 text-amber-500"
                        aria-hidden="true"
                      />
                      Opponent: {opponentFullName ?? scrim.opponentTeamAbbr}
                    </Badge>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>View OWCS scouting report</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Overview Card */}
        {overviewCardEnabled && maps.length > 0 && (
          <ScrimOverviewCard scrimId={id} teamId={teamId} />
        )}

        {/* Drop Zone (managers/owners only) */}
        {hasPerms && <AddMapCard />}

        {/* Maps Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight">
              {t("maps.title")}
            </h3>
          </div>

          {maps.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {maps.map((map) => (
                <MapCardWithSelection
                  key={map.id}
                  map={map}
                  scrimId={scrim.id}
                  teamId={teamId}
                  locale={params.locale}
                  mapComparisonEnabled={mapComparisonEnabled}
                />
              ))}
            </div>
          ) : (
            <Alert variant="destructive" className="max-w-xl">
              <ExclamationTriangleIcon className="h-4 w-4" />
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

      {/* Compare Selected Button */}
      {mapComparisonEnabled && <CompareSelectedButton teamId={teamId} />}
    </DashboardLayout>
  );
}
