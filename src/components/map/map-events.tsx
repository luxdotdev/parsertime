import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMapEvents } from "@/lib/get-map-events";

export async function MapEvents({ id }: { id: number }) {
  const events = await getMapEvents(id);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Events that occurred during the match. This includes objective
            captures, rounds starting and ending, multikills, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-4">{events}</CardContent>
      </Card>
    </div>
  );
}
