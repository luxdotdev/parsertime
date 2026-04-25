"use client";

import { UltBracketGutter } from "@/components/map/ult-gutter";
import { KillPositionCard } from "@/components/positional/kill-position-card";
import { useKillCalibration } from "@/components/positional/use-kill-calibration";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getEventTime,
  isKillDuringUlt,
  type KillfeedDisplayOptions,
  type KillfeedEvent,
  type SerializedCalibrationData,
  type UltimateSpan,
} from "@/data/map/killfeed/types";
import { ImportToCanvasLink } from "@/components/map/import-to-canvas-link";
import { useGoToReplay } from "@/components/map/map-tabs";
import { cn, toHero, toKebabCase, toTimestamp } from "@/lib/utils";
import type { Kill, RoundEnd } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import type { useTranslations } from "next-intl";
import Image from "next/image";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

const PIXELS_PER_SECOND = 30;
const ROW_HEIGHT = 48;
const TOP_PAD = 12;
const BOTTOM_PAD = 12;
const MIN_FIGHT_HEIGHT = 120;
const AXIS_WIDTH = 100;
const LEFT_LABEL_WIDTH = 100;
const DIAMOND_SIZE = 6;
const DIAMOND_SIZE_LARGE = 8;

function computeEventPixels(
  events: KillfeedEvent[],
  fightStartPx: number,
  fightStartTime: number
): number[] {
  const positions: number[] = [];
  let prevTop = fightStartPx;
  let prevTime = fightStartTime;

  for (const event of events) {
    const time = getEventTime(event);
    const timeDelta = time - prevTime;
    const gap = Math.max(ROW_HEIGHT, timeDelta * PIXELS_PER_SECOND);
    const adjusted = prevTop + gap;
    positions.push(adjusted);
    prevTop = adjusted;
    prevTime = time;
  }

  return positions;
}

function interpolateTimeToPx(
  time: number,
  events: KillfeedEvent[],
  eventPositions: number[],
  fightStartPx: number,
  fightStartTime: number,
  fightEndPx: number,
  fightEndTime: number
): number {
  if (events.length === 0) {
    if (fightEndTime === fightStartTime) return fightStartPx;
    const fraction = (time - fightStartTime) / (fightEndTime - fightStartTime);
    return fightStartPx + fraction * (fightEndPx - fightStartPx);
  }

  const firstEventTime = getEventTime(events[0]);
  if (time <= firstEventTime) {
    if (firstEventTime === fightStartTime) return eventPositions[0];
    const fraction =
      (time - fightStartTime) / (firstEventTime - fightStartTime);
    return fightStartPx + fraction * (eventPositions[0] - fightStartPx);
  }

  for (let i = 0; i < events.length - 1; i++) {
    const t1 = getEventTime(events[i]);
    const t2 = getEventTime(events[i + 1]);
    if (time >= t1 && time <= t2) {
      if (t2 === t1) return eventPositions[i];
      const fraction = (time - t1) / (t2 - t1);
      return (
        eventPositions[i] +
        fraction * (eventPositions[i + 1] - eventPositions[i])
      );
    }
  }

  const lastEventTime = getEventTime(events[events.length - 1]);
  const lastEventPx = eventPositions[eventPositions.length - 1];
  if (fightEndTime === lastEventTime) return lastEventPx;
  const fraction = (time - lastEventTime) / (fightEndTime - lastEventTime);
  return lastEventPx + fraction * (fightEndPx - lastEventPx);
}

type FightTimelineProps = {
  fight: Fight;
  fightIndex: number;
  spans: UltimateSpan[];
  events: KillfeedEvent[];
  roundEnds: RoundEnd[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
  environmentalString: string;
  options: KillfeedDisplayOptions;
  gutterWidth: number;
  t: ReturnType<typeof useTranslations>;
  tUlt: ReturnType<typeof useTranslations>;
  calibrationData?: SerializedCalibrationData;
  canvasImportEnabled?: boolean;
  mapDataId?: number;
};

export function FightTimeline({
  fight,
  fightIndex,
  spans,
  events,
  roundEnds,
  team1,
  team2,
  team1Color,
  team2Color,
  environmentalString,
  options,
  gutterWidth,
  t,
  tUlt,
  calibrationData,
  canvasImportEnabled,
  mapDataId,
}: FightTimelineProps) {
  const timeMin = fight.start;
  const timeMax = Math.max(fight.end, ...spans.map((s) => s.endTime));

  const fightStartPx = TOP_PAD;

  const eventPositions = computeEventPixels(events, fightStartPx, fight.start);

  const lastEventPx = eventPositions[eventPositions.length - 1] ?? fightStartPx;
  const lastEventTime =
    events.length > 0 ? getEventTime(events[events.length - 1]) : fight.start;
  const MAX_END_GAP = ROW_HEIGHT * 2;
  const endGap = Math.min(
    MAX_END_GAP,
    Math.max(ROW_HEIGHT, (fight.end - lastEventTime) * PIXELS_PER_SECOND)
  );
  const fightEndPx = lastEventPx + endGap;

  const containerHeight = Math.max(MIN_FIGHT_HEIGHT, fightEndPx + BOTTOM_PAD);

  function toPercent(px: number) {
    return (px / containerHeight) * 100;
  }
  const fightStartPercent = toPercent(fightStartPx);
  const fightEndPercent = toPercent(fightEndPx);

  const spanPositions = new Map<
    number,
    { startPercent: number; endPercent: number }
  >();
  for (let idx = 0; idx < events.length; idx++) {
    const event = events[idx];
    const pct = toPercent(eventPositions[idx]);
    if (event.type === "ult_start") {
      const existing = spanPositions.get(event.data.id);
      spanPositions.set(event.data.id, {
        startPercent: pct,
        endPercent: existing?.endPercent ?? pct,
      });
    } else if (event.type === "ult_end") {
      const existing = spanPositions.get(event.data.id);
      spanPositions.set(event.data.id, {
        startPercent: existing?.startPercent ?? pct,
        endPercent: pct,
      });
    } else if (event.type === "ult_instant") {
      spanPositions.set(event.data.id, {
        startPercent: pct,
        endPercent: pct,
      });
    }
  }

  const fightWinner =
    fight.kills.filter((k) => k.attacker_team === team1).length >
    fight.kills.length / 2
      ? team1
      : team2;

  const roundEndPositions = roundEnds.map((re) => {
    const px = interpolateTimeToPx(
      re.match_time,
      events,
      eventPositions,
      fightStartPx,
      fight.start,
      fightEndPx,
      fight.end
    );
    return { roundEnd: re, percent: toPercent(px) };
  });

  return (
    <div className="isolate flex" style={{ minHeight: containerHeight }}>
      {/* Left labels column — fight start/end markers */}
      <div className="relative shrink-0" style={{ width: LEFT_LABEL_WIDTH }}>
        <div
          className="absolute right-2 flex flex-col items-end"
          style={{
            top: `${fightStartPercent}%`,
            transform: "translateY(-50%)",
          }}
        >
          <span className="text-muted-foreground text-right text-xs font-medium whitespace-nowrap">
            {t("fight", { num: fightIndex + 1 })} {t("start")}
          </span>
          {canvasImportEnabled && mapDataId != null && calibrationData && (
            <ImportToCanvasLink
              className="mt-1"
              fight={fight}
              calibrationData={calibrationData}
              mapDataId={mapDataId}
              team1={team1}
              t={t}
            />
          )}
        </div>
        <div
          className="absolute right-2 flex flex-col items-end"
          style={{ top: `${fightEndPercent}%`, transform: "translateY(-50%)" }}
        >
          <span className="text-muted-foreground text-right text-xs font-medium whitespace-nowrap">
            {t("fight", { num: fightIndex + 1 })} {t("end")}
          </span>
          <span
            className="text-right text-[10px] whitespace-nowrap"
            style={{ color: fightWinner === team1 ? team1Color : team2Color }}
          >
            {t("teamWins", { team: fightWinner })}
          </span>
        </div>
      </div>

      {/* Ult bracket gutter */}
      <div
        className="relative hidden shrink-0 md:block"
        style={{ width: gutterWidth, minWidth: gutterWidth }}
      >
        {spans.length > 0 && (
          <UltBracketGutter
            spans={spans}
            timeMin={timeMin}
            timeMax={timeMax}
            team1={team1}
            team1Color={team1Color}
            team2Color={team2Color}
            showLabels={options.showUltLabels}
            spanPositions={spanPositions}
            containerHeight={containerHeight}
            gutterWidth={gutterWidth}
          />
        )}
      </div>

      {/* Timeline axis */}
      <div
        className="relative shrink-0 overflow-visible"
        style={{ width: AXIS_WIDTH }}
      >
        <div
          className="bg-border pointer-events-none absolute left-1/2"
          style={{
            width: 1,
            top: -24,
            bottom: -24,
            transform: "translateX(-50%)",
          }}
          aria-hidden="true"
        />

        {/* Fight start diamond */}
        <TimelineDiamond
          topPercent={fightStartPercent}
          size={DIAMOND_SIZE_LARGE}
          color="var(--foreground)"
          label={`${t("fight", { num: fightIndex + 1 })} starts at ${toTimestamp(fight.start)}`}
          timestamp={toTimestamp(fight.start)}
          tooltipContent={
            <FightStartTooltip
              fightNum={fightIndex + 1}
              timestamp={toTimestamp(fight.start)}
              totalKills={fight.kills.length}
              duration={fight.end - fight.start}
              tUlt={tUlt}
            />
          }
        />

        {/* Event diamonds */}
        {events.map((event, idx) => {
          const topPercent = toPercent(eventPositions[idx]);
          const time = getEventTime(event);
          let color: string;
          let label: string;
          let tooltip: React.ReactNode;

          if (event.type === "kill") {
            const kill = event.data;
            color = kill.attacker_team === team1 ? team1Color : team2Color;
            label = `Kill at ${toTimestamp(time)}: ${kill.attacker_name} eliminated ${kill.victim_name}`;
            tooltip = (
              <KillTooltip
                kill={kill}
                environmentalString={environmentalString}
                tUlt={tUlt}
                t={t}
              />
            );
          } else {
            const span = event.data;
            color = span.playerTeam === team1 ? team1Color : team2Color;
            label = `${span.playerName} ultimate at ${toTimestamp(time)}`;
            tooltip = <UltEventTooltip event={event} tUlt={tUlt} />;
          }

          return (
            <TimelineDiamond
              key={`diamond-${event.type}-${event.type === "kill" ? event.data.id : `${event.data.id}-${event.type}`}`}
              topPercent={topPercent}
              size={DIAMOND_SIZE}
              color={color}
              label={label}
              timestamp={toTimestamp(time)}
              showTimestamp
              tooltipContent={tooltip}
            />
          );
        })}

        {/* Fight end diamond */}
        <TimelineDiamond
          topPercent={fightEndPercent}
          size={DIAMOND_SIZE_LARGE}
          color="var(--foreground)"
          label={`${t("fight", { num: fightIndex + 1 })} ends at ${toTimestamp(fight.end)}, winner: ${fightWinner}`}
          timestamp={toTimestamp(fight.end)}
          tooltipContent={
            <FightEndTooltip
              fightNum={fightIndex + 1}
              timestamp={toTimestamp(fight.end)}
              duration={fight.end - fight.start}
              winner={fightWinner}
              tUlt={tUlt}
            />
          }
        />
      </div>

      {/* Event detail rows */}
      <div className="relative min-w-0 flex-1 pl-4">
        {events.map((event, idx) => {
          const topPercent = toPercent(eventPositions[idx]);

          if (event.type === "kill") {
            const kill = event.data;
            const activeUlt = options.showUltKillHighlights
              ? isKillDuringUlt(kill, spans)
              : null;

            return (
              <KillEventRow
                key={kill.id}
                kill={kill}
                fight={fight}
                topPercent={topPercent}
                team1={team1}
                team1Color={team1Color}
                team2Color={team2Color}
                environmentalString={environmentalString}
                activeUlt={activeUlt}
                t={t}
                calibrationData={calibrationData}
              />
            );
          }

          return (
            <UltEventRow
              key={`ult-${event.type}-${event.data.id}`}
              event={event}
              topPercent={topPercent}
              team1={team1}
              team1Color={team1Color}
              team2Color={team2Color}
              tUlt={tUlt}
              replayEnabled={!!calibrationData}
            />
          );
        })}
        {roundEndPositions.map(({ roundEnd, percent }) => (
          <RoundEndBar
            key={`round-end-bar-${roundEnd.id}`}
            topPercent={percent}
            roundNumber={roundEnd.round_number}
            teamColor={
              roundEnd.capturing_team === team1 ? team1Color : team2Color
            }
          />
        ))}
      </div>
    </div>
  );
}

function TimelineDiamond({
  topPercent,
  size,
  color,
  label,
  timestamp,
  showTimestamp,
  tooltipContent,
}: {
  topPercent: number;
  size: number;
  color: string;
  label: string;
  timestamp: string;
  showTimestamp?: boolean;
  tooltipContent?: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring absolute left-1/2 cursor-default appearance-none border-0 bg-transparent p-0 before:absolute before:inset-[-18px] before:content-[''] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          style={{
            top: `${topPercent}%`,
            transform: "translate(-50%, -50%)",
            width: size,
            height: size,
          }}
          aria-label={label}
        >
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              transform: "rotate(45deg)",
              boxShadow: `0 0 0 1px var(--background)`,
            }}
          />
          {showTimestamp && (
            <span
              className={cn(
                "text-muted-foreground pointer-events-none absolute top-1/2 left-full -translate-y-1/2 pl-1.5 text-[9px] leading-none whitespace-nowrap tabular-nums",
                GeistMono.className
              )}
            >
              {timestamp}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltipContent ?? timestamp}</TooltipContent>
    </Tooltip>
  );
}

function FightStartTooltip({
  fightNum,
  timestamp,
  totalKills,
  duration,
  tUlt,
}: {
  fightNum: number;
  timestamp: string;
  totalKills: number;
  duration: number;
  tUlt: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium">
        {tUlt("tooltipFightStart", { num: fightNum })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTimestamp", { time: timestamp })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipDuration", { duration: duration.toFixed(1) })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTotalKills", { count: totalKills })}
      </span>
    </div>
  );
}

function FightEndTooltip({
  fightNum,
  timestamp,
  duration,
  winner,
  tUlt,
}: {
  fightNum: number;
  timestamp: string;
  duration: number;
  winner: string;
  tUlt: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium">
        {tUlt("tooltipFightEnd", { num: fightNum })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTimestamp", { time: timestamp })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipDuration", { duration: duration.toFixed(1) })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipWinner", { team: winner })}
      </span>
    </div>
  );
}

function KillTooltip({
  kill,
  environmentalString,
  tUlt,
  t,
}: {
  kill: Kill;
  environmentalString: string;
  tUlt: ReturnType<typeof useTranslations>;
  t: ReturnType<typeof useTranslations>;
}) {
  const isSuicide = kill.attacker_name === kill.victim_name;
  const abilityText = isSuicide
    ? kill.is_environmental
      ? environmentalString
      : kill.event_ability === "0"
        ? t("abilities.primary-fire")
        : t(`abilities.${toKebabCase(kill.event_ability)}`)
    : kill.event_ability === "0"
      ? t("abilities.primary-fire")
      : t(`abilities.${toKebabCase(kill.event_ability)}`);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium">
        {tUlt("tooltipKill", {
          attacker: kill.attacker_name,
          victim: kill.victim_name,
        })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTimestamp", { time: toTimestamp(kill.match_time) })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipMethod", { method: abilityText })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTeam", { team: kill.attacker_team })}
      </span>
    </div>
  );
}

function UltEventTooltip({
  event,
  tUlt,
}: {
  event: KillfeedEvent;
  tUlt: ReturnType<typeof useTranslations>;
}) {
  if (event.type === "kill") return null;
  const span = event.data;
  const time = getEventTime(event);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium">
        {event.type === "ult_start"
          ? tUlt("tooltipUltActivated", {
              player: span.playerName,
              hero: span.playerHero,
            })
          : event.type === "ult_end"
            ? tUlt("tooltipUltEnded", {
                player: span.playerName,
                hero: span.playerHero,
              })
            : tUlt("tooltipUltInstant", {
                player: span.playerName,
                hero: span.playerHero,
              })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTimestamp", { time: toTimestamp(time) })}
      </span>
      <span className="text-xs opacity-80">
        {tUlt("tooltipTeam", { team: span.playerTeam })}
      </span>
      {!span.isInstant && (
        <span className="text-xs opacity-80">
          {tUlt("tooltipDuration", { duration: span.duration.toFixed(1) })}
        </span>
      )}
      {span.killsDuringUlt.length > 0 && (
        <span className="text-xs">
          {tUlt("ultKills", { count: span.killsDuringUlt.length })}
        </span>
      )}
      {span.diedDuringUlt && (
        <span className="text-destructive text-xs">
          {tUlt("tooltipDiedDuringUlt")}
        </span>
      )}
    </div>
  );
}

function RoundEndBar({
  topPercent,
  roundNumber,
  teamColor,
}: {
  topPercent: number;
  roundNumber: number;
  teamColor: string;
}) {
  return (
    <div
      className="pointer-events-none absolute w-full"
      style={{
        top: `${topPercent}%`,
        transform: "translateY(-50%)",
      }}
      aria-label={`Round ${roundNumber} ended`}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-[3px] flex-1 rounded-full"
          style={{
            background: `linear-gradient(to right, ${teamColor}, color-mix(in oklch, ${teamColor} 30%, transparent))`,
          }}
        />
        <span
          className={cn(
            "shrink-0 text-[9px] leading-none opacity-60",
            GeistMono.className
          )}
          style={{ color: teamColor }}
        >
          R{roundNumber}
        </span>
      </div>
    </div>
  );
}

function KillEventRow({
  kill,
  fight,
  topPercent,
  team1,
  team1Color,
  team2Color,
  environmentalString,
  activeUlt,
  t,
  calibrationData,
}: {
  kill: Kill;
  fight: Fight;
  topPercent: number;
  team1: string;
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

  const isSuicide = kill.attacker_name === kill.victim_name;

  const abilityText = isSuicide
    ? kill.is_environmental
      ? environmentalString
      : kill.event_ability === "0"
        ? t("abilities.primary-fire")
        : t(`abilities.${toKebabCase(kill.event_ability)}`)
    : kill.event_ability === "0"
      ? t("abilities.primary-fire")
      : t(`abilities.${toKebabCase(kill.event_ability)}`);

  const calibration = useKillCalibration(
    kill.match_time,
    calibrationData ?? null
  );
  const hasCoords =
    calibration && kill.attacker_x != null && kill.victim_x != null;

  const rowContent = (
    <div className="flex w-full items-center gap-3 pr-2">
      {calibrationData ? (
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs tabular-nums underline-offset-2 hover:underline",
            GeistMono.className
          )}
          style={{ width: "4.5rem" }}
          aria-label="View in Replay"
          onClick={(e) => {
            e.stopPropagation();
            goToReplay(kill.match_time);
          }}
        >
          {toTimestamp(kill.match_time)}
        </button>
      ) : (
        <span
          className={cn(
            "text-muted-foreground shrink-0 text-xs tabular-nums",
            GeistMono.className
          )}
          style={{ width: "4.5rem" }}
        >
          {toTimestamp(kill.match_time)}
        </span>
      )}

      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="inline-block h-6 w-6 shrink-0 rounded"
          style={{
            boxShadow: `0 0 0 2px ${kill.attacker_team === team1 ? team1Color : team2Color}`,
            opacity: isSuicide ? 0 : 1,
          }}
        >
          <Image
            src={`/heroes/${toHero(kill.attacker_hero)}.png`}
            alt=""
            width={256}
            height={256}
            className="h-6 w-6 rounded"
          />
        </span>
        <span className={cn("w-24 truncate text-sm", isSuicide && "opacity-0")}>
          {kill.attacker_name}
        </span>
      </span>

      <span className="text-muted-foreground shrink-0 text-xs">&rarr;</span>

      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="inline-block h-6 w-6 shrink-0 rounded"
          style={{
            boxShadow: `0 0 0 2px ${kill.victim_team === team1 ? team1Color : team2Color}`,
            opacity: isSuicide ? 0 : 1,
          }}
        >
          <Image
            src={`/heroes/${toHero(kill.victim_hero)}.png`}
            alt=""
            width={256}
            height={256}
            className="h-6 w-6 rounded"
          />
        </span>
        <span className="w-24 truncate text-sm">{kill.victim_name}</span>
      </span>

      <span className="text-muted-foreground truncate text-xs">
        {abilityText}
      </span>
    </div>
  );

  return (
    <div
      className="absolute w-full"
      style={{
        top: `${topPercent}%`,
        transform: "translateY(-50%)",
        backgroundColor: ultHighlightColor
          ? `color-mix(in oklch, ${ultHighlightColor} 8%, transparent)`
          : undefined,
      }}
    >
      {hasCoords ? (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="-my-2 cursor-pointer py-2 text-left"
            >
              {rowContent}
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
              abilityName={abilityText}
            />
          </HoverCardContent>
        </HoverCard>
      ) : (
        rowContent
      )}
    </div>
  );
}

function UltEventRow({
  event,
  topPercent,
  team1,
  team1Color,
  team2Color,
  tUlt,
  replayEnabled,
}: {
  event: KillfeedEvent;
  topPercent: number;
  team1: string;
  team1Color: string;
  team2Color: string;
  tUlt: ReturnType<typeof useTranslations>;
  replayEnabled: boolean;
}) {
  const goToReplay = useGoToReplay();
  const span = event.data as UltimateSpan;
  const color = span.playerTeam === team1 ? team1Color : team2Color;
  const isDeath = span.diedDuringUlt;

  let label: string;
  if (event.type === "ult_start") {
    label = tUlt("ultStarted", { player: span.playerName });
  } else if (event.type === "ult_instant") {
    label = isDeath
      ? tUlt("ultEndedDeath", {
          player: span.playerName,
          duration: span.duration.toFixed(1),
        })
      : tUlt("ultInstant", {
          player: span.playerName,
          duration: span.duration.toFixed(1),
        });
  } else {
    label = isDeath
      ? tUlt("ultEndedDeath", {
          player: span.playerName,
          duration: span.duration.toFixed(1),
        })
      : tUlt("ultEnded", {
          player: span.playerName,
          duration: span.duration.toFixed(1),
        });
  }

  return (
    <div
      className="absolute flex w-full items-center gap-3 pr-2"
      style={{
        top: `${topPercent}%`,
        transform: "translateY(-50%)",
      }}
    >
      {replayEnabled ? (
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs tabular-nums underline-offset-2 hover:underline",
            GeistMono.className
          )}
          style={{ width: "4.5rem" }}
          aria-label="View in Replay"
          onClick={() => goToReplay(getEventTime(event))}
        >
          {toTimestamp(getEventTime(event))}
        </button>
      ) : (
        <span
          className={cn(
            "text-muted-foreground shrink-0 text-xs tabular-nums",
            GeistMono.className
          )}
          style={{ width: "4.5rem" }}
        >
          {toTimestamp(getEventTime(event))}
        </span>
      )}

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
          className="h-5 w-5 shrink-0 rounded"
          style={{
            border: `1px solid ${isDeath ? "var(--destructive)" : color}`,
          }}
        />
        <span style={isDeath ? undefined : { color }}>{label}</span>
      </span>
    </div>
  );
}

export function FightSeparator({
  gapSeconds,
  gutterWidth,
}: {
  gapSeconds: number;
  gutterWidth: number;
}) {
  const showElapsed = gapSeconds > 10;
  const height = showElapsed ? 32 : 16;

  const elapsedLabel =
    gapSeconds >= 60
      ? `${Math.floor(gapSeconds / 60)}m ${Math.round(gapSeconds % 60)}s`
      : `${Math.round(gapSeconds)}s`;

  return (
    <div
      className="relative"
      style={{ height }}
      role="separator"
      aria-label={`${elapsedLabel} between fights`}
    >
      {showElapsed && (
        <div
          className="border-muted-foreground/50 absolute inset-y-0 flex items-center justify-center border"
          style={{
            left: LEFT_LABEL_WIDTH + gutterWidth + AXIS_WIDTH / 2,
            right: 0,
            backgroundImage:
              "repeating-linear-gradient(135deg, color-mix(in oklch, var(--muted-foreground) 40%, transparent), color-mix(in oklch, var(--muted-foreground) 40%, transparent) 2px, transparent 2px, transparent 5px)",
          }}
        >
          <span
            className={cn(
              "bg-background text-muted-foreground z-10 rounded-sm px-2.5 py-1 text-[10px] leading-none whitespace-nowrap",
              GeistMono.className
            )}
          >
            {elapsedLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export function RoundEndSeparator({
  roundNumber,
  capturingTeam,
  teamColor,
  gutterWidth,
  t,
}: {
  roundNumber: number;
  capturingTeam: string;
  teamColor: string;
  gutterWidth: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const label = t("roundEnded", { num: roundNumber, team: capturingTeam });

  return (
    <div
      className="relative"
      style={{ height: 32 }}
      role="separator"
      aria-label={label}
    >
      <div
        className="absolute inset-y-0 flex items-center justify-center"
        style={{
          left: LEFT_LABEL_WIDTH + gutterWidth + AXIS_WIDTH / 2,
          right: 0,
          border: `1px solid color-mix(in oklch, ${teamColor} 50%, transparent)`,
          backgroundImage: `repeating-linear-gradient(135deg, color-mix(in oklch, ${teamColor} 25%, transparent), color-mix(in oklch, ${teamColor} 25%, transparent) 2px, transparent 2px, transparent 5px)`,
        }}
      >
        <span
          className={cn(
            "bg-background z-10 rounded-sm px-2.5 py-1 text-[10px] leading-none whitespace-nowrap",
            GeistMono.className
          )}
          style={{ color: teamColor }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
