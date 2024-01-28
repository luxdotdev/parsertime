import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { Card } from "@/components/ui/card";
import prisma from "@/lib/prisma";

export async function AdminScrimView() {
  const scrimData = await prisma.scrim.findMany();

  const scrims = [];

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
    });
  }

  return (
    <main>
      {scrims.length > 0 && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {scrims.map((scrim) => (
            <ScrimCard key={scrim.id} scrim={scrim} />
          ))}

          <AddScrimCard />
        </Card>
      )}

      {scrimData.length === 0 && <EmptyScrimList />}
    </main>
  );
}
