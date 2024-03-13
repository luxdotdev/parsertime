import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";

export async function MapEvents({ id }: { id: number }) {
  const matchStart = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const matchEnd = await prisma.matchEnd.findFirst({
    where: {
      MapDataId: id,
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="pl-2"></CardContent>
      </Card>
    </div>
  );
}
