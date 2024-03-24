import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import {
  calculateDroughtTime,
  calculateXFactor,
  getAverageTimeToUseUlt,
  getAverageUltChargeTime,
  getDuelWinrates,
  getKillsPerUltimate,
} from "@/lib/analytics";
import {
  cn,
  groupPlayerKillsIntoFights,
  removeDuplicateRows,
  toHero,
  toTimestamp,
} from "@/lib/utils";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { KillfeedTable } from "@/components/map/killfeed-table";
import { DmgTakenVsHealingReceivedChart } from "@/components/charts/player/dmg-taken-vs-healing-chart";
import { DmgDoneVsDmgTakenChart } from "@/components/charts/player/dmg-done-vs-dmg-taken-chart";

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
  const droughtTime = await calculateDroughtTime(id, playerName);

  const duels = await getDuelWinrates(id, playerName);

  const match = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const fights = await groupPlayerKillsIntoFights(id, playerName);

  const xFactor = await calculateXFactor(id, playerName);

  const allDamageTakensByRound = removeDuplicateRows(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_name: playerName,
      },
      select: {
        id: true,
        round_number: true,
        damage_taken: true,
      },
    })
  );

  const allHealingReceivedsByRound = removeDuplicateRows(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_name: playerName,
      },
      select: {
        id: true,
        round_number: true,
        healing_received: true,
      },
    })
  );

  const allHeroDamageDoneByRound = removeDuplicateRows(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_name: playerName,
      },
      select: {
        id: true,
        round_number: true,
        hero_damage_dealt: true,
      },
    })
  );

  // filter out different heroes and sum the damage taken and healing received by round
  const damageTakenByRound = allDamageTakensByRound.reduce(
    (acc, { round_number, damage_taken }) => {
      if (!acc[round_number]) {
        acc[round_number] = 0;
      }
      acc[round_number] += damage_taken;
      return acc;
    },
    {} as Record<number, number>
  );

  const healingReceivedByRound = allHealingReceivedsByRound.reduce(
    (acc, { round_number, healing_received }) => {
      if (!acc[round_number]) {
        acc[round_number] = 0;
      }
      acc[round_number] += healing_received;
      return acc;
    },
    {} as Record<number, number>
  );

  const damageDoneByRound = allHeroDamageDoneByRound.reduce(
    (acc, { round_number, hero_damage_dealt }) => {
      if (!acc[round_number]) {
        acc[round_number] = 0;
      }
      acc[round_number] += hero_damage_dealt;
      return acc;
    },
    {} as Record<number, number>
  );

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
              The average time it takes to build an ultimate. A lower time is
              better, while a longer time might indicate that you are not doing
              enough damage or healing.
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
              charged. A longer time might indicate that you are not using your
              ultimate effectively or are holding onto it for too long.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Drought Time
            </CardTitle>
            <CardIcon>
              <path d="M10 2h4" />
              <path d="M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7" />
              <path d="M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2" />
              <path d="m2 2 20 20" />
              <path d="M12 12v-2" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toTimestamp(droughtTime)}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              The drought time is the average time between your most recent kill
              and your next kill. A high drought time can indicate that you are
              not participating in fights as often as you should be.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">X Factor</CardTitle>
            <CardIcon>
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{xFactor.toFixed(2)}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              The X Factor is a measure of a player&apos;s individual impact on
              a fight. If your X Factor is high, you are likely to be the
              deciding factor in a fight. Please note that this is calculated
              differently for each role.
            </p>
          </CardFooter>
        </Card>
        <Card className="col-span-full max-h-[80vh] overflow-y-auto 2xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Versus Other Players
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {playerName}&apos;s score and winrates against players on the
              enemy team.
            </p>
          </CardHeader>
          <CardContent>
            {duels.map((duel) => (
              <div key={duel.enemy_name} className="pb-4">
                <div
                  key={duel.player_name}
                  className="flex items-center space-x-2"
                >
                  <div className="flex items-center space-x-2">
                    <Image
                      src={`/heroes/${toHero(duel.player_hero)}.png`}
                      alt=""
                      width={256}
                      height={256}
                      className={cn(
                        "h-12 w-12 rounded border-2",
                        duel.player_team === match?.team_1_name
                          ? "border-blue-500"
                          : "border-red-500"
                      )}
                    />
                    <div className="text-lg font-medium">
                      {duel.player_name}
                    </div>
                    <div className="text-lg font-medium">&rarr;</div>
                    <Image
                      src={`/heroes/${toHero(duel.enemy_hero)}.png`}
                      alt=""
                      width={256}
                      height={256}
                      className={cn(
                        "h-12 w-12 rounded border-2",
                        duel.enemy_team === match?.team_1_name
                          ? "border-blue-500"
                          : "border-red-500"
                      )}
                    />
                    <div className="text-lg font-medium">{duel.enemy_name}</div>
                  </div>
                </div>
                <div className="align-middle text-lg">
                  Score:{" "}
                  <span
                    className={cn(
                      duel.player_team === match?.team_1_name
                        ? "text-blue-500"
                        : "text-red-500"
                    )}
                  >
                    {duel.enemy_deaths}
                  </span>{" "}
                  -{" "}
                  <span
                    className={cn(
                      duel.enemy_team === match?.team_1_name
                        ? "text-blue-500"
                        : "text-red-500"
                    )}
                  >
                    {duel.enemy_kills}
                  </span>
                </div>
                Winrate:{" "}
                <span
                  className={cn(
                    duel.enemy_deaths > duel.enemy_kills
                      ? duel.player_team === match?.team_1_name
                        ? "text-blue-500"
                        : "text-red-500"
                      : duel.enemy_deaths < duel.enemy_kills
                        ? duel.player_team === match?.team_1_name
                          ? "text-red-500"
                          : "text-blue-500"
                        : "text-purple-500"
                  )}
                >
                  {(
                    (duel.enemy_deaths /
                      (duel.enemy_kills + duel.enemy_deaths)) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-full max-h-[80vh] overflow-y-auto 2xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Player Killfeed
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              A list of all the final blows and deaths for {playerName} in this
              match. Fights where {playerName} did not get a final blow are not
              shown.
            </p>
          </CardHeader>
          <CardContent>
            <KillfeedTable
              fights={fights}
              team1={match?.team_1_name ?? "Team 1"}
              team2={match?.team_2_name ?? "Team 2"}
            />
          </CardContent>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Damage Taken vs Healing Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DmgTakenVsHealingReceivedChart
              damageTakenByRound={damageTakenByRound}
              healingReceivedByRound={healingReceivedByRound}
            />
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              This chart shows the cumulative damage taken and healing received
              by round. The x-axis represents the round number, and the y-axis
              represents the cumulative damage taken or healing received.
            </p>
          </CardFooter>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Hero Damage Dealt vs Damage Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DmgDoneVsDmgTakenChart
              damageDoneByRound={damageDoneByRound}
              damageTakenByRound={damageTakenByRound}
            />
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              This chart shows the hero damage dealt and damage taken by round.
              The x-axis represents the round number, and the y-axis represents
              the damage dealt or damage taken.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
