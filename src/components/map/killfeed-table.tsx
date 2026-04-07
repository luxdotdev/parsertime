"use client";

import {
  FightSeparator,
  FightTimeline,
  RoundEndSeparator,
} from "@/components/map/fight-timeline";
import { KillPositionCard } from "@/components/positional/kill-position-card";
import { useKillCalibration } from "@/components/positional/use-kill-calibration";
import { getGutterWidth } from "@/components/map/ult-gutter";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SerializedCalibrationData } from "@/data/killfeed-calibration-dto";
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
import { useGoToReplay } from "@/components/map/map-tabs";
import { cn, toHero, toKebabCase, toTimestamp } from "@/lib/utils";
import type { Kill, RoundEnd } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ImportToCanvasLink } from "@/components/map/import-to-canvas-link";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

type KillfeedTableProps = {
  fights: Fight[];
  roundEnds?: RoundEnd[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
  fightUltSpans?: UltimateSpan[][];
  options?: KillfeedDisplayOptions;
  calibrationData?: SerializedCalibrationData;
  canvasImportEnabled?: boolean;
  mapDataId?: number;
};

export function KillfeedTable({
  fights,
  roundEnds = [],
  team1,
  team2,
  team1Color,
  team2Color,
  fightUltSpans,
  options,
  calibrationData,
  canvasImportEnabled,
  mapDataId,
}: KillfeedTableProps) {
  const pathname = usePathname();
  const teamId = pathname.split("/")[1];
  const t = useTranslations("mapPage.killfeedTable");
  const tUlt = useTranslations("mapPage.killfeedUlt");

  const environmentalString =
    teamId === "1" ? t("limitTest") : t("environment");

  const anyUltFeature = options ? hasAnyUltFeature(options) : false;

  const maxGutterWidth =
    fightUltSpans && options?.showUltBrackets
      ? Math.max(0, ...fightUltSpans.map((spans) => getGutterWidth(spans)))
      : 0;

  return (
    <>
      {fights.map((fight, i) => {
        const spans = fightUltSpans?.[i] ?? [];
        const showTimeline = !!options?.showTimeline;

        const events: KillfeedEvent[] =
          anyUltFeature && options
            ? mergeKillfeedEvents(fight.kills, spans, options)
            : fight.kills.map((k) => ({ type: "kill" as const, data: k }));

        if (fight.kills.length === 0) return null;

        if (showTimeline) {
          const timelineSpans = options.showUltBrackets ? spans : [];
          const timelineEvents = options.showUltBrackets
            ? mergeKillfeedEvents(fight.kills, spans, {
                ...options,
                showUltStartEvents: true,
                showUltEndEvents: true,
              })
            : fight.kills.map((k) => ({
                type: "kill" as const,
                data: k,
              }));

          const prevFight = i > 0 ? fights[i - 1] : null;
          const gapSeconds = prevFight ? fight.start - prevFight.end : 0;

          const gapStart = prevFight?.end ?? 0;
          const gapEnd = fight.start;
          const betweenRoundEnds = roundEnds.filter(
            (re) => re.match_time > gapStart && re.match_time < gapEnd
          );

          const inFightRoundEnds = roundEnds.filter(
            (re) => re.match_time >= fight.start && re.match_time <= fight.end
          );

          return (
            <div key={fight.start}>
              {i > 0 && (
                <>
                  {betweenRoundEnds.map((re) => (
                    <RoundEndSeparator
                      key={`round-end-${re.id}`}
                      roundNumber={re.round_number}
                      capturingTeam={re.capturing_team}
                      teamColor={
                        re.capturing_team === team1 ? team1Color : team2Color
                      }
                      gutterWidth={maxGutterWidth}
                      t={t}
                    />
                  ))}
                  <FightSeparator
                    gapSeconds={gapSeconds}
                    gutterWidth={maxGutterWidth}
                  />
                </>
              )}
              <FightTimeline
                fight={fight}
                fightIndex={i}
                spans={timelineSpans}
                events={timelineEvents}
                roundEnds={inFightRoundEnds}
                team1={team1}
                team2={team2}
                team1Color={team1Color}
                team2Color={team2Color}
                environmentalString={environmentalString}
                options={options}
                gutterWidth={maxGutterWidth}
                t={t}
                tUlt={tUlt}
                calibrationData={calibrationData}
              />
            </div>
          );
        }

        return (
          <StandardFight
            key={fight.start}
            fight={fight}
            fightIndex={i}
            events={events}
            spans={spans}
            team1={team1}
            team2={team2}
            team1Color={team1Color}
            team2Color={team2Color}
            environmentalString={environmentalString}
            options={options}
            t={t}
            tUlt={tUlt}
            calibrationData={calibrationData}
            canvasImportEnabled={canvasImportEnabled}
            mapDataId={mapDataId}
          />
        );
      })}
      {options?.showTimeline &&
        fights.length > 0 &&
        roundEnds
          .filter((re) => re.match_time > fights[fights.length - 1].end)
          .map((re) => (
            <RoundEndSeparator
              key={`round-end-trailing-${re.id}`}
              roundNumber={re.round_number}
              capturingTeam={re.capturing_team}
              teamColor={re.capturing_team === team1 ? team1Color : team2Color}
              gutterWidth={maxGutterWidth}
              t={t}
            />
          ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Standard table mode (brackets off) — unchanged from original
// ---------------------------------------------------------------------------

function StandardFight({
  fight,
  fightIndex,
  events,
  spans,
  team1,
  team2,
  team1Color,
  team2Color,
  environmentalString,
  options,
  t,
  tUlt,
  calibrationData,
  canvasImportEnabled,
  mapDataId,
}: {
  fight: Fight;
  fightIndex: number;
  events: KillfeedEvent[];
  spans: UltimateSpan[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
  environmentalString: string;
  options?: KillfeedDisplayOptions;
  t: ReturnType<typeof useTranslations>;
  tUlt: ReturnType<typeof useTranslations>;
  calibrationData?: SerializedCalibrationData;
  canvasImportEnabled?: boolean;
  mapDataId?: number;
}) {
  return (
    <Table>
      <TableCaption>
        <span className="flex items-center justify-center gap-4">
          <span>{t("fight", { num: fightIndex + 1 })}</span>
          {canvasImportEnabled && mapDataId != null && calibrationData && (
            <ImportToCanvasLink
              fight={fight}
              calibrationData={calibrationData}
              mapDataId={mapDataId}
              team1={team1}
              t={t}
            />
          )}
        </span>
      </TableCaption>
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
              calibrationData={calibrationData}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Standard table row components
// ---------------------------------------------------------------------------

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
  calibrationData,
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
  calibrationData?: SerializedCalibrationData;
}) {
  const goToReplay = useGoToReplay();
  const ultHighlightColor = activeUlt
    ? activeUlt.playerTeam === team1
      ? team1Color
      : team2Color
    : undefined;

  const calibration = useKillCalibration(
    kill.match_time,
    calibrationData ?? null
  );
  const hasCoords =
    calibration && kill.attacker_x != null && kill.victim_x != null;

  const abilityName =
    kill.attacker_name === kill.victim_name
      ? kill.is_environmental
        ? environmentalString
        : kill.event_ability === "0"
          ? t("abilities.primary-fire")
          : t(`abilities.${toKebabCase(kill.event_ability)}`)
      : kill.event_ability === "0"
        ? t("abilities.primary-fire")
        : t(`abilities.${toKebabCase(kill.event_ability)}`);

  const killContent = (
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
  );

  return (
    <TableRow
      style={
        ultHighlightColor
          ? { borderLeft: `2px solid ${ultHighlightColor}` }
          : undefined
      }
    >
      <TableCell className={GeistMono.className}>
        {calibrationData ? (
          <button
            type="button"
            className="hover:text-foreground text-muted-foreground cursor-pointer underline-offset-2 hover:underline"
            title="View in Replay"
            onClick={() => goToReplay(kill.match_time)}
          >
            {kill.match_time.toFixed(2)}{" "}
            <span className="text-sm">({toTimestamp(kill.match_time)})</span>
          </button>
        ) : (
          <>
            {kill.match_time.toFixed(2)}{" "}
            <span className="text-muted-foreground text-sm">
              ({toTimestamp(kill.match_time)})
            </span>
          </>
        )}
      </TableCell>
      <TableCell>
        {hasCoords ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="-my-2 cursor-pointer py-2 text-left"
              >
                {killContent}
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="right" align="start" className="w-auto p-0">
              <KillPositionCard
                kill={kill}
                fightKills={fight.kills}
                calibration={calibration}
                team1={team1}
                team1Color={team1Color}
                team2Color={team2Color}
                abilityName={abilityName}
              />
            </HoverCardContent>
          </HoverCard>
        ) : (
          killContent
        )}
      </TableCell>
      <TableCell>{abilityName}</TableCell>
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
              border: `1px solid ${isDeath ? "var(--destructive)" : color}`,
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
              border: `1px solid ${isDeath ? "var(--destructive)" : color}`,
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
