import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export async function AdminScrimView() {
  const scrimData = await prisma.scrim.findMany();
  const t = await getTranslations("dashboard.scrimCard");

  let scrims = [];

  for (const scrim of scrimData) {
    const [teamName, creatorName] = await Promise.all([
      prisma.team.findFirst({
        where: {
          id: scrim.teamId ?? 0,
        },
      }),
      prisma.user.findMany({
        where: {
          id: scrim.creatorId,
        },
      }),
    ]);

    scrims.push({
      id: scrim.id,
      name: scrim.name,
      createdAt: scrim.createdAt,
      updatedAt: scrim.updatedAt,
      date: scrim.date,
      teamId: scrim.teamId ?? 0,
      creatorId: scrim.creatorId,
      guestMode: scrim.guestMode,
      team: teamName?.name ?? t("noTeam"),
      creator: creatorName[0].name ?? t("noCreator"),
      hasPerms: true,
    });
  }

  scrims = scrims.sort((a, b) => {
    return a.date > b.date ? 1 : -1;
  });

  return (
    <main>
      {scrims.length > 0 && (
        <ScrimPagination
          scrims={scrims.sort((a, b) => {
            return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
          })}
        />
      )}

      {scrimData.length === 0 && <EmptyScrimList />}
    </main>
  );
}
