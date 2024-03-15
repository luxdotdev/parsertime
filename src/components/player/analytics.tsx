import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import prisma from "@/lib/prisma";
import { toTimestamp } from "@/lib/utils";

export async function PlayerAnalytics({
  id,
  playerName,
}: {
  id: number;
  playerName: string;
}) {
  const ultimatesCharged = await prisma.ultimateCharged.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const ultimateEnds = await prisma.ultimateEnd.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const ultimateStarts = await prisma.ultimateStart.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const ultKills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      attacker_name: playerName,
      event_ability: "Ultimate",
    },
  });

  // Calculate average time to ultimate
  // Take the first ultimate charged and the next ultimate end
  // Then take the next ultimate charged and the next ultimate end
  // Continue until the end of the match
  const ultimateTimes = [ultimatesCharged[0].match_time];

  // for each ultimate end, calculate the time between the next ultimate charged and the current ultimate end
  for (let i = 0; i < ultimateEnds.length; i++) {
    const nextUltimateCharged = ultimatesCharged[i + 1];
    if (!nextUltimateCharged) {
      break;
    }
    const currentUltimateEnd = ultimateEnds[i];
    const timeToNextUltimate =
      nextUltimateCharged.match_time - currentUltimateEnd.match_time;

    // if time to next ultimate is negative, it means the next ultimate was charged before the current ultimate was used
    // so we should skip this ultimate end
    // this can happen if the round ends before the ultimate is used
    if (timeToNextUltimate < 0) {
      continue;
    }

    ultimateTimes.push(timeToNextUltimate);
  }

  const averageTimeToUltimate =
    ultimateTimes.reduce((a, b) => a + b, 0) / ultimateTimes.length;

  // Calculate average time to use ultimate
  const ultimateUseTimes = [];

  // for each ultimate charged, find the next ultimate start and calculate the time between the two
  for (let i = 0; i < ultimatesCharged.length; i++) {
    const nextUltimateStart = ultimateStarts[i];
    if (!nextUltimateStart) {
      break;
    }
    const currentUltimateCharged = ultimatesCharged[i];
    const timeToUseUltimate =
      nextUltimateStart.match_time - currentUltimateCharged.match_time;

    ultimateUseTimes.push(timeToUseUltimate);
  }

  const averageTimeToUseUltimate =
    ultimateUseTimes.reduce((a, b) => a + b, 0) / ultimateUseTimes.length;

  const killsPerUltimate = ultKills.length / ultimatesCharged.length;

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
              {toTimestamp(averageTimeToUseUltimate)}
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
