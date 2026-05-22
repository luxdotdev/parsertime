"use client";

import { HeroPin } from "@/components/map/tempo/hero-pin";
import { KillDot } from "@/components/map/tempo/kill-dot";
import { TempoCurve } from "@/components/map/tempo/tempo-curve";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  PlayerTelemetry,
  TelemetryChannel,
} from "@/data/map/player-telemetry-types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { toTimestamp } from "@/lib/utils";
import { heroAbilityMapping, type HeroName } from "@/types/heroes";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SAMPLE_INTERVAL = 0.5;
const MAX_PATH_POINTS = 600;
const CURVE_LANE_HEIGHT = 116;
const EVENTS_LANE_HEIGHT = 96;
const LANE_PAD_TOP = 14;
const LANE_PAD_BOTTOM = 8;
const HEALING_COLOR = "var(--chart-3)";
const HEALING_RECEIVED_COLOR = "var(--chart-4)";
const TAKEN_COLOR = "var(--destructive)";

type LaneTrace = {
  channel: TelemetryChannel;
  color: string;
  label: string;
};

type CurveLane = {
  id: string;
  label: string;
  traces: LaneTrace[];
};

function nearestValue(channel: TelemetryChannel, time: number, start: number) {
  if (channel.points.length === 0) return 0;
  const idx = Math.round((time - start) / SAMPLE_INTERVAL);
  const clamped = Math.max(0, Math.min(channel.points.length - 1, idx));
  return channel.points[clamped]?.value ?? 0;
}

function displayAbility(ability: string): string {
  return ability === "0" ? "Primary Fire" : ability;
}

function abilityName(hero: string, slot: 1 | 2, fallback: string): string {
  const names = heroAbilityMapping[hero as HeroName];
  if (!names) return fallback;
  return slot === 1 ? names.ability1Name : names.ability2Name;
}

export function PlayerTelemetryChart({
  telemetry,
  playerName,
}: {
  telemetry: PlayerTelemetry;
  playerName: string;
}) {
  const t = useTranslations("mapPage.player.telemetry");
  const { team1, team2 } = useColorblindMode();
  const teamColor = telemetry.playerTeam === "Team1" ? team1 : team2;

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(880);
  const [cursorX, setCursorX] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { matchStartTime: start, matchEndTime: end } = telemetry;
  const duration = Math.max(1, end - start);

  const timeToX = useCallback(
    (time: number) => ((time - start) / duration) * width,
    [start, duration, width]
  );
  const xToTime = useCallback(
    (x: number) => start + (x / width) * duration,
    [start, duration, width]
  );

  const lanes: CurveLane[] = useMemo(() => {
    const { channels, role } = telemetry;
    const output: CurveLane =
      role === "Support"
        ? {
            id: "output",
            label: t("lanes.support"),
            traces: [
              {
                channel: channels.healingDealt,
                color: HEALING_COLOR,
                label: t("channels.healingDealt"),
              },
              {
                channel: channels.damageDealt,
                color: teamColor,
                label: t("channels.damageDealt"),
              },
            ],
          }
        : {
            id: "output",
            label: t("lanes.output"),
            traces: [
              {
                channel: channels.damageDealt,
                color: teamColor,
                label: t("channels.damageDealt"),
              },
            ],
          };

    const survival: CurveLane = {
      id: "survival",
      label: t("lanes.survival"),
      traces: [
        {
          channel: channels.damageTaken,
          color: TAKEN_COLOR,
          label: t("channels.damageTaken"),
        },
        {
          channel: channels.healingReceived,
          color: HEALING_RECEIVED_COLOR,
          label: t("channels.healingReceived"),
        },
      ],
    };

    return [output, survival];
  }, [telemetry, teamColor, t]);

  const cursorTime = cursorX == null ? null : xToTime(cursorX);

  function handlePointerMove(e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(width, e.clientX - rect.left));
    setCursorX(x);
  }

  const totalSeconds = Math.round(duration);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <Legend
          teamColor={teamColor}
          role={telemetry.role}
          labels={{
            damageDealt: t("channels.damageDealt"),
            damageTaken: t("channels.damageTaken"),
            healingDealt: t("channels.healingDealt"),
            healingReceived: t("channels.healingReceived"),
            ult: t("markers.ult"),
            kill: t("markers.kill"),
            death: t("markers.death"),
            ability: t("markers.ability"),
            swap: t("markers.swap"),
          }}
        />

        <div
          ref={containerRef}
          className="relative w-full touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setCursorX(null)}
          role="group"
          aria-label={t("ariaChart", { seconds: totalSeconds })}
        >
          {lanes.map((lane, i) => (
            <CurveLaneView
              key={lane.id}
              lane={lane}
              width={width}
              timeToX={timeToX}
              rounds={telemetry.rounds}
              heroSwaps={telemetry.heroSwaps}
              showRoundLabels={i === 0}
              cursorX={cursorX}
            />
          ))}

          <EventsLaneView
            telemetry={telemetry}
            teamColor={teamColor}
            width={width}
            timeToX={timeToX}
            cursorX={cursorX}
            label={t("lanes.events")}
            playerName={playerName}
            heroSwaps={telemetry.heroSwaps}
            abilityLabels={{
              1: t("markers.ability1"),
              2: t("markers.ability2"),
            }}
          />

          <TimeAxis width={width} start={start} end={end} cursorX={cursorX} />

          {cursorTime != null && (
            <CursorReadout
              cursorX={cursorX ?? 0}
              width={width}
              time={cursorTime}
              start={start}
              lanes={lanes}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function CurveLaneView({
  lane,
  width,
  timeToX,
  rounds,
  heroSwaps,
  showRoundLabels,
  cursorX,
}: {
  lane: CurveLane;
  width: number;
  timeToX: (time: number) => number;
  rounds: PlayerTelemetry["rounds"];
  heroSwaps: PlayerTelemetry["heroSwaps"];
  showRoundLabels: boolean;
  cursorX: number | null;
}) {
  const h = CURVE_LANE_HEIGHT;
  const baselineY = h - LANE_PAD_BOTTOM;
  const amplitude = h - LANE_PAD_TOP - LANE_PAD_BOTTOM;

  const norm = useMemo(() => {
    let max = 0;
    for (const trace of lane.traces) max = Math.max(max, trace.channel.peak);
    return max > 0 ? max : 1;
  }, [lane]);

  const tracePoints = useMemo(
    () =>
      lane.traces.map((trace) => {
        const pts = trace.channel.points;
        const step = Math.max(1, Math.ceil(pts.length / MAX_PATH_POINTS));
        const out: { x: number; y: number }[] = [];
        for (let i = 0; i < pts.length; i += step) {
          out.push({
            x: timeToX(pts[i].time),
            y: baselineY - (pts[i].value / norm) * amplitude,
          });
        }
        return { color: trace.color, label: trace.label, points: out };
      }),
    [lane, norm, timeToX, baselineY, amplitude]
  );

  const peakLabel = useMemo(() => {
    const top = lane.traces[0];
    return Math.round(top.channel.peak);
  }, [lane]);

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      className="block"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* baseline */}
      <line
        x1={0}
        y1={baselineY}
        x2={width}
        y2={baselineY}
        className="stroke-border"
        strokeWidth={1}
      />

      {/* round sector lines */}
      {rounds.map((r) => {
        const x = timeToX(r.start);
        if (x <= 0) return null;
        return (
          <line
            key={`r-${r.roundNumber}-${r.start}`}
            x1={x}
            y1={0}
            x2={x}
            y2={h}
            className="stroke-muted-foreground/15"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        );
      })}

      {/* hero-swap markers span the lane height */}
      {heroSwaps.map((s) => (
        <line
          key={`s-${s.time}`}
          x1={timeToX(s.time)}
          y1={0}
          x2={timeToX(s.time)}
          y2={h}
          className="stroke-foreground/25"
          strokeWidth={1}
          strokeDasharray="1 3"
        />
      ))}

      {/* traces */}
      {tracePoints.map((tp) => (
        <TempoCurve
          key={tp.label}
          points={tp.points}
          color={tp.color}
          baselineY={baselineY}
        />
      ))}

      {/* lane label + peak */}
      <text
        x={8}
        y={16}
        className="fill-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase"
      >
        {lane.label}
      </text>
      <text
        x={width - 8}
        y={16}
        textAnchor="end"
        className="fill-muted-foreground/70 font-mono text-[10px] tabular-nums"
      >
        {peakLabel.toLocaleString()}/s
      </text>

      {/* round labels (top lane only) */}
      {showRoundLabels &&
        rounds.map((r) => {
          const x = timeToX(r.start) + 4;
          return (
            <text
              key={`rl-${r.roundNumber}-${r.start}`}
              x={x}
              y={h - 12}
              className="fill-muted-foreground/40 font-mono text-[9px] tracking-[0.08em] uppercase"
            >
              R{r.roundNumber}
            </text>
          );
        })}

      {/* crosshair */}
      {cursorX != null && (
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={h}
          className="stroke-foreground/40"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

function EventsLaneView({
  telemetry,
  teamColor,
  width,
  timeToX,
  cursorX,
  label,
  playerName,
  heroSwaps,
  abilityLabels,
}: {
  telemetry: PlayerTelemetry;
  teamColor: string;
  width: number;
  timeToX: (time: number) => number;
  cursorX: number | null;
  label: string;
  playerName: string;
  heroSwaps: PlayerTelemetry["heroSwaps"];
  abilityLabels: Record<1 | 2, string>;
}) {
  const h = EVENTS_LANE_HEIGHT;
  const ultY = 44;
  const killY = 60;
  const deathY = 72;
  const abilityY = 84;

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      className="block"
      preserveAspectRatio="none"
    >
      <text
        x={8}
        y={14}
        className="fill-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase"
        aria-hidden="true"
      >
        {label}
      </text>

      {/* round sector lines */}
      {telemetry.rounds.map((r) => {
        const x = timeToX(r.start);
        if (x <= 0) return null;
        return (
          <line
            key={`er-${r.roundNumber}-${r.start}`}
            x1={x}
            y1={0}
            x2={x}
            y2={h}
            className="stroke-muted-foreground/15"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        );
      })}

      {/* hero swaps */}
      {heroSwaps.map((s) => (
        <line
          key={`es-${s.time}`}
          x1={timeToX(s.time)}
          y1={0}
          x2={timeToX(s.time)}
          y2={h}
          className="stroke-foreground/25"
          strokeWidth={1}
          strokeDasharray="1 3"
        />
      ))}

      {/* ability ticks */}
      {telemetry.abilities.map((a) => (
        <AbilityTick
          key={`a-${a.time}-${a.slot}-${a.hero}`}
          x={timeToX(a.time)}
          y={abilityY}
          hero={a.hero}
          time={a.time}
          label={abilityName(a.hero, a.slot, abilityLabels[a.slot])}
        />
      ))}

      {/* kills */}
      {telemetry.kills.map((k) => (
        <KillDot
          key={`k-${k.time}-${k.victimName}-${k.victimHero}`}
          x={timeToX(k.time)}
          y={killY}
          attackerHero={k.playerHero}
          attackerName={playerName}
          victimHero={k.victimHero}
          victimName={k.victimName}
          teamLabel={displayAbility(k.ability)}
          color={teamColor}
          time={k.time}
        />
      ))}

      {/* deaths */}
      {telemetry.deaths.map((d) => (
        <KillDot
          key={`d-${d.time}-${d.attackerName}-${d.attackerHero}`}
          x={timeToX(d.time)}
          y={deathY}
          attackerHero={d.attackerHero}
          attackerName={d.attackerName}
          victimHero={d.playerHero}
          victimName={playerName}
          teamLabel={displayAbility(d.ability)}
          color={TAKEN_COLOR}
          time={d.time}
        />
      ))}

      {/* ults */}
      {telemetry.ults.map((u) => (
        <HeroPin
          key={`u-${u.time}-${u.hero}`}
          id={`tele-ult-${u.time}-${u.hero}`}
          x={timeToX(u.time)}
          y={ultY}
          hero={u.hero}
          playerName={playerName}
          teamLabel={telemetry.role}
          color={teamColor}
          time={u.time}
        />
      ))}

      {cursorX != null && (
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={h}
          className="stroke-foreground/40"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

function AbilityTick({
  x,
  y,
  hero,
  time,
  label,
}: {
  x: number;
  y: number;
  hero: string;
  time: number;
  label: string;
}) {
  return (
    <g
      role="img"
      aria-label={`${label} (${hero}) at ${toTimestamp(time)}`}
      className="text-muted-foreground/70"
    >
      <title>{`${label} · ${toTimestamp(time)}`}</title>
      <path
        d={`M${x},${y - 5} L${x + 3.5},${y + 1} L${x - 3.5},${y + 1} Z`}
        fill="currentColor"
      />
    </g>
  );
}

function TimeAxis({
  width,
  start,
  end,
  cursorX,
}: {
  width: number;
  start: number;
  end: number;
  cursorX: number | null;
}) {
  const h = 22;
  const ticks = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    for (let i = 0; i <= 5; i++) {
      out.push({
        x: (i / 5) * width,
        label: toTimestamp(start + ((end - start) * i) / 5),
      });
    }
    return out;
  }, [width, start, end]);

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      className="block"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {ticks.map((tick, i) => (
        <text
          key={tick.x}
          x={tick.x}
          y={14}
          textAnchor={i === 0 ? "start" : i === 5 ? "end" : "middle"}
          className="fill-muted-foreground/60 font-mono text-[10px] tabular-nums"
        >
          {tick.label}
        </text>
      ))}
      {cursorX != null && (
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={h}
          className="stroke-foreground/40"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

function CursorReadout({
  cursorX,
  width,
  time,
  start,
  lanes,
}: {
  cursorX: number;
  width: number;
  time: number;
  start: number;
  lanes: CurveLane[];
}) {
  const flip = cursorX > width * 0.7;
  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none absolute top-1 z-10 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
      style={{
        left: cursorX,
        transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
      }}
    >
      <p className="font-mono tabular-nums">{toTimestamp(time)}</p>
      <dl className="mt-1 space-y-0.5">
        {lanes.flatMap((lane) =>
          lane.traces.map((trace) => (
            <div
              key={`${lane.id}-${trace.label}`}
              className="flex items-center justify-between gap-3"
            >
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-[2px]"
                  style={{ backgroundColor: trace.color }}
                  aria-hidden="true"
                />
                {trace.label}
              </dt>
              <dd className="font-mono tabular-nums">
                {Math.round(nearestValue(trace.channel, time, start))}/s
              </dd>
            </div>
          ))
        )}
      </dl>
    </div>
  );
}

function Legend({
  teamColor,
  role,
  labels,
}: {
  teamColor: string;
  role: PlayerTelemetry["role"];
  labels: Record<
    | "damageDealt"
    | "damageTaken"
    | "healingDealt"
    | "healingReceived"
    | "ult"
    | "kill"
    | "death"
    | "ability"
    | "swap",
    string
  >;
}) {
  const items: { color: string; label: string; glyph?: ReactNode }[] = [
    { color: teamColor, label: labels.damageDealt },
    { color: TAKEN_COLOR, label: labels.damageTaken },
  ];
  if (role === "Support") {
    items.push({ color: HEALING_COLOR, label: labels.healingDealt });
  }
  items.push({ color: HEALING_RECEIVED_COLOR, label: labels.healingReceived });

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-3 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
      <span className="text-muted-foreground/30" aria-hidden="true">
        |
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true">◆</span>
        {labels.ult}
      </span>
      <span className="flex items-center gap-1.5">
        <span style={{ color: teamColor }} aria-hidden="true">
          ●
        </span>
        {labels.kill}
      </span>
      <span className="flex items-center gap-1.5">
        <span style={{ color: TAKEN_COLOR }} aria-hidden="true">
          ●
        </span>
        {labels.death}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true">▲</span>
        {labels.ability}
      </span>
    </div>
  );
}
