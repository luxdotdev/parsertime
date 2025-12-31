import { DashboardLayout } from "@/components/dashboard-layout";
import { DangerZone } from "@/components/scrim/danger-zone";
import { EditScrimForm } from "@/components/scrim/edit-scrim-form";
import { Link } from "@/components/ui/link";
import { getScrim } from "@/data/scrim-dto";
import { getTeamsWithPerms } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";

export default async function EditScrimPage(
  props: PageProps<"/[team]/scrim/[scrimId]/edit">
) {
  const params = await props.params;
  const scrim = await getScrim(parseInt(params.scrimId));
  const session = await auth();
  const t = await getTranslations("scrimPage.editScrim");

  if (!scrim) {
    return <div>{t("scrimNotFound")}</div>;
  }

  const teamsWithPerms = await getTeamsWithPerms(session?.user?.email);

  const maps = (
    await prisma.map.findMany({
      where: {
        scrimId: scrim.id,
      },
    })
  ).sort((a, b) => a.id - b.id);

  const [heroBansByMap, teamNamesByMap] = await Promise.all([
    Promise.all(
      maps.map((map) =>
        prisma.heroBan.findMany({
          where: { MapDataId: map.id },
          orderBy: { banPosition: "asc" },
        })
      )
    ),
    Promise.all(
      maps.map((map) =>
        prisma.matchStart.findFirst({
          where: { MapDataId: map.id },
          select: { team_1_name: true, team_2_name: true },
        })
      )
    ),
  ]);

  const mapsWithHeroBans = maps.map((map, index) => ({
    ...map,
    heroBans: heroBansByMap[index],
    team1Name: teamNamesByMap[index]?.team_1_name ?? "Team 1",
    team2Name: teamNamesByMap[index]?.team_2_name ?? "Team 2",
  }));

  return (
    <DashboardLayout>
      <main className="container py-2">
        <h4 className="pb-2 text-gray-600 dark:text-gray-400">
          <Link href={`/${params.team}/scrim/${params.scrimId}` as Route}>
            &larr; {t("back")}
          </Link>
        </h4>
        <div className="mx-auto max-w-lg px-4">
          <h3 className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
            {t("title")}
          </h3>

          <EditScrimForm
            scrim={scrim}
            teams={teamsWithPerms}
            maps={mapsWithHeroBans}
          />
          <div className="p-4" />
          <DangerZone scrim={scrim} />
        </div>
      </main>
    </DashboardLayout>
  );
}
