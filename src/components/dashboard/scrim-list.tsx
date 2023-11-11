import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PlusCircledIcon } from "@radix-ui/react-icons";

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
      {userCreatedScrims.length > 0 && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {userCreatedScrims.map((scrim) => (
            <ScrimCard key={scrim.id} scrim={scrim} />
          ))}

          <AddScrimCard />
        </Card>
      )}

      {userCreatedScrims.length === 0 && <EmptyScrimList />}
    </main>
  );
}
