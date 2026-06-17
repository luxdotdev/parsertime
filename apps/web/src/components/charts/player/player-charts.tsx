import { PlayerStatByRoundChart } from "@/components/charts/player/player-stat-by-round-chart";
import { StatPanel } from "@/components/player/stat-panel";
import { ScrimService } from "@/data/scrim";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import {
  type NonMappableStat,
  type Stat,
  sumStatByRound,
} from "@/lib/player-charts";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { getTranslations } from "next-intl/server";

type Props = {
  id: number;
  playerName: string;
};

export async function PlayerCharts({ id, playerName }: Props) {
  const t = await getTranslations("mapPage.player.charts");
  const mapDataId = await resolveMapDataId(id);

  async function getStatByRound<T extends keyof Omit<Stat, NonMappableStat>>(
    stat: T
  ): Promise<({ round_number: number } & Record<T, number>)[]> {
    const playerStatByRound = (await prisma.playerStat.findMany({
      where: {
        MapDataId: mapDataId,
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
    where: { MapDataId: mapDataId },
    select: { team_1_name: true, team_2_name: true },
  });

  const team1Name = teams?.team_1_name ?? t("team1");

  const playerTeamName = await prisma.playerStat.findFirst({
    where: { MapDataId: mapDataId, player_name: playerName },
    select: { player_team: true },
  });

  const playerTeam =
    playerTeamName?.player_team === team1Name ? "Team1" : "Team2";

  const finalStats = await AppRuntime.runPromise(
    ScrimService.pipe(
      Effect.flatMap((svc) => svc.getFinalRoundStatsForPlayer(id, playerName))
    )
  );

  const mostPlayedHero = finalStats.find(
    (stat) =>
      stat.hero_time_played ===
      Math.max(...finalStats.map((stat) => stat.hero_time_played))
  )?.player_hero as HeroName;

  const playerRole = heroRoleMapping[mostPlayedHero];

  const cells: { title: string; footer: string; chart: React.ReactNode }[] = [
    {
      title: t("dmgByRound.title"),
      footer: t("dmgByRound.footer", { playerName }),
      chart: (
        <PlayerStatByRoundChart
          stat="hero_damage_dealt"
          playerStatByRound={await getStatByRound("hero_damage_dealt")}
          playerName={playerName}
          playerTeam={playerTeam}
        />
      ),
    },
  ];

  if (playerRole === "Tank") {
    cells.push({
      title: t("dmgBlockByRound.title"),
      footer: t("dmgBlockByRound.footer", { playerName }),
      chart: (
        <PlayerStatByRoundChart
          stat="damage_blocked"
          playerStatByRound={await getStatByRound("damage_blocked")}
          playerName={playerName}
          playerTeam={playerTeam}
        />
      ),
    });
  } else if (playerRole === "Damage") {
    cells.push({
      title: t("finalBlowsByRound.title"),
      footer: t("finalBlowsByRound.footer", { playerName }),
      chart: (
        <PlayerStatByRoundChart
          stat="final_blows"
          playerStatByRound={await getStatByRound("final_blows")}
          playerName={playerName}
          playerTeam={playerTeam}
        />
      ),
    });
  } else if (playerRole === "Support") {
    cells.push({
      title: t("healingByRound.title"),
      footer: t("healingByRound.footer", { playerName }),
      chart: (
        <PlayerStatByRoundChart
          stat="healing_dealt"
          playerStatByRound={await getStatByRound("healing_dealt")}
          playerName={playerName}
          playerTeam={playerTeam}
        />
      ),
    });
  }

  cells.push(
    {
      title: t("dmgTakenByRound.title"),
      footer: t("dmgTakenByRound.footer", { playerName }),
      chart: (
        <PlayerStatByRoundChart
          stat="damage_taken"
          playerStatByRound={await getStatByRound("damage_taken")}
          playerName={playerName}
          playerTeam={playerTeam}
        />
      ),
    },
    {
      title: t("healingReceivedByRound.title"),
      footer: t("healingReceivedByRound.footer", { playerName }),
      chart: (
        <PlayerStatByRoundChart
          stat="healing_received"
          playerStatByRound={await getStatByRound("healing_received")}
          playerName={playerName}
          playerTeam={playerTeam}
        />
      ),
    }
  );

  return (
    <StatPanel>
      <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
        {cells.map((cell) => (
          <div key={cell.title} className="bg-card flex flex-col px-5 py-5">
            <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
              {cell.title}
            </h3>
            <div className="mt-5">{cell.chart}</div>
            <p className="text-muted-foreground mt-4 text-xs">{cell.footer}</p>
          </div>
        ))}
      </div>
    </StatPanel>
  );
}
