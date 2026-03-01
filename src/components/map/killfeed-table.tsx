"use client";

import { UltBracketGutter } from "@/components/map/ult-gutter";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  KillfeedDisplayOptions,
  KillfeedEvent,
  UltimateSpan,
} from "@/data/killfeed-dto";
import {
  hasAnyUltFeature,
  isKillDuringUlt,
  mergeKillfeedEvents,
} from "@/data/killfeed-dto";
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

type KillfeedTableProps = {
  fights: Fight[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
  fightUltSpans?: UltimateSpan[][];
  options?: KillfeedDisplayOptions;
};

export function KillfeedTable({
  fights,
  team1,
  team2,
  team1Color,
  team2Color,
  fightUltSpans,
  options,
}: KillfeedTableProps) {
  const pathname = usePathname();
  const teamId = pathname.split("/")[1];
  const t = useTranslations("mapPage.killfeedTable");
  const tUlt = useTranslations("mapPage.killfeedUlt");

  const environmentalString =
    teamId === "1" ? t("limitTest") : t("environment");

  const anyUltFeature = options ? hasAnyUltFeature(options) : false;

  return (
    <>
      {fights.map((fight, i) => {
        const spans = fightUltSpans?.[i] ?? [];
        const showBrackets = options?.showUltBrackets && spans.length > 0;

        const events: KillfeedEvent[] =
          anyUltFeature && options
            ? mergeKillfeedEvents(fight.kills, spans, options)
            : fight.kills.map((k) => ({ type: "kill" as const, data: k }));

        if (fight.kills.length === 0) return null;

        return (
          <div key={fight.start} className="flex items-stretch">
            {showBrackets && (
              <UltBracketGutter
                spans={spans}
                fightStart={fight.start}
                fightEnd={fight.end}
                team1={team1}
                team1Color={team1Color}
                team2Color={team2Color}
                showLabels={options?.showUltLabels ?? false}
              />
            )}
            <div className="min-w-0 flex-1 pl-4">
              <Table>
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
                  {events.map((event) => {
                    if (event.type === "ult_start") {
                      return (
                        <UltStartRow
                          key={`ult-start-${event.data.id}`}
                          span={event.data}
                          team1={team1}
                          team1Color={team1Color}
                          team2Color={team2Color}
                          t={tUlt}
                        />
                      );
                    }

                    if (event.type === "ult_end") {
                      return (
                        <UltEndRow
                          key={`ult-end-${event.data.id}`}
                          span={event.data}
                          team1={team1}
                          team1Color={team1Color}
                          team2Color={team2Color}
                          t={tUlt}
                        />
                      );
                    }

                    if (event.type === "ult_instant") {
                      return (
                        <UltInstantRow
                          key={`ult-instant-${event.data.id}`}
                          span={event.data}
                          team1={team1}
                          team1Color={team1Color}
                          team2Color={team2Color}
                          t={tUlt}
                        />
                      );
                    }

                    const kill = event.data;
                    const killIndex = fight.kills.indexOf(kill);
                    const isFirstKill = killIndex === 0;
                    const activeUlt = options?.showUltKillHighlights
                      ? isKillDuringUlt(kill, spans)
                      : null;

                    return (
                      <KillRow
                        key={kill.id}
                        kill={kill}
                        fight={fight}
                        isFirstKill={isFirstKill}
                        team1={team1}
                        team2={team2}
                        team1Color={team1Color}
                        team2Color={team2Color}
                        environmentalString={environmentalString}
                        activeUlt={activeUlt}
                        t={t}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </>
  );
}

function KillRow({
  kill,
  fight,
  isFirstKill,
  team1,
  team2,
  team1Color,
  team2Color,
  environmentalString,
  activeUlt,
  t,
}: {
  kill: Kill;
  fight: Fight;
  isFirstKill: boolean;
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
  environmentalString: string;
  activeUlt: UltimateSpan | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const ultHighlightColor = activeUlt
    ? activeUlt.playerTeam === team1
      ? team1Color
      : team2Color
    : undefined;

  return (
    <TableRow
      style={
        ultHighlightColor
          ? { borderLeft: `2px solid ${ultHighlightColor}` }
          : undefined
      }
    >
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
                opacity: kill.attacker_name === kill.victim_name ? 0 : 1,
              }}
            />
          </div>
          <div
            className={cn(
              "w-32",
              kill.attacker_name === kill.victim_name ? "opacity-0" : ""
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
                opacity: kill.attacker_name === kill.victim_name ? 0 : 1,
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
      {isFirstKill ? (
        <>
          <TableCell>{toTimestamp(fight.start)}</TableCell>
          <TableCell>{toTimestamp(fight.end)}</TableCell>
          <TableCell>
            {fight.kills.filter((k) => k.attacker_team === team1).length >
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
  );
}

function UltStartRow({
  span,
  team1,
  team1Color,
  team2Color,
  t,
}: {
  span: UltimateSpan;
  team1: string;
  team1Color: string;
  team2Color: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const color = span.playerTeam === team1 ? team1Color : team2Color;

  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell
        className={cn(
          GeistMono.className,
          "text-muted-foreground py-3 text-xs"
        )}
      >
        {span.startTime.toFixed(2)}
      </TableCell>
      <TableCell colSpan={5} className="py-3">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Image
            src={`/heroes/${toHero(span.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded"
            style={{ border: `1px solid ${color}` }}
          />
          <span style={{ color }}>
            {t("ultStarted", { player: span.playerName })}
          </span>
        </span>
      </TableCell>
    </TableRow>
  );
}

function UltEndRow({
  span,
  team1,
  team1Color,
  team2Color,
  t,
}: {
  span: UltimateSpan;
  team1: string;
  team1Color: string;
  team2Color: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const color = span.playerTeam === team1 ? team1Color : team2Color;
  const isDeath = span.diedDuringUlt;

  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell
        className={cn(
          GeistMono.className,
          "text-muted-foreground py-3 text-xs"
        )}
      >
        {span.endTime.toFixed(2)}
      </TableCell>
      <TableCell colSpan={5} className="py-3">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isDeath ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <Image
            src={`/heroes/${toHero(span.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded"
            style={{
              border: `1px solid ${isDeath ? "hsl(var(--destructive))" : color}`,
            }}
          />
          <span style={isDeath ? undefined : { color }}>
            {isDeath
              ? t("ultEndedDeath", {
                  player: span.playerName,
                  duration: span.duration.toFixed(1),
                })
              : t("ultEnded", {
                  player: span.playerName,
                  duration: span.duration.toFixed(1),
                })}
          </span>
        </span>
      </TableCell>
    </TableRow>
  );
}

function UltInstantRow({
  span,
  team1,
  team1Color,
  team2Color,
  t,
}: {
  span: UltimateSpan;
  team1: string;
  team1Color: string;
  team2Color: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const color = span.playerTeam === team1 ? team1Color : team2Color;
  const isDeath = span.diedDuringUlt;

  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell
        className={cn(
          GeistMono.className,
          "text-muted-foreground py-3 text-xs"
        )}
      >
        {span.startTime.toFixed(2)}
      </TableCell>
      <TableCell colSpan={5} className="py-3">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isDeath ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <Image
            src={`/heroes/${toHero(span.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded"
            style={{
              border: `1px solid ${isDeath ? "hsl(var(--destructive))" : color}`,
            }}
          />
          <span style={isDeath ? undefined : { color }}>
            {isDeath
              ? t("ultEndedDeath", {
                  player: span.playerName,
                  duration: span.duration.toFixed(1),
                })
              : t("ultInstant", {
                  player: span.playerName,
                  duration: span.duration.toFixed(1),
                })}
          </span>
        </span>
      </TableCell>
    </TableRow>
  );
}
