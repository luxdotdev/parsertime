import { PlayerHoverCard } from "@/components/player/hover-card";
import { StatBlock, StatGrid, StatPanel } from "@/components/player/stat-panel";
import { SectionHeader } from "@/components/section-header";
import {
  LeaderboardCard,
  type LeaderboardRow,
} from "@/components/stats/leaderboard-card";
import { Searchbar } from "@/components/stats/searchbar";
import { Link } from "@/components/ui/link";
import prisma from "@/lib/prisma";
import {
  format,
  round,
  toTimestampWithDays,
  toTimestampWithHours,
} from "@/lib/utils";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";

export default async function StatsPage() {
  const t = await getTranslations("statsPage");

  const [userNum, scrimNum, killNum, statNum, mapNum, calculatedStatNum] =
    await Promise.all([
      prisma.user.count(),
      prisma.scrim.count(),
      prisma.kill.count(),
      prisma.playerStat.count(),
      prisma.mapData.count(),
      prisma.calculatedStat.count(),
    ]);

  type MostPlayedHeroes = {
    player_hero: string;
    total_time_played: number;
  }[];

  const mostPlayedHeroes = await prisma.$queryRaw<MostPlayedHeroes>`
    SELECT
      player_hero,
      SUM(hero_time_played) AS total_time_played
    FROM
      "PlayerStat"
    GROUP BY
      player_hero
    ORDER BY
      total_time_played DESC
    LIMIT 3;`;

  const [
    topAttackerStats,
    highestPlayerDeaths,
    topDamageStats,
    topHealerStats,
    damageBlockedStats,
    heroTimePlayedStats,
  ] = await Promise.all([
    prisma.kill.groupBy({
      by: ["attacker_name"],
      _count: { attacker_name: true },
      orderBy: { _count: { attacker_name: "desc" } },
      take: 3,
    }),
    prisma.kill.groupBy({
      by: ["victim_name"],
      _count: { victim_name: true },
      orderBy: { _count: { victim_name: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { hero_damage_dealt: true },
      orderBy: { _sum: { hero_damage_dealt: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { healing_dealt: true },
      orderBy: { _sum: { healing_dealt: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { damage_blocked: true },
      orderBy: { _sum: { damage_blocked: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { hero_time_played: true },
      orderBy: { _sum: { hero_time_played: "desc" } },
      take: 3,
    }),
  ]);

  type Ajax = { player_name: string; coincidence_count: number }[];

  const ajaxes = await prisma.$queryRaw<Ajax>`
    SELECT
      k.victim_name AS player_name,
      COUNT(*) AS coincidence_count
    FROM
      "Kill" k
      INNER JOIN "UltimateEnd" ue ON k.victim_name = ue.player_name
        AND k.match_time = ue.match_time
        AND k."MapDataId" = ue."MapDataId"
        AND k."scrimId" = ue."scrimId"
    WHERE
      k.victim_hero = 'Lúcio'
      AND ue.player_hero = 'Lúcio'
    GROUP BY
      k.victim_name
    ORDER BY
      coincidence_count DESC
    LIMIT 3;`;

  function playerLink(name: string) {
    return (
      <PlayerHoverCard player={name}>
        <Link href={`/profile/${encodeURIComponent(name)}` as Route}>
          {name}
        </Link>
      </PlayerHoverCard>
    );
  }

  const heroRows: LeaderboardRow[] = mostPlayedHeroes.map((row) => ({
    key: row.player_hero,
    name: row.player_hero,
    value: toTimestampWithDays(row.total_time_played),
  }));

  const killRows: LeaderboardRow[] = topAttackerStats.map((row) => ({
    key: row.attacker_name,
    name: playerLink(row.attacker_name),
    value: format(row._count.attacker_name),
  }));

  const damageRows: LeaderboardRow[] = topDamageStats.map((row) => ({
    key: row.player_name,
    name: playerLink(row.player_name),
    value: format(round(row._sum.hero_damage_dealt!)),
  }));

  const healingRows: LeaderboardRow[] = topHealerStats.map((row) => ({
    key: row.player_name,
    name: playerLink(row.player_name),
    value: format(round(row._sum.healing_dealt!)),
  }));

  const blockedRows: LeaderboardRow[] = damageBlockedStats.map((row) => ({
    key: row.player_name,
    name: playerLink(row.player_name),
    value: format(round(row._sum.damage_blocked!)),
  }));

  const deathRows: LeaderboardRow[] = highestPlayerDeaths.map((row) => ({
    key: row.victim_name,
    name: playerLink(row.victim_name),
    value: format(row._count.victim_name),
  }));

  const timePlayedRows: LeaderboardRow[] = heroTimePlayedStats.map((row) => ({
    key: row.player_name,
    name: playerLink(row.player_name),
    value: toTimestampWithHours(row._sum.hero_time_played!),
  }));

  const ajaxRows: LeaderboardRow[] = ajaxes.map((row) => ({
    key: row.player_name,
    name: playerLink(row.player_name),
    value: row.coincidence_count.toString(),
  }));

  function valueColumn(label: string) {
    return { label, align: "right" as const };
  }

  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <div className="mb-8">
        <Searchbar />
      </div>

      <section aria-labelledby="global-stats" className="mb-8">
        <SectionHeader id="global-stats" title={t("globalStats")} />
        <StatPanel>
          <StatGrid>
            <StatBlock label={t("users.title")} value={format(userNum)} />
            <StatBlock label={t("scrims.title")} value={format(scrimNum)} />
            <StatBlock label={t("kills.title")} value={format(killNum)} />
            <StatBlock
              label={t("playerStat.title")}
              value={format(statNum + calculatedStatNum)}
            />
          </StatGrid>
        </StatPanel>
      </section>

      <section aria-labelledby="leaderboard">
        <SectionHeader id="leaderboard" title={t("leaderboard")} />
        <StatPanel>
          <div className="bg-border grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-4">
            <LeaderboardCard
              title={t("top3MostPlayed.title")}
              rankLabel={t("top3MostPlayed.rank")}
              columns={[
                { label: t("top3MostPlayed.hero") },
                valueColumn(t("top3MostPlayed.timePlayed")),
              ]}
              rows={heroRows}
              footer={t("top3MostPlayed.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3Kills.title")}
              rankLabel={t("top3Kills.rank")}
              columns={[
                { label: t("top3Kills.player") },
                valueColumn(t("top3Kills.kills")),
              ]}
              rows={killRows}
              footer={t("top3Kills.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3Dmg.title")}
              rankLabel={t("top3Dmg.rank")}
              columns={[
                { label: t("top3Dmg.player") },
                valueColumn(t("top3Dmg.heroDmgDealt")),
              ]}
              rows={damageRows}
              footer={t("top3Dmg.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3Healing.title")}
              rankLabel={t("top3Healing.rank")}
              columns={[
                { label: t("top3Healing.player") },
                valueColumn(t("top3Healing.healingDealt")),
              ]}
              rows={healingRows}
              footer={t("top3Healing.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3DmgBlocked.title")}
              rankLabel={t("top3DmgBlocked.rank")}
              columns={[
                { label: t("top3DmgBlocked.player") },
                valueColumn(t("top3DmgBlocked.dmgBlocked")),
              ]}
              rows={blockedRows}
              footer={t("top3DmgBlocked.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3Deaths.title")}
              rankLabel={t("top3Deaths.rank")}
              columns={[
                { label: t("top3Deaths.player") },
                valueColumn(t("top3Deaths.deaths")),
              ]}
              rows={deathRows}
              footer={t("top3Deaths.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3TimePlayed.title")}
              rankLabel={t("top3TimePlayed.rank")}
              columns={[
                { label: t("top3TimePlayed.player") },
                valueColumn(t("top3TimePlayed.timePlayed")),
              ]}
              rows={timePlayedRows}
              footer={t("top3TimePlayed.footer", { mapNum })}
            />
            <LeaderboardCard
              title={t("top3Ajax.title")}
              rankLabel={t("top3Ajax.rank")}
              columns={[
                { label: t("top3Ajax.player") },
                valueColumn(t("top3Ajax.ajaxes")),
              ]}
              rows={ajaxRows}
              footer={t("top3Ajax.footer", { mapNum })}
            />
          </div>
        </StatPanel>
      </section>
    </div>
  );
}
