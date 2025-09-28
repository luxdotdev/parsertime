import { DmgDoneVsDmgTakenChart } from "@/components/charts/player/dmg-done-vs-dmg-taken-chart";
import { DmgTakenVsHealingReceivedChart } from "@/components/charts/player/dmg-taken-vs-healing-chart";
import { KillfeedTable } from "@/components/map/killfeed-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardIcon } from "@/components/ui/card-icon";
import {
  calculateDroughtTime,
  calculateXFactor,
  getAverageTimeToUseUlt,
  getAverageUltChargeTime,
  getDuelWinrates,
} from "@/lib/analytics";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getColorblindMode,
  groupPlayerKillsIntoFights,
  removeDuplicateRows,
  toHero,
  toTimestamp,
} from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function PlayerAnalytics({
  id,
  playerName,
}: {
  id: number;
  playerName: string;
}) {
  const t = await getTranslations("mapPage.player.analytics");

  const [
    averageTimeToUltimate,
    averageTimeToUseUlt,
    droughtTime,
    duels,
    match,
    fights,
    xFactor,
    allDamageTakens,
    allHealingReceiveds,
    allHeroDamageDone,
    session,
  ] = await Promise.all([
    getAverageUltChargeTime(id, playerName),
    getAverageTimeToUseUlt(id, playerName),
    calculateDroughtTime(id, playerName),
    getDuelWinrates(id, playerName),
    prisma.matchStart.findFirst({ where: { MapDataId: id } }),
    groupPlayerKillsIntoFights(id, playerName),
    calculateXFactor(id, playerName),
    prisma.playerStat.findMany({
      where: { MapDataId: id, player_name: playerName },
      select: { id: true, round_number: true, damage_taken: true },
    }),
    prisma.playerStat.findMany({
      where: { MapDataId: id, player_name: playerName },
      select: { id: true, round_number: true, healing_received: true },
    }),
    prisma.playerStat.findMany({
      where: { MapDataId: id, player_name: playerName },
      select: { id: true, round_number: true, hero_damage_dealt: true },
    }),
    auth(),
  ]);

  const allDamageTakensByRound = removeDuplicateRows(allDamageTakens);
  const allHealingReceivedsByRound = removeDuplicateRows(allHealingReceiveds);
  const allHeroDamageDoneByRound = removeDuplicateRows(allHeroDamageDone);

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

  const { team1: team1Color, team2: team2Color } = await getColorblindMode(
    session?.user.id ?? ""
  );

  return (
    <main className="min-h-[65vh]">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgUltChargeTime.title")}
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
            <p className="text-muted-foreground text-xs">
              {t("avgUltChargeTime.footer")}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgTimeUseUlt.title")}
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
            <p className="text-muted-foreground text-xs">
              {t("avgTimeUseUlt.footer")}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgDroughtTime.title")}
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
            <p className="text-muted-foreground text-xs">
              {t("avgDroughtTime.footer")}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("xFactor.title")}
            </CardTitle>
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
            <p className="text-muted-foreground text-xs">
              {t("xFactor.footer")}
            </p>
          </CardFooter>
        </Card>
        <Card className="col-span-full max-h-[80vh] overflow-y-auto 2xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("versus.title")}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {t("versus.description", { playerName })}
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
                      className="h-12 w-12 rounded border-2"
                      style={{
                        border:
                          duel.player_team === match?.team_1_name
                            ? `2px solid ${team1Color}`
                            : `2px solid ${team2Color}`,
                      }}
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
                      className="h-12 w-12 rounded border-2"
                      style={{
                        border:
                          duel.enemy_team === match?.team_1_name
                            ? `2px solid ${team1Color}`
                            : `2px solid ${team2Color}`,
                      }}
                    />
                    <div className="text-lg font-medium">{duel.enemy_name}</div>
                  </div>
                </div>
                <div className="align-middle text-lg">
                  {t("versus.score")}{" "}
                  <span
                    style={{
                      color:
                        duel.player_team === match?.team_1_name
                          ? team1Color
                          : team2Color,
                    }}
                  >
                    {duel.enemy_deaths}
                  </span>{" "}
                  -{" "}
                  <span
                    style={{
                      color:
                        duel.enemy_team === match?.team_1_name
                          ? team1Color
                          : team2Color,
                    }}
                  >
                    {duel.enemy_kills}
                  </span>
                </div>
                {t.rich("versus.winrate", {
                  color: (chunks) => (
                    <span
                      style={{
                        color:
                          duel.enemy_deaths > duel.enemy_kills
                            ? duel.player_team === match?.team_1_name
                              ? team1Color
                              : team2Color
                            : duel.enemy_deaths < duel.enemy_kills
                              ? duel.player_team === match?.team_1_name
                                ? team2Color
                                : team1Color
                              : "purple-500",
                      }}
                    >
                      {chunks}
                    </span>
                  ),
                  winrate: (
                    (duel.enemy_deaths /
                      (duel.enemy_kills + duel.enemy_deaths)) *
                    100
                  ).toFixed(2),
                })}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-full max-h-[80vh] overflow-y-auto 2xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("playerKillfeed.title")}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {t("playerKillfeed.description", { playerName })}
            </p>
          </CardHeader>
          <CardContent>
            <KillfeedTable
              fights={fights}
              team1={match?.team_1_name ?? t("playerKillfeed.team1")}
              team2={match?.team_2_name ?? t("playerKillfeed.team2")}
              team1Color={team1Color}
              team2Color={team2Color}
            />
          </CardContent>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("dmgTakenHealingReceived.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DmgTakenVsHealingReceivedChart
              damageTakenByRound={damageTakenByRound}
              healingReceivedByRound={healingReceivedByRound}
            />
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {t("dmgTakenHealingReceived.footer")}
            </p>
          </CardFooter>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("dmgDoneDmgTaken.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DmgDoneVsDmgTakenChart
              damageDoneByRound={damageDoneByRound}
              damageTakenByRound={damageTakenByRound}
            />
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {t("dmgDoneDmgTaken.footer")}
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
