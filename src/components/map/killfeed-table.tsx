"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, toHero, toKebabCase, toTimestamp } from "@/lib/utils";
import type { Kill } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import { useTranslations } from "next-intl";
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
  team1Color,
  team2Color,
}: {
  fights: Fight[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
}) {
  const pathname = usePathname();
  const teamId = pathname.split("/")[1];
  const t = useTranslations("mapPage.killfeedTable");

  const environmentalString =
    teamId === "1" ? t("limitTest") : t("environment");

  return (
    <>
      {fights.map((fight, i) => (
        <div key={fight.start}>
          {fight.kills.length > 0 && (
            <Table key={fight.start}>
              <TableCaption>{t("fight", { num: i + 1 })}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{t("time")}</TableHead>
                  <TableHead className="w-80">{t("kill")}</TableHead>
                  <TableHead className="w-20">{t("method")}</TableHead>
                  <TableHead className="w-20">{t("start")}</TableHead>
                  <TableHead className="w-20">{t("end")}</TableHead>
                  <TableHead className="w-20">{t("fightWinner")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fight.kills.map((kill, j) => (
                  <TableRow key={kill.id}>
                    <TableCell className={GeistMono.className}>
                      {kill.match_time.toFixed(2)}{" "}
                      <span className="text-muted-foreground text-sm">
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
                            className="h-8 w-8 rounded border-2"
                            style={{
                              border:
                                kill.attacker_team === team1
                                  ? `2px solid ${team1Color}`
                                  : `2px solid ${team2Color}`,
                              opacity:
                                kill.attacker_name === kill.victim_name ? 0 : 1,
                            }}
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
                            className="h-8 w-8 rounded border-2"
                            style={{
                              border:
                                kill.victim_team === team1
                                  ? `2px solid ${team1Color}`
                                  : `2px solid ${team2Color}`,
                              opacity:
                                kill.attacker_name === kill.victim_name ? 0 : 1,
                            }}
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
                            ? t("abilities.primary-fire")
                            : t(`abilities.${toKebabCase(kill.event_ability)}`)
                        : kill.event_ability === "0"
                          ? t("abilities.primary-fire")
                          : t(`abilities.${toKebabCase(kill.event_ability)}`)}
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
