import { Searchbar } from "@/components/stats/searchbar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import {
  cn,
  format,
  round,
  toTimestampWithDays,
  toTimestampWithHours,
} from "@/lib/utils";

export default async function StatsPage() {
  const userNum = await prisma.user.count();
  const scrimNum = await prisma.scrim.count();
  const killNum = await prisma.kill.count();
  const statNum = await prisma.playerStat.count();
  const mapNum = await prisma.mapData.count();

  const topAttackerStats = await prisma.kill.groupBy({
    by: ["attacker_name"],
    _count: {
      attacker_name: true,
    },
    orderBy: {
      _count: {
        attacker_name: "desc",
      },
    },
    take: 3,
  });

  const highestPlayerDeaths = await prisma.kill.groupBy({
    by: ["victim_name"],
    _count: {
      victim_name: true,
    },
    orderBy: {
      _count: {
        victim_name: "desc",
      },
    },
    take: 3,
  });

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

  const topDamageStats = await prisma.playerStat.groupBy({
    by: ["player_name"],
    _sum: {
      hero_damage_dealt: true,
    },
    orderBy: {
      _sum: {
        hero_damage_dealt: "desc",
      },
    },
    take: 3,
  });

  const topHealerStats = await prisma.playerStat.groupBy({
    by: ["player_name"],
    _sum: {
      healing_dealt: true,
    },
    orderBy: {
      _sum: {
        healing_dealt: "desc",
      },
    },
    take: 3,
  });

  const damageBlockedStats = await prisma.playerStat.groupBy({
    by: ["player_name"],
    _sum: {
      damage_blocked: true,
    },
    orderBy: {
      _sum: {
        damage_blocked: "desc",
      },
    },
    take: 3,
  });

  const heroTimePlayedStats = await prisma.playerStat.groupBy({
    by: ["player_name"],
    _sum: {
      hero_time_played: true,
    },
    orderBy: {
      _sum: {
        hero_time_played: "desc",
      },
    },
    take: 3,
  });

  const kills = await prisma.kill.findMany({
    where: {
      victim_hero: "Lúcio",
    },
  });

  const ultimateEnds = await prisma.ultimateEnd.findMany({
    where: {
      player_hero: "Lúcio",
    },
  });

  const ajaxes = kills.filter((kill) =>
    ultimateEnds.some(
      (end) =>
        end.match_time === kill.match_time &&
        end.player_name === kill.victim_name
    )
  );

  // get the top 3 most common ajaxers
  const ajaxers = ajaxes.reduce(
    (acc, kill) => {
      if (!acc[kill.victim_name]) {
        acc[kill.victim_name] = 1;
      } else {
        acc[kill.victim_name]++;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const topAjaxers = Object.entries(ajaxers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stats</h2>
      </div>

      <Searchbar />

      <div className="flex items-center justify-between space-y-2">
        <h3 className="text-2xl font-bold tracking-tight">Global Stats</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <CardIcon>
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(userNum)}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Total number of users on the platform
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scrims</CardTitle>
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
            <div className="text-2xl font-bold">{format(scrimNum)}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Total number of scrims uploaded
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kills</CardTitle>
            <CardIcon>
              <circle cx="12" cy="12" r="10" />
              <line x1="22" x2="18" y1="12" y2="12" />
              <line x1="6" x2="2" y1="12" y2="12" />
              <line x1="12" x2="12" y1="6" y2="2" />
              <line x1="12" x2="12" y1="22" y2="18" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(killNum)}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Total number of kills recorded
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Player Stats</CardTitle>
            <CardIcon>
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(statNum)}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Total number of player stats recorded
            </p>
          </CardFooter>
        </Card>
      </div>

      <div className="flex items-center justify-between space-y-2">
        <h3 className="text-2xl font-bold tracking-tight">Leaderboard</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Most Played Heroes
            </CardTitle>
            <CardIcon>
              <line x1="10" x2="14" y1="2" y2="2" />
              <line x1="12" x2="15" y1="14" y2="11" />
              <circle cx="12" cy="14" r="8" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Hero</TableHead>
                  <TableHead>Time Played</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mostPlayedHeroes.map((row, idx) => (
                  <TableRow key={row.player_hero}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.player_hero}</TableCell>
                    <TableCell>
                      {toTimestampWithDays(row.total_time_played)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from all {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players by Kills
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Kills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAttackerStats.map((row, idx) => (
                  <TableRow key={row.attacker_name}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.attacker_name}</TableCell>
                    <TableCell>{format(row._count.attacker_name)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from all {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players by Hero Damage
            </CardTitle>
            <CardIcon>
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Hero Damage Dealt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDamageStats.map((row, idx) => (
                  <TableRow key={row.player_name}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.player_name}</TableCell>
                    <TableCell>
                      {format(round(row._sum.hero_damage_dealt!))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players by Healing
            </CardTitle>
            <CardIcon>
              <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Healing Dealt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHealerStats.map((row, idx) => (
                  <TableRow key={row.player_name}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.player_name}</TableCell>
                    <TableCell>
                      {" "}
                      {format(round(row._sum.healing_dealt!))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players by Damage Blocked
            </CardTitle>
            <CardIcon>
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Damage Blocked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {damageBlockedStats.map((row, idx) => (
                  <TableRow key={row.player_name}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.player_name}</TableCell>
                    <TableCell>
                      {" "}
                      {format(round(row._sum.damage_blocked!))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players by Deaths
            </CardTitle>
            <CardIcon>
              <circle cx="9" cy="12" r="1" />
              <circle cx="15" cy="12" r="1" />
              <path d="M8 20v2h8v-2" />
              <path d="m12.5 17-.5-1-.5 1h1z" />
              <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Deaths</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highestPlayerDeaths.map((row, idx) => (
                  <TableRow key={row.victim_name}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.victim_name}</TableCell>
                    <TableCell>
                      {" "}
                      {format(round(row._count.victim_name!))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players by Time Played
            </CardTitle>
            <CardIcon>
              <path d="M5 22h14" />
              <path d="M5 2h14" />
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Time Played</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heroTimePlayedStats.map((row, idx) => (
                  <TableRow key={row.player_name}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row.player_name}</TableCell>
                    <TableCell>
                      {toTimestampWithHours(row._sum.hero_time_played!)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top 3 Players with the Most Ajaxes
            </CardTitle>
            <CardIcon>
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Ajaxes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAjaxers.map((row, idx) => (
                  <TableRow key={row[0]}>
                    <TableCell>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className={cn(
                          "h-4 w-4",
                          idx === 0
                            ? "text-amber-400"
                            : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                                ? "text-amber-900"
                                : "text-muted-foreground"
                        )}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </TableCell>
                    <TableCell>{row[0]}</TableCell>
                    <TableCell>{row[1]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Results accumulated from {mapNum} maps.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
