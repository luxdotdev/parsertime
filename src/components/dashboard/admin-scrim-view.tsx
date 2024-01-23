import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { Card } from "@/components/ui/card";
import { PrismaClient } from "@prisma/client";

export async function AdminScrimView() {
  const prisma = new PrismaClient();

  const scrimData = await prisma.scrim.findMany();

  return (
    <main>
      {scrimData.length > 0 && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {scrimData.map((scrim) => (
            <ScrimCard key={scrim.id} scrim={scrim} />
          ))}

          <AddScrimCard />
        </Card>
      )}

      {scrimData.length === 0 && <EmptyScrimList />}
    </main>
  );
}
