"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, toHero, toTimestamp } from "@/lib/utils";
import { Kill } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import Image from "next/image";
import { usePathname } from "next/navigation";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

export function KillfeedTable({
  fights,
  team1,
  team2,
}: {
  fights: Fight[];
  team1: string;
  team2: string;
}) {
  const pathname = usePathname();
  const teamId = pathname.split("/")[1];

  const environmentalString =
    teamId === "1" ? "Limit Testing" : "Environmental";

  return (
    <>
      {fights.map((fight, i) => (
        <div key={fight.start}>
          {fight.kills.length > 0 && (
            <Table key={fight.start}>
              <TableCaption>Fight {i + 1}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Time</TableHead>
                  <TableHead className="w-80">Kill</TableHead>
                  <TableHead className="w-20">Method</TableHead>
                  <TableHead className="w-20">Start</TableHead>
                  <TableHead className="w-20">End</TableHead>
                  <TableHead className="w-20">Fight Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fight.kills.map((kill, j) => (
                  <TableRow key={kill.id}>
                    <TableCell className={GeistMono.className}>
                      {kill.match_time.toFixed(2)}{" "}
                      <span className="text-sm text-muted-foreground">
                        ({toTimestamp(kill.match_time)})
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center space-x-2">
                        <div className="pr-2">
                          <Image
                            src={`/heroes/${toHero(kill.attacker_hero)}.png`}
                            alt=""
                            width={256}
                            height={256}
                            className={cn(
                              "h-8 w-8 rounded border-2",
                              kill.attacker_team === team1
                                ? "border-blue-500"
                                : "border-red-500",
                              kill.attacker_name === kill.victim_name
                                ? "opacity-0"
                                : ""
                            )}
                          />
                        </div>
                        <div
                          className={cn(
                            "w-32",
                            kill.attacker_name === kill.victim_name
                              ? "opacity-0"
                              : ""
                          )}
                        >
                          {kill.attacker_name}
                        </div>
                        <div className="pr-16">&rarr;</div>
                        <div className="pr-2">
                          <Image
                            src={`/heroes/${toHero(kill.victim_hero)}.png`}
                            alt=""
                            width={256}
                            height={256}
                            className={cn(
                              "h-8 w-8 rounded border-2",
                              kill.victim_team === team1
                                ? "border-blue-500"
                                : "border-red-500"
                            )}
                          />
                        </div>
                        <div className="w-32">{kill.victim_name}</div>
                      </span>
                    </TableCell>
                    <TableCell>
                      {kill.attacker_name === kill.victim_name
                        ? kill.is_environmental
                          ? environmentalString
                          : kill.event_ability === "0"
                            ? "Primary Fire"
                            : kill.event_ability
                        : kill.event_ability === "0"
                          ? "Primary Fire"
                          : kill.event_ability}
                    </TableCell>
                    {j === 0 ? (
                      <>
                        <TableCell>{toTimestamp(fight.start)}</TableCell>
                        <TableCell>{toTimestamp(fight.end)}</TableCell>
                        <TableCell>
                          {fight.kills.filter(
                            (kill) => kill.attacker_team === team1
                          ).length >
                          fight.kills.length / 2
                            ? team1
                            : team2}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ))}
    </>
  );
}
