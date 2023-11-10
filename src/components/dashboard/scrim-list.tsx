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

  const scrims = await prisma.scrim.findMany({
    where: {
      teamId: userData[0].teamId ?? 0,
    },
  });

  console.log(scrims);

  return (
    <main>
      {scrims.length > 0 && <div />}
      {scrims.length === 0 && <EmptyScrimList />}
    </main>
  );
}
