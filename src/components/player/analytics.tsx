import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import {
  getAverageTimeToUseUlt,
  getAverageUltChargeTime,
  getKillsPerUltimate,
} from "@/lib/analytics";
import { toTimestamp } from "@/lib/utils";

export async function PlayerAnalytics({
  id,
  playerName,
}: {
  id: number;
  playerName: string;
}) {
  const averageTimeToUltimate = await getAverageUltChargeTime(id, playerName);
  const averageTimeToUseUlt = await getAverageTimeToUseUlt(id, playerName);
  const killsPerUltimate = await getKillsPerUltimate(id, playerName);

  return (
    <main className="min-h-[65vh]">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Ultimate Charge Time
            </CardTitle>
            <CardIcon>
              <line x1="10" x2="14" y1="2" y2="2" />
              <line x1="12" x2="15" y1="14" y2="11" />
              <circle cx="12" cy="14" r="8" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toTimestamp(averageTimeToUltimate)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              The average time it takes to build an ultimate.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Time to Use Ultimate
            </CardTitle>
            <CardIcon>
              <path d="M5 22h14" />
              <path d="M5 2h14" />
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toTimestamp(averageTimeToUseUlt)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              The average time it takes to use an ultimate after it&apos;s
              charged.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Number of Final Blows Per Ultimate
            </CardTitle>
            <CardIcon>
              <circle cx="12" cy="12" r="10" />
              <line x1="22" x2="18" y1="12" y2="12" />
              <line x1="6" x2="2" y1="12" y2="12" />
              <line x1="12" x2="12" y1="6" y2="2" />
              <line x1="12" x2="12" y1="22" y2="18" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {killsPerUltimate.toFixed(2)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              The average number of{" "}
              <span className="font-bold">final blows</span> a player gets with
              their ultimate. Note that for some heroes, the ultimate ability
              itself may not result in a kill.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
