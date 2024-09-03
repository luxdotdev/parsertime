import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import { getUserViewableScrims } from "@/data/scrim-dto";
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

  const userViewableScrims = await getUserViewableScrims(userData.id);

  for (const scrim of userViewableScrims) {
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
      guestMode: scrim.guestMode,
      team: teamName?.name ?? "Uncategorized",
      creator: creatorName[0].name ?? "Unknown",
      hasPerms,
    });
  }

  scrims = scrims.sort((a, b) => {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
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
      {scrims.length === 0 && <EmptyScrimList />}
    </main>
  );
}
