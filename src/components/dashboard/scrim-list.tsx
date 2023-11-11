import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export async function ScrimList() {
  const prisma = new PrismaClient();
  const session = await auth();

  const userData = await prisma.user.findMany({
    where: {
      email: session?.user?.email,
    },
  });

  const teamData = await prisma.team.findMany({
    where: {
      id: userData[0].teamId ?? 0,
    },
  });

  const userCreatedScrims = await prisma.scrim.findMany({
    where: {
      creatorId: userData[0].id,
    },
  });

  const teamScrims = await prisma.scrim.findMany({
    where: {
      teamId: userData[0].teamId ?? 0,
    },
  });

  return (
    <main>
      {userCreatedScrims.length > 0 && <p>{userCreatedScrims.length}</p>}
      {userCreatedScrims.length === 0 && <EmptyScrimList />}
    </main>
  );
}
