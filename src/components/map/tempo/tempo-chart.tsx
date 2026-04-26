"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  FightBoundary,
  KillPin,
  TempoDataPoint,
  UltPin,
} from "@/data/map/types";
import { toTimestamp } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { startTransition, useCallback, useMemo, useState } from "react";
import { EvalBar } from "./eval-bar";
import { HeroPin } from "./hero-pin";
import { KillDot } from "./kill-dot";
import { TempoCurve } from "./tempo-curve";
import { TempoScrubber } from "./tempo-scrubber";

type TempoChartProps = {
  combinedSeries: TempoDataPoint[];
  killsSeries: TempoDataPoint[];
  ultsSeries: TempoDataPoint[];
  ultPins: UltPin[];
  killPins: KillPin[];
  fightBoundaries: FightBoundary[];
  matchStartTime: number;
  matchEndTime: number;
  team1Name: string;
  team2Name: string;
  team1Color: string;
  team2Color: string;
};

type TabValue = "combined" | "ultimates" | "kills";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 400;
const CENTER_Y = VIEW_HEIGHT / 2;
const CURVE_AMPLITUDE = 180;
const PIN_OVERLAP_THRESHOLD = 30;

function mapToChartPoints(
  series: TempoDataPoint[],
  team: "team1" | "team2",
  visibleStart: number,
  visibleEnd: number
): { x: number; y: number }[] {
  const duration = visibleEnd - visibleStart;
  if (duration <= 0) return [];

  const points: { x: number; y: number }[] = [];
  for (const p of series) {
    if (p.time < visibleStart || p.time > visibleEnd) continue;
    const x = ((p.time - visibleStart) / duration) * VIEW_WIDTH;
    const val = team === "team1" ? p.team1 : p.team2;
    const y =
      team === "team1"
        ? CENTER_Y - val * CURVE_AMPLITUDE
        : CENTER_Y + val * CURVE_AMPLITUDE;
    points.push({ x, y });
  }
  return points;
}

function getTempoAtTime(
  series: TempoDataPoint[],
  time: number,
  team: "team1" | "team2"
): number {
  let closest = series[0];
  let minDist = Infinity;
  for (const p of series) {
    const dist = Math.abs(p.time - time);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }
  return team === "team1" ? closest.team1 : closest.team2;
}

export function TempoChart({
  combinedSeries,
  killsSeries,
  ultsSeries,
  ultPins,
  killPins,
  fightBoundaries,
  matchStartTime,
  matchEndTime,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
}: TempoChartProps) {
  const t = useTranslations("mapPage.events.tempo");
  const [activeTab, setActiveTab] = useState<TabValue>("combined");
  const [range, setRangeRaw] = useState<[number, number]>([
    matchStartTime,
    matchEndTime,
  ]);

  const setRange = useCallback((next: [number, number]) => {
    startTransition(() => setRangeRaw(next));
  }, []);

  const activeSeries = useMemo(() => {
    switch (activeTab) {
      case "combined":
        return combinedSeries;
      case "ultimates":
        return ultsSeries;
      case "kills":
        return killsSeries;
    }
  }, [activeTab, combinedSeries, ultsSeries, killsSeries]);

  const showUltPins = activeTab !== "kills";
  const showKillDots = activeTab === "kills" || activeTab === "combined";

  const [visibleStart, visibleEnd] = range;
  const visibleDuration = visibleEnd - visibleStart;

  const team1Points = useMemo(
    () => mapToChartPoints(activeSeries, "team1", visibleStart, visibleEnd),
    [activeSeries, visibleStart, visibleEnd]
  );

  const team2Points = useMemo(
    () => mapToChartPoints(activeSeries, "team2", visibleStart, visibleEnd),
    [activeSeries, visibleStart, visibleEnd]
  );

  const visibleFights = useMemo(
    () =>
      fightBoundaries.filter(
        (f) => f.end >= visibleStart && f.start <= visibleEnd
      ),
    [fightBoundaries, visibleStart, visibleEnd]
  );

  const timeLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    const step = visibleDuration / 5;
    for (let i = 0; i <= 5; i++) {
      const time = visibleStart + step * i;
      labels.push({
        x: (i / 5) * VIEW_WIDTH,
        label: toTimestamp(time),
      });
    }
    return labels;
  }, [visibleStart, visibleDuration]);

  const visiblePins = useMemo(() => {
    if (!showUltPins) return [];

    const pins = ultPins
      .filter((p) => p.time >= visibleStart && p.time <= visibleEnd)
      .map((p) => {
        const x = ((p.time - visibleStart) / visibleDuration) * VIEW_WIDTH;
        const tempo = getTempoAtTime(activeSeries, p.time, p.team);
        const curveY =
          p.team === "team1"
            ? CENTER_Y - tempo * CURVE_AMPLITUDE
            : CENTER_Y + tempo * CURVE_AMPLITUDE;
        return { ...p, x, curveY, yOffset: 0 };
      })
      .sort((a, b) => a.x - b.x);

    for (let i = 1; i < pins.length; i++) {
      for (let j = i - 1; j >= 0; j--) {
        if (
          Math.abs(pins[i].x - pins[j].x) < PIN_OVERLAP_THRESHOLD &&
          pins[i].team === pins[j].team
        ) {
          const direction = pins[i].team === "team1" ? -1 : 1;
          pins[i].yOffset = pins[j].yOffset + direction * 35;
          break;
        }
      }
    }

    return pins;
  }, [
    showUltPins,
    ultPins,
    visibleStart,
    visibleEnd,
    visibleDuration,
    activeSeries,
  ]);

  const evalScores = useMemo(() => {
    let t1Sum = 0;
    let t2Sum = 0;
    let count = 0;
    for (const p of activeSeries) {
      if (p.time >= visibleStart && p.time <= visibleEnd) {
        t1Sum += p.team1;
        t2Sum += p.team2;
        count++;
      }
    }
    if (count === 0) return { team1: 0, team2: 0 };
    return { team1: t1Sum / count, team2: t2Sum / count };
  }, [activeSeries, visibleStart, visibleEnd]);

  const tempoChartDesc = useMemo(() => {
    let team1Peak = { time: matchStartTime, val: -Infinity };
    let team2Peak = { time: matchStartTime, val: -Infinity };
    for (const p of activeSeries) {
      if (p.team1 > team1Peak.val) team1Peak = { time: p.time, val: p.team1 };
      if (p.team2 > team2Peak.val) team2Peak = { time: p.time, val: p.team2 };
    }
    const totalSeconds = Math.round(matchEndTime - matchStartTime);
    return `Tempo over ${totalSeconds} seconds. ${team1Name} peaked at ${toTimestamp(team1Peak.time)}, ${team2Name} peaked at ${toTimestamp(team2Peak.time)}.`;
  }, [activeSeries, matchStartTime, matchEndTime, team1Name, team2Name]);

  const visibleKillDots = useMemo(() => {
    if (!showKillDots) return [];

    return killPins
      .filter((k) => k.time >= visibleStart && k.time <= visibleEnd)
      .map((k) => {
        const x = ((k.time - visibleStart) / visibleDuration) * VIEW_WIDTH;
        const tempo = getTempoAtTime(activeSeries, k.time, k.team);
        const y =
          k.team === "team1"
            ? CENTER_Y - tempo * CURVE_AMPLITUDE
            : CENTER_Y + tempo * CURVE_AMPLITUDE;
        return { ...k, x, y };
      });
  }, [
    showKillDots,
    killPins,
    visibleStart,
    visibleEnd,
    visibleDuration,
    activeSeries,
  ]);

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex justify-end"
      >
        <TabsList>
          <TabsTrigger value="combined">{t("combined")}</TabsTrigger>
          <TabsTrigger value="ultimates">{t("ultimates")}</TabsTrigger>
          <TabsTrigger value="kills">{t("kills")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <TooltipProvider>
        <div className="flex gap-2">
          {/* Eval bar */}
          <EvalBar
            team1Score={evalScores.team1}
            team2Score={evalScores.team2}
            team1Name={team1Name}
            team2Name={team2Name}
            team1Color={team1Color}
            team2Color={team2Color}
          />

          {/* Chart */}
          <div
            className="border-border/50 bg-muted/30 relative aspect-[5/2] w-full overflow-hidden rounded-lg border"
            role="img"
            aria-label={t("title")}
          >
            <svg
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-full"
            >
              <title>{t("title")}</title>
              <desc>{tempoChartDesc}</desc>
              {/* Center dashed line */}
              <line
                x1={0}
                y1={CENTER_Y}
                x2={VIEW_WIDTH}
                y2={CENTER_Y}
                stroke="currentColor"
                strokeWidth={0.5}
                strokeDasharray="4,4"
                className="text-muted-foreground/20"
              />

              {/* Fight boundary zones */}
              {visibleFights.map((fb) => {
                const x1 = Math.max(
                  0,
                  ((fb.start - visibleStart) / visibleDuration) * VIEW_WIDTH
                );
                const x2 = Math.min(
                  VIEW_WIDTH,
                  ((fb.end - visibleStart) / visibleDuration) * VIEW_WIDTH
                );
                const midX = (x1 + x2) / 2;
                return (
                  <g key={fb.fightNumber}>
                    <line
                      x1={x1}
                      y1={0}
                      x2={x1}
                      y2={VIEW_HEIGHT}
                      stroke="currentColor"
                      strokeWidth={0.5}
                      strokeDasharray="2,4"
                      className="text-muted-foreground/10"
                    />
                    <line
                      x1={x2}
                      y1={0}
                      x2={x2}
                      y2={VIEW_HEIGHT}
                      stroke="currentColor"
                      strokeWidth={0.5}
                      strokeDasharray="2,4"
                      className="text-muted-foreground/10"
                    />
                    <text
                      x={midX}
                      y={12}
                      textAnchor="middle"
                      className="fill-muted-foreground/30 text-[10px]"
                    >
                      F{fb.fightNumber}
                    </text>
                  </g>
                );
              })}

              {/* Team 1 curve (upward from center) */}
              <TempoCurve
                points={team1Points}
                color={team1Color}
                baselineY={CENTER_Y}
              />

              {/* Team 2 curve (downward from center) */}
              <TempoCurve
                points={team2Points}
                color={team2Color}
                baselineY={CENTER_Y}
              />

              {/* Hero pins (combined + ultimates tabs) */}
              {visiblePins.map((pin) => (
                <HeroPin
                  key={`ult-${pin.playerName}-${pin.hero}-${pin.time}`}
                  x={pin.x}
                  y={pin.curveY}
                  hero={pin.hero}
                  playerName={pin.playerName}
                  teamLabel={pin.team === "team1" ? team1Name : team2Name}
                  color={pin.team === "team1" ? team1Color : team2Color}
                  time={pin.time}
                  id={`ult-${pin.playerName}-${pin.hero}-${pin.time}`}
                  yOffset={pin.yOffset}
                  curveY={pin.curveY}
                />
              ))}

              {/* Kill dots (kills tab only) */}
              {visibleKillDots.map((dot) => (
                <KillDot
                  key={`kill-${dot.playerName}-${dot.hero}-${dot.victimName}-${dot.time}`}
                  x={dot.x}
                  y={dot.y}
                  attackerHero={dot.hero}
                  attackerName={dot.playerName}
                  victimHero={dot.victimHero}
                  victimName={dot.victimName}
                  teamLabel={dot.team === "team1" ? team1Name : team2Name}
                  color={dot.team === "team1" ? team1Color : team2Color}
                  time={dot.time}
                />
              ))}

              {/* Time labels */}
              {timeLabels.map((tl) => (
                <text
                  key={tl.x}
                  x={tl.x}
                  y={VIEW_HEIGHT - 4}
                  textAnchor={
                    tl.x === 0
                      ? "start"
                      : tl.x === VIEW_WIDTH
                        ? "end"
                        : "middle"
                  }
                  className="fill-muted-foreground/50 font-mono text-[10px] tabular-nums"
                >
                  {tl.label}
                </text>
              ))}

              {/* Team labels */}
              <text
                x={8}
                y={20}
                className="fill-muted-foreground text-[11px] font-medium"
              >
                {team1Name}
              </text>
              <text
                x={8}
                y={VIEW_HEIGHT - 16}
                className="fill-muted-foreground text-[11px] font-medium"
              >
                {team2Name}
              </text>
            </svg>
          </div>
        </div>
      </TooltipProvider>

      {/* Scrubber */}
      <TempoScrubber
        matchStart={matchStartTime}
        matchEnd={matchEndTime}
        range={range}
        onRangeChange={setRange}
        fightBoundaries={fightBoundaries}
        miniSeries={combinedSeries}
        team1Color={team1Color}
        team2Color={team2Color}
      />
    </div>
  );
}
