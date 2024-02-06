import { StatsTable } from "@/components/player/stats-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import { round, toHero, toMins } from "@/lib/utils";
import { HeroName, heroRoleMapping } from "@/types/heroes";
import { PlayerStatRows } from "@/types/prisma";
import Image from "next/image";

export default function AllHeroes({
  playerStats,
}: {
  playerStats: PlayerStatRows;
}) {
  const hero = playerStats[0].player_hero as HeroName;
  const playerStat = playerStats[0];
  const role = heroRoleMapping[hero];

  return (
    <main>
      <h1 className="scroll-m-20 pb-2 pl-2 text-3xl font-semibold tracking-tight first:mt-0">
        All Heroes
      </h1>
      <div className="flex flex-1">
        <div className="w-1/2 p-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <Image
                src={`/heroes/all-heroes.png`}
                alt={`An image of ${hero}'s Overwatch hero portrait.`}
                width={256}
                height={256}
                className="p-2 rounded-2xl"
              />
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Time Played
                </CardTitle>
                <CardIcon>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </CardIcon>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {round(
                    playerStats.reduce(
                      (acc, stat) => acc + stat.hero_time_played,
                      0
                    ) / 60
                  )}{" "}
                  minutes
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Eliminations
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
                  {playerStats.reduce(
                    (acc, stat) => acc + stat.eliminations,
                    0
                  )}{" "}
                  Eliminations
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  {(playerStats.reduce(
                    (acc, stat) => acc + stat.eliminations,
                    0
                  ) /
                    toMins(
                      playerStats.reduce(
                        (acc, stat) => acc + stat.hero_time_played,
                        0
                      )
                    )) *
                    10}{" "}
                  eliminations per 10 minutes
                </div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deaths</CardTitle>
                <CardIcon>
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <path d="M8 20v2h8v-2" />
                  <path d="m12.5 17-.5-1-.5 1h1z" />
                  <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
                </CardIcon>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {playerStats.reduce((acc, stat) => acc + stat.deaths, 0)}{" "}
                  Deaths
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  {(playerStats.reduce((acc, stat) => acc + stat.deaths, 0) /
                    toMins(
                      playerStats.reduce(
                        (acc, stat) => acc + stat.hero_time_played,
                        0
                      )
                    )) *
                    10}{" "}
                  deaths per 10 minutes
                </div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ultimates Used
                </CardTitle>
                <CardIcon>
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </CardIcon>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {playerStats.reduce(
                    (acc, stat) => acc + stat.ultimates_used,
                    0
                  )}{" "}
                  Ultimates Used
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  {(playerStats.reduce(
                    (acc, stat) => acc + stat.ultimates_used,
                    0
                  ) /
                    toMins(
                      playerStats.reduce(
                        (acc, stat) => acc + stat.hero_time_played,
                        0
                      )
                    )) *
                    10}{" "}
                  ultimates used per 10 minutes
                </div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Hero Damage Dealt
                </CardTitle>
                <CardIcon>
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </CardIcon>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {playerStats.reduce(
                    (acc, stat) => acc + stat.hero_damage_dealt,
                    0
                  )}{" "}
                  Hero Damage Dealt
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  {round(
                    (playerStats.reduce(
                      (acc, stat) => acc + stat.hero_damage_dealt,
                      0
                    ) /
                      toMins(
                        playerStats.reduce(
                          (acc, stat) => acc + stat.hero_time_played,
                          0
                        )
                      )) *
                      10
                  )}{" "}
                  hero damage dealt per 10 minutes
                </div>
              </CardFooter>
            </Card>
            {role === "Tank" && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Damage Blocked
                    </CardTitle>
                    <CardIcon>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    </CardIcon>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {playerStats.reduce(
                        (acc, stat) => acc + stat.damage_blocked,
                        0
                      )}{" "}
                      Damage Blocked
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {round(
                        (playerStats.reduce(
                          (acc, stat) => acc + stat.damage_blocked,
                          0
                        ) /
                          toMins(
                            playerStats.reduce(
                              (acc, stat) => acc + stat.hero_time_played,
                              0
                            )
                          )) *
                          10
                      )}{" "}
                      damage blocked per 10 minutes
                    </div>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Damage Taken
                    </CardTitle>
                    <CardIcon>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                      <path d="m14.5 9-5 5" />
                      <path d="m9.5 9 5 5" />
                    </CardIcon>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {playerStats.reduce(
                        (acc, stat) => acc + stat.damage_taken,
                        0
                      )}{" "}
                      Damage Taken
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {round(
                        (playerStats.reduce(
                          (acc, stat) => acc + stat.damage_taken,
                          0
                        ) /
                          toMins(
                            playerStats.reduce(
                              (acc, stat) => acc + stat.hero_time_played,
                              0
                            )
                          )) *
                          10
                      )}{" "}
                      damage taken per 10 minutes
                    </div>
                  </CardFooter>
                </Card>
              </>
            )}
            {role === "Damage" && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Final Blows
                    </CardTitle>
                    <CardIcon>
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                    </CardIcon>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {playerStats.reduce(
                        (acc, stat) => acc + stat.final_blows,
                        0
                      )}{" "}
                      Final Blows
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {(playerStats.reduce(
                        (acc, stat) => acc + stat.final_blows,
                        0
                      ) /
                        toMins(
                          playerStats.reduce(
                            (acc, stat) => acc + stat.hero_time_played,
                            0
                          )
                        )) *
                        10}{" "}
                      final blows per 10 minutes
                    </div>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Solo Kills
                    </CardTitle>
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
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {playerStats.reduce(
                        (acc, stat) => acc + stat.solo_kills,
                        0
                      )}{" "}
                      Solo Kills
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {(playerStats.reduce(
                        (acc, stat) => acc + stat.solo_kills,
                        0
                      ) /
                        toMins(
                          playerStats.reduce(
                            (acc, stat) => acc + stat.hero_time_played,
                            0
                          )
                        )) *
                        10}{" "}
                      solo kills per 10 minutes
                    </div>
                  </CardFooter>
                </Card>
              </>
            )}
            {role === "Support" && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Healing Dealt
                    </CardTitle>
                    <CardIcon>
                      <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
                    </CardIcon>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {round(
                        playerStats.reduce(
                          (acc, stat) => acc + stat.healing_dealt,
                          0
                        )
                      )}{" "}
                      Healing Dealt
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {round(
                        (playerStats.reduce(
                          (acc, stat) => acc + stat.healing_dealt,
                          0
                        ) /
                          toMins(
                            playerStats.reduce(
                              (acc, stat) => acc + stat.healing_dealt,
                              0
                            )
                          )) *
                          10
                      )}{" "}
                      healing dealt per 10 minutes
                    </div>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Healing Received
                    </CardTitle>
                    <CardIcon>
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </CardIcon>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {playerStats.reduce(
                        (acc, stat) => acc + stat.healing_received,
                        0
                      )}{" "}
                      Healing Received
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      {round(
                        (playerStats.reduce(
                          (acc, stat) => acc + stat.healing_received,
                          0
                        ) /
                          toMins(
                            playerStats.reduce(
                              (acc, stat) => acc + stat.healing_received,
                              0
                            )
                          )) *
                          10
                      )}{" "}
                      healing received per 10 minutes
                    </div>
                  </CardFooter>
                </Card>
              </>
            )}
          </div>
        </div>
        <div className="w-1/2 p-2">
          <StatsTable data={playerStats[0]} />
        </div>
      </div>
    </main>
  );
}
