import {
  HeroPortraitBlock,
  StatBlock,
  StatPanel,
} from "@/components/player/stat-panel";
import { StatsTable } from "@/components/player/stats-table";
import { CardIcon } from "@/components/ui/card-icon";
import { cn, round, toMins } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PlayerStat } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function AllHeroes({
  playerStats,
  showTable = true,
}: {
  playerStats: PlayerStat[];
  showTable?: boolean;
}) {
  const t = await getTranslations("mapPage.compare.playerCard.allHeroes");
  const hero = playerStats[0].player_hero as HeroName;
  const role = heroRoleMapping[hero];

  const totalTimePlayed = playerStats.reduce(
    (acc, stat) => acc + stat.hero_time_played,
    0
  );
  const totalElims = playerStats.reduce(
    (acc, stat) => acc + stat.eliminations,
    0
  );
  const totalDeaths = playerStats.reduce((acc, stat) => acc + stat.deaths, 0);
  const totalUlts = playerStats.reduce(
    (acc, stat) => acc + stat.ultimates_used,
    0
  );
  const totalHeroDamage = playerStats.reduce(
    (acc, stat) => acc + stat.hero_damage_dealt,
    0
  );
  const totalDamageBlocked = playerStats.reduce(
    (acc, stat) => acc + stat.damage_blocked,
    0
  );
  const totalDamageTaken = playerStats.reduce(
    (acc, stat) => acc + stat.damage_taken,
    0
  );
  const totalFinalBlows = playerStats.reduce(
    (acc, stat) => acc + stat.final_blows,
    0
  );
  const totalSoloKills = playerStats.reduce(
    (acc, stat) => acc + stat.solo_kills,
    0
  );
  const totalHealingDealt = playerStats.reduce(
    (acc, stat) => acc + stat.healing_dealt,
    0
  );
  const totalHealingReceived = playerStats.reduce(
    (acc, stat) => acc + stat.healing_received,
    0
  );

  function per10(value: number) {
    return totalTimePlayed > 0
      ? round((value / toMins(totalTimePlayed)) * 10)
      : 0;
  }

  return (
    <main>
      <h2 className="text-foreground scroll-m-20 pb-3 text-xl font-semibold tracking-tight first:mt-0">
        {t("title")}
      </h2>
      <div
        className={cn(
          "flex flex-col gap-4",
          showTable && "2xl:flex-row"
        )}
      >
        <div className={cn(showTable && "2xl:flex-1")}>
          <StatPanel>
            <div className="flex flex-col lg:flex-row">
              <HeroPortraitBlock
                src="/heroes/default.png"
                alt={t("title")}
                caption={role}
                className="border-border lg:w-[200px] lg:shrink-0 lg:border-r"
              />
              <div className="grid flex-1 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-3">
                <StatBlock
                  label={t("timePlayed")}
                  icon={
                    <CardIcon>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </CardIcon>
                  }
                  value={t("minutes", {
                    time: round(totalTimePlayed / 60).toFixed(2),
                  })}
                  sub={t("matchTime")}
                />
                <StatBlock
                  label={t("eliminations")}
                  icon={
                    <CardIcon>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" x2="18" y1="12" y2="12" />
                      <line x1="6" x2="2" y1="12" y2="12" />
                      <line x1="12" x2="12" y1="6" y2="2" />
                      <line x1="12" x2="12" y1="22" y2="18" />
                    </CardIcon>
                  }
                  value={t("elims", {
                    elims: round(totalElims),
                    showTable: showTable ? "ination" : "",
                  })}
                  sub={t("elimsPer10Min", { elims: per10(totalElims) })}
                />
                <StatBlock
                  label={t("deaths")}
                  icon={
                    <CardIcon>
                      <circle cx="9" cy="12" r="1" />
                      <circle cx="15" cy="12" r="1" />
                      <path d="M8 20v2h8v-2" />
                      <path d="m12.5 17-.5-1-.5 1h1z" />
                      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
                    </CardIcon>
                  }
                  value={t("deathNum", { num: round(totalDeaths) })}
                  sub={t("deathsPer10Min", { deaths: per10(totalDeaths) })}
                />
                <StatBlock
                  label={t("ultsUsed")}
                  icon={
                    <CardIcon>
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </CardIcon>
                  }
                  value={t("ultsUsedNum", { num: round(totalUlts) })}
                  sub={t("ultsPer10Min", { num: per10(totalUlts) })}
                />
                <StatBlock
                  label={t("heroDmgDealt")}
                  icon={
                    <CardIcon>
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </CardIcon>
                  }
                  value={t("heroDmgDealtNum", {
                    num: round(totalHeroDamage).toLocaleString(),
                  })}
                  sub={t("heroDmgPer10Min", {
                    num: per10(totalHeroDamage).toLocaleString(),
                  })}
                />
                {role === "Tank" && (
                  <>
                    <StatBlock
                      label={t("dmgBlocked")}
                      icon={
                        <CardIcon>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        </CardIcon>
                      }
                      value={t("dmgBlockedNum", {
                        num: round(totalDamageBlocked).toLocaleString(),
                      })}
                      sub={t("dmgBlockedPer10Min", {
                        num: per10(totalDamageBlocked).toLocaleString(),
                      })}
                    />
                    <StatBlock
                      label={t("dmgTaken")}
                      icon={
                        <CardIcon>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                          <path d="m14.5 9-5 5" />
                          <path d="m9.5 9 5 5" />
                        </CardIcon>
                      }
                      value={t("dmgTakenNum", {
                        num: round(totalDamageTaken).toLocaleString(),
                      })}
                      sub={t("dmgTakenPer10Min", {
                        num: per10(totalDamageTaken).toLocaleString(),
                      })}
                    />
                  </>
                )}
                {role === "Damage" && (
                  <>
                    <StatBlock
                      label={t("finalBlows")}
                      icon={
                        <CardIcon>
                          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                        </CardIcon>
                      }
                      value={t("finalBlowsNum", {
                        num: round(totalFinalBlows),
                      })}
                      sub={t("finalBlowsPer10Min", {
                        num: per10(totalFinalBlows),
                      })}
                    />
                    <StatBlock
                      label={t("soloKills")}
                      icon={
                        <CardIcon>
                          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                          <line x1="13" x2="19" y1="19" y2="13" />
                          <line x1="16" x2="20" y1="16" y2="20" />
                          <line x1="19" x2="21" y1="21" y2="19" />
                          <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
                          <line x1="5" x2="9" y1="14" y2="18" />
                          <line x1="7" x2="4" y1="17" y2="20" />
                          <line x1="3" x2="5" y1="19" y2="21" />
                        </CardIcon>
                      }
                      value={t("soloKillsNum", { num: round(totalSoloKills) })}
                      sub={t("soloKillsPer10Min", {
                        num: per10(totalSoloKills),
                      })}
                    />
                  </>
                )}
                {role === "Support" && (
                  <>
                    <StatBlock
                      label={t("healingDealt")}
                      icon={
                        <CardIcon>
                          <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
                        </CardIcon>
                      }
                      value={t("healingDealtNum", {
                        num: round(totalHealingDealt).toLocaleString(),
                      })}
                      sub={t("healingDealtPer10Min", {
                        num: per10(totalHealingDealt).toLocaleString(),
                      })}
                    />
                    <StatBlock
                      label={t("healingReceived")}
                      icon={
                        <CardIcon>
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </CardIcon>
                      }
                      value={t("healingReceivedNum", {
                        num: round(totalHealingReceived).toLocaleString(),
                      })}
                      sub={t("healingReceivedPer10Min", {
                        num: per10(totalHealingReceived).toLocaleString(),
                      })}
                    />
                  </>
                )}
              </div>
            </div>
          </StatPanel>
        </div>
        {showTable && (
          <div className="2xl:w-[480px] 2xl:shrink-0">
            <StatsTable data={playerStats[0]} />
          </div>
        )}
      </div>
    </main>
  );
}
