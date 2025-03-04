import { PlayerStatByRoundChart } from "@/components/charts/player/player-stat-by-round-chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlayerFinalStats } from "@/data/scrim-dto";
import { NonMappableStat, Stat, sumStatByRound } from "@/lib/player-charts";
import prisma from "@/lib/prisma";
import { HeroName, heroRoleMapping } from "@/types/heroes";
import { getTranslations } from "next-intl/server";

type Props = {
  id: number;
  playerName: string;
};

export async function PlayerCharts({ id, playerName }: Props) {
  const t = await getTranslations("mapPage.player.charts");

  async function getStatByRound<T extends keyof Omit<Stat, NonMappableStat>>(
    stat: T
  ): Promise<Array<{ round_number: number } & Record<T, number>>> {
    const playerStatByRound = (await prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_name: playerName,
      },
      select: {
        [stat]: true,
        round_number: true,
        player_hero: true,
      },
    })) as unknown as Stat[];

    return sumStatByRound(playerStatByRound, stat);
  }

  const teams = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      team_1_name: true,
      team_2_name: true,
    },
  });

  const team1Name = teams?.team_1_name ?? t("team1");

  const playerTeamName = await prisma.playerStat.findFirst({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      player_team: true,
    },
  });

  const playerTeam =
    playerTeamName?.player_team === team1Name ? "Team1" : "Team2";

  const finalStats = await getPlayerFinalStats(id, playerName);

  const mostPlayedHero = finalStats.filter(
    (stat) =>
      stat.hero_time_played ===
      Math.max(...finalStats.map((stat) => stat.hero_time_played))
  )[0].player_hero as HeroName;

  const playerRole = heroRoleMapping[mostPlayedHero];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{t("dmgByRound.title")}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <PlayerStatByRoundChart
            stat="hero_damage_dealt"
            playerStatByRound={await getStatByRound("hero_damage_dealt")}
            playerName={playerName}
            playerTeam={playerTeam}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            {t("dmgByRound.footer", { playerName })}
          </p>
        </CardFooter>
      </Card>
      {playerRole === "Tank" && (
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("dmgBlockByRound.title")}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <PlayerStatByRoundChart
              stat="damage_blocked"
              playerStatByRound={await getStatByRound("damage_blocked")}
              playerName={playerName}
              playerTeam={playerTeam}
            />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              {t("dmgBlockByRound.footer", { playerName })}
            </p>
          </CardFooter>
        </Card>
      )}
      {playerRole === "Damage" && (
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("finalBlowsByRound.title")}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <PlayerStatByRoundChart
              stat="final_blows"
              playerStatByRound={await getStatByRound("final_blows")}
              playerName={playerName}
              playerTeam={playerTeam}
            />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              {t("finalBlowsByRound.footer", { playerName })}
            </p>
          </CardFooter>
        </Card>
      )}
      {playerRole === "Support" && (
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("healingByRound.title")}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <PlayerStatByRoundChart
              stat="healing_dealt"
              playerStatByRound={await getStatByRound("healing_dealt")}
              playerName={playerName}
              playerTeam={playerTeam}
            />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              {t("healingByRound.footer", { playerName })}
            </p>
          </CardFooter>
        </Card>
      )}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{t("dmgTakenByRound.title")}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <PlayerStatByRoundChart
            stat="damage_taken"
            playerStatByRound={await getStatByRound("damage_taken")}
            playerName={playerName}
            playerTeam={playerTeam}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            {t("dmgTakenByRound.footer", { playerName })}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{t("healingReceivedByRound.title")}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <PlayerStatByRoundChart
            stat="healing_received"
            playerStatByRound={await getStatByRound("healing_received")}
            playerName={playerName}
            playerTeam={playerTeam}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            {t("healingReceivedByRound.footer", { playerName })}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
