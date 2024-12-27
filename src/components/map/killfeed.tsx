import { KillfeedExport } from "@/components/map/killfeed-export";
import { KillfeedTable } from "@/components/map/killfeed-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { groupKillsIntoFights, toTimestamp } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export async function Killfeed({ id }: { id: number }) {
  const [finalRound, playerTeams, fights] = await Promise.all([
    prisma.roundEnd.findFirst({
      where: { MapDataId: id },
      orderBy: { round_number: "desc" },
    }),
    prisma.matchStart.findFirst({ where: { MapDataId: id } }),
    groupKillsIntoFights(id),
  ]);

  const t = await getTranslations("mapPage.killfeed");

  const team1Name = playerTeams?.team_1_name;
  const team2Name = playerTeams?.team_2_name;

  let team1Kills = 0;
  let team2Kills = 0;

  let team1FightWins = 0;
  let team2FightWins = 0;

  fights.forEach((fight) => {
    fight.kills.forEach((kill) => {
      if (kill.attacker_team === team1Name) {
        team1Kills++;
      } else {
        team2Kills++;
      }
    });

    if (
      fight.kills.filter((kill) => kill.attacker_team === team1Name).length >
      fight.kills.length / 2
    ) {
      team1FightWins++;
    } else {
      team2FightWins++;
    }
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("matchTime")}
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toTimestamp(finalRound?.match_time ?? 0)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {((finalRound?.match_time ?? 0) / 60).toFixed(2)} minutes
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("kills")}</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="22" x2="18" y1="12" y2="12" />
              <line x1="6" x2="2" y1="12" y2="12" />
              <line x1="12" x2="12" y1="6" y2="2" />
              <line x1="12" x2="12" y1="22" y2="18" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{team1Kills}</span> /{" "}
              <span className="text-red-500">{team2Kills}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Name} / {team2Name}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("deaths")}</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="9" cy="12" r="1" />
              <circle cx="15" cy="12" r="1" />
              <path d="M8 20v2h8v-2" />
              <path d="m12.5 17-.5-1-.5 1h1z" />
              <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{team2Kills}</span> /{" "}
              <span className="text-red-500">{team1Kills}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Name} / {team2Name}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("fightWins")}
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{team1FightWins}</span> /{" "}
              <span className="text-red-500">{team2FightWins}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Name} / {team2Name}
            </p>
          </CardFooter>
        </Card>
      </div>
      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <KillfeedTable
              fights={fights}
              team1={team1Name ?? "Team 1"}
              team2={team2Name ?? "Team 2"}
            />
          </CardContent>
          <CardFooter className="float-right">
            <KillfeedExport fights={fights} />
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
