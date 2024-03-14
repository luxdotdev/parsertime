import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMapEvents, getUltimatesUsedList } from "@/lib/get-map-events";

export async function MapEvents({ id }: { id: number }) {
  const events = await getMapEvents(id);
  const ultimates = await getUltimatesUsedList(id);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Events that occurred during the match. This includes objective
            captures, rounds starting and ending, multikills, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-4 max-h-[150vh] overflow-y-auto">
          {events}
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Ultimates Used</CardTitle>
          <CardDescription>
            A list of all ultimates used during the match and the times when
            they occurred.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-4 max-h-[150vh] overflow-y-auto">
          {ultimates}
        </CardContent>
      </Card>
    </div>
  );
}
