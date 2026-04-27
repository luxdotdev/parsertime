import { HeroSRDisplay } from "@/components/player/hero-sr-display";
import { StatCardFooter } from "@/components/player/stat-card-footer";
import {
  HeroPortraitBlock,
  StatBlock,
  StatPanel,
} from "@/components/player/stat-panel";
import { StatsTable } from "@/components/player/stats-table";
import { CardIcon } from "@/components/ui/card-icon";
import {
  calculateCompositeHeroSR,
  getMultipleStatComparisons,
  type StatCardComparison,
} from "@/lib/stat-card-helpers";
import type { ValidStatColumn } from "@/lib/stat-percentiles";
import { cn, getHeroNames, round, toHero, toMins } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PlayerStat } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function SpecificHero({
  playerStats,
  showTable = true,
}: {
  playerStats: PlayerStat[];
  showTable?: boolean;
}) {
  const t = await getTranslations("mapPage.compare.playerCard.specificHero");
  const heroNames = await getHeroNames();

  const hero = playerStats[0].player_hero as HeroName;
  const playerStat = playerStats[0];
  const role = heroRoleMapping[hero];
  const heroDisplayName = heroNames.get(toHero(hero)) ?? hero;

  const statsToCompare: { stat: ValidStatColumn; value: number }[] = [
    { stat: "eliminations", value: playerStat.eliminations },
    { stat: "deaths", value: playerStat.deaths },
    { stat: "hero_damage_dealt", value: playerStat.hero_damage_dealt },
    { stat: "ultimates_used", value: playerStat.ultimates_used },
  ];

  if (role === "Tank") {
    statsToCompare.push(
      { stat: "damage_blocked", value: playerStat.damage_blocked },
      { stat: "damage_taken", value: playerStat.damage_taken }
    );
  } else if (role === "Damage") {
    statsToCompare.push(
      { stat: "final_blows", value: playerStat.final_blows },
      { stat: "solo_kills", value: playerStat.solo_kills }
    );
  } else if (role === "Support") {
    statsToCompare.push(
      { stat: "healing_dealt", value: playerStat.healing_dealt },
      { stat: "healing_received", value: playerStat.healing_received }
    );
  }

  let comparisons = new Map<ValidStatColumn, StatCardComparison>();
  let compositeHeroSR = 0;

  if (playerStat.hero_time_played >= 60) {
    comparisons = await getMultipleStatComparisons(
      hero,
      statsToCompare,
      playerStat.hero_time_played
    );
    const allStats: Record<ValidStatColumn, number> = {
      eliminations: playerStat.eliminations,
      final_blows: playerStat.final_blows,
      deaths: playerStat.deaths,
      hero_damage_dealt: playerStat.hero_damage_dealt,
      healing_dealt: playerStat.healing_dealt,
      healing_received: playerStat.healing_received,
      damage_blocked: playerStat.damage_blocked,
      damage_taken: playerStat.damage_taken,
      solo_kills: playerStat.solo_kills,
      ultimates_earned: playerStat.ultimates_earned,
      ultimates_used: playerStat.ultimates_used,
      objective_kills: playerStat.objective_kills,
      offensive_assists: playerStat.offensive_assists,
      defensive_assists: playerStat.defensive_assists,
    };

    compositeHeroSR = await calculateCompositeHeroSR(
      hero,
      allStats,
      playerStat.hero_time_played
    );
  }

  return (
    <main>
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-foreground scroll-m-20 text-xl font-semibold tracking-tight first:mt-0">
          {heroDisplayName} <HeroSRDisplay sr={compositeHeroSR} />
        </h2>
      </div>
      <div className={cn("flex flex-col gap-4", showTable && "2xl:flex-row")}>
        <div className={cn(showTable && "2xl:flex-1")}>
          <StatPanel>
            <div className="flex flex-col lg:flex-row">
              <HeroPortraitBlock
                src={`/heroes/${toHero(hero)}.png`}
                alt={t("altText", { hero: heroDisplayName })}
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
                    time: round(playerStat.hero_time_played / 60).toFixed(2),
                  })}
                  sub={t("matchTime", {
                    percent: round(
                      (playerStat.hero_time_played / playerStat.match_time) *
                        100
                    ).toFixed(2),
                  })}
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
                    elims: playerStat.eliminations,
                    showTable: showTable ? "ination" : "",
                  })}
                  sub={
                    <StatCardFooter
                      baseText={t("elimsPer10Min", {
                        elims: round(
                          (playerStat.eliminations /
                            toMins(playerStat.hero_time_played)) *
                            10
                        ),
                      })}
                      comparison={comparisons.get("eliminations")}
                      stat={t("eliminations")}
                      hero={hero}
                    />
                  }
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
                  value={t("deathNum", { num: playerStat.deaths })}
                  sub={
                    <StatCardFooter
                      baseText={t("deathsPer10Min", {
                        deaths: round(
                          (playerStat.deaths /
                            toMins(playerStat.hero_time_played)) *
                            10
                        ),
                      })}
                      comparison={comparisons.get("deaths")}
                      stat={t("deaths")}
                      hero={hero}
                    />
                  }
                />
                <StatBlock
                  label={t("ultsUsed")}
                  icon={
                    <CardIcon>
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </CardIcon>
                  }
                  value={t("ultsUsedNum", { num: playerStat.ultimates_used })}
                  sub={
                    <StatCardFooter
                      baseText={t("ultsPer10Min", {
                        num: round(
                          (playerStat.ultimates_used /
                            toMins(playerStat.hero_time_played)) *
                            10
                        ),
                      })}
                      comparison={comparisons.get("ultimates_used")}
                      stat={t("ultsUsed")}
                      hero={hero}
                    />
                  }
                />
                <StatBlock
                  label={t("heroDmgDealt")}
                  icon={
                    <CardIcon>
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </CardIcon>
                  }
                  value={t("heroDmgDealtNum", {
                    num: round(playerStat.hero_damage_dealt).toLocaleString(),
                  })}
                  sub={
                    <StatCardFooter
                      baseText={t("heroDmgPer10Min", {
                        num: round(
                          (playerStat.hero_damage_dealt /
                            toMins(playerStat.hero_time_played)) *
                            10
                        ).toLocaleString(),
                      })}
                      comparison={comparisons.get("hero_damage_dealt")}
                      stat={t("heroDmgDealt")}
                      hero={hero}
                    />
                  }
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
                        num: round(playerStat.damage_blocked).toLocaleString(),
                      })}
                      sub={
                        <StatCardFooter
                          baseText={t("dmgBlockedPer10Min", {
                            num: round(
                              (playerStat.damage_blocked /
                                toMins(playerStat.hero_time_played)) *
                                10
                            ).toLocaleString(),
                          })}
                          comparison={comparisons.get("damage_blocked")}
                          stat={t("dmgBlocked")}
                          hero={hero}
                        />
                      }
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
                        num: round(playerStat.damage_taken).toLocaleString(),
                      })}
                      sub={
                        <StatCardFooter
                          baseText={t("dmgTakenPer10Min", {
                            num: round(
                              (playerStat.damage_taken /
                                toMins(playerStat.hero_time_played)) *
                                10
                            ).toLocaleString(),
                          })}
                          comparison={comparisons.get("damage_taken")}
                          stat={t("dmgTaken")}
                          hero={hero}
                        />
                      }
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
                        num: playerStat.final_blows,
                      })}
                      sub={
                        <StatCardFooter
                          baseText={t("finalBlowsPer10Min", {
                            num: round(
                              (playerStat.final_blows /
                                toMins(playerStat.hero_time_played)) *
                                10
                            ),
                          })}
                          comparison={comparisons.get("final_blows")}
                          stat={t("finalBlows")}
                          hero={hero}
                        />
                      }
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
                      value={t("soloKillsNum", { num: playerStat.solo_kills })}
                      sub={
                        <StatCardFooter
                          baseText={t("soloKillsPer10Min", {
                            num: round(
                              (playerStat.solo_kills /
                                toMins(playerStat.hero_time_played)) *
                                10
                            ),
                          })}
                          comparison={comparisons.get("solo_kills")}
                          stat={t("soloKills")}
                          hero={hero}
                        />
                      }
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
                        num: round(playerStat.healing_dealt).toLocaleString(),
                      })}
                      sub={
                        <StatCardFooter
                          baseText={t("healingDealtPer10Min", {
                            num: round(
                              (playerStat.healing_dealt /
                                toMins(playerStat.hero_time_played)) *
                                10
                            ).toLocaleString(),
                          })}
                          comparison={comparisons.get("healing_dealt")}
                          stat={t("healingDealt")}
                          hero={hero}
                        />
                      }
                    />
                    <StatBlock
                      label={t("healingReceived")}
                      icon={
                        <CardIcon>
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </CardIcon>
                      }
                      value={t("healingReceivedNum", {
                        num: round(
                          playerStat.healing_received
                        ).toLocaleString(),
                      })}
                      sub={
                        <StatCardFooter
                          baseText={t("healingReceivedPer10Min", {
                            num: round(
                              (playerStat.healing_received /
                                toMins(playerStat.hero_time_played)) *
                                10
                            ).toLocaleString(),
                          })}
                          comparison={comparisons.get("healing_received")}
                          stat={t("healingReceived")}
                          hero={hero}
                        />
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </StatPanel>
        </div>
        {showTable && (
          <div className="2xl:w-[480px] 2xl:shrink-0">
            <StatsTable data={playerStat} />
          </div>
        )}
      </div>
    </main>
  );
}
