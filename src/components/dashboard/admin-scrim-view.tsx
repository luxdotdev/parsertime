import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import prisma from "@/lib/prisma";

export async function AdminScrimView() {
  const scrimData = await prisma.scrim.findMany();

  let scrims = [];

  for (const scrim of scrimData) {
    const teamName = await prisma.team.findFirst({
      where: {
        id: scrim.teamId ?? 0,
      },
    });

    const creatorName = await prisma.user.findMany({
      where: {
        id: scrim.creatorId,
      },
    });

    scrims.push({
      id: scrim.id,
      name: scrim.name,
      createdAt: scrim.createdAt,
      updatedAt: scrim.updatedAt,
      date: scrim.date,
      teamId: scrim.teamId,
      creatorId: scrim.creatorId,
      team: teamName?.name ?? "Uncategorized",
      creator: creatorName[0].name ?? "Unknown",
      hasPerms: true,
    });
  }

  scrims = scrims.sort((a, b) => {
    return a.date > b.date ? 1 : -1;
  });

  return (
    <main>
      {scrims.length > 0 && <ScrimPagination scrims={scrims} />}

      {scrimData.length === 0 && <EmptyScrimList />}
    </main>
  );
}
