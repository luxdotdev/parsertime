import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { Card } from "@/components/ui/card";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SearchParams } from "@/types/next";
import { $Enums } from "@prisma/client";

type Props = {
  searchParams: SearchParams;
};

export async function ScrimList({ searchParams }: Props) {
  const session = await auth();

  let scrims = [];

  const userData = await getUser(session?.user?.email);

  if (!userData) {
    return <EmptyScrimList />;
  }

  const userViewableScrims = await prisma.scrim.findMany({
    where: {
      OR: [
        {
          creatorId: userData.id,
        },
        {
          Team: {
            users: {
              some: {
                id: userData.id,
              },
            },
          },
        },
      ],
    },
  });

  for (const scrim of userViewableScrims) {
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

    const hasPerms =
      userData.role === $Enums.UserRole.ADMIN ||
      userData.role === $Enums.UserRole.MANAGER ||
      userData.id === scrim.creatorId;

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
      hasPerms,
    });
  }

  if (searchParams?.team) {
    scrims = scrims.filter(
      (scrim) => scrim.teamId === parseInt(searchParams.team as string)
    );
  }

  scrims = scrims.sort((a, b) => {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });

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

      {scrims.length === 0 && <EmptyScrimList />}
    </main>
  );
}
