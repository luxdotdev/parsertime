"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchupMapResult, MatchupWinrateData } from "@/data/team/types";
import { determineRole } from "@/lib/player-table-data";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { Info, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type MatchupWinrateTabProps = {
  data: MatchupWinrateData;
};

export function MatchupWinrateTab({ data }: MatchupWinrateTabProps) {
  const heroNames = useHeroNames();
  const [selectedOurHeroes, setSelectedOurHeroes] = useState<HeroName[]>([]);
  const [selectedEnemyHeroes, setSelectedEnemyHeroes] = useState<HeroName[]>(
    []
  );

  const filteredMaps = useMemo(() => {
    return data.maps.filter((map) => {
      const ourHeroNames = new Set(map.ourHeroes.map((h) => h.heroName));
      const enemyHeroNames = new Set(map.enemyHeroes.map((h) => h.heroName));

      const ourMatch =
        selectedOurHeroes.length === 0 ||
        selectedOurHeroes.every((h) => ourHeroNames.has(h));
      const enemyMatch =
        selectedEnemyHeroes.length === 0 ||
        selectedEnemyHeroes.every((h) => enemyHeroNames.has(h));

      return ourMatch && enemyMatch;
    });
  }, [data.maps, selectedOurHeroes, selectedEnemyHeroes]);

  const summary = useMemo(() => {
    const wins = filteredMaps.filter((m) => m.isWin).length;
    const losses = filteredMaps.length - wins;
    const winrate =
      filteredMaps.length > 0 ? (wins / filteredMaps.length) * 100 : 0;
    return { wins, losses, winrate, gamesPlayed: filteredMaps.length };
  }, [filteredMaps]);

  const baseWinrate = useMemo(() => {
    const wins = data.maps.filter((m) => m.isWin).length;
    return data.maps.length > 0 ? (wins / data.maps.length) * 100 : 0;
  }, [data.maps]);

  const trendData = useMemo(
    () => computePerMapTrend(filteredMaps),
    [filteredMaps]
  );

  const bestComps = useMemo(
    () => computeBestCompositions(filteredMaps),
    [filteredMaps]
  );

  const orientationStats = useMemo(
    () => computeOrientationStats(data.maps),
    [data.maps]
  );

  const hasAnySelection =
    selectedOurHeroes.length > 0 || selectedEnemyHeroes.length > 0;

  function addOurHero(hero: HeroName) {
    if (selectedOurHeroes.length >= 5 || selectedOurHeroes.includes(hero))
      return;
    setSelectedOurHeroes((prev) => [...prev, hero]);
  }

  function removeOurHero(hero: HeroName) {
    setSelectedOurHeroes((prev) => prev.filter((h) => h !== hero));
  }

  function addEnemyHero(hero: HeroName) {
    if (selectedEnemyHeroes.length >= 5 || selectedEnemyHeroes.includes(hero))
      return;
    setSelectedEnemyHeroes((prev) => [...prev, hero]);
  }

  function removeEnemyHero(hero: HeroName) {
    setSelectedEnemyHeroes((prev) => prev.filter((h) => h !== hero));
  }

  function clearAll() {
    setSelectedOurHeroes([]);
    setSelectedEnemyHeroes([]);
  }

  if (data.maps.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Winrates · Matchups"
          title="Hero matchup winrates"
        />
        <p className="text-muted-foreground text-sm">
          No game data available for the selected time period. Play some scrims
          to unlock matchup analysis.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-12">
      <StatRibbon
        cells={[
          {
            label: "Scrims tracked",
            value: String(orientationStats.scrimCount),
            sub: `${data.maps.length} maps`,
            emphasis: true,
          },
          {
            label: "Best matchup",
            value: orientationStats.best
              ? `${orientationStats.best.winrate.toFixed(0)}%`
              : "—",
            sub: orientationStats.best?.label ?? "Need 3+ shared maps",
          },
          {
            label: "Worst matchup",
            value: orientationStats.worst
              ? `${orientationStats.worst.winrate.toFixed(0)}%`
              : "—",
            sub: orientationStats.worst?.label ?? "Need 3+ shared maps",
          },
          {
            label: "Compositions",
            value: String(orientationStats.compositionCount),
            sub: "unique five-stacks",
          },
        ]}
        columns={4}
      />

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Winrates · Matchups"
          title="Hero matchup explorer"
          description="Select heroes on each side to scope the analysis. All selected heroes must be present in a map for it to count."
          rightSlot={
            hasAnySelection ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                aria-label="Clear all hero selections"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            ) : null
          }
        />
        <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <HeroMultiSelect
            label="Our heroes"
            description="Heroes your team played"
            selected={selectedOurHeroes}
            available={data.allOurHeroes}
            onAdd={addOurHero}
            onRemove={removeOurHero}
            heroNames={heroNames}
            side="our"
          />

          <div className="hidden items-center self-stretch sm:flex">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              vs
            </span>
          </div>

          <HeroMultiSelect
            label="Enemy heroes"
            description="Heroes the opponent played"
            selected={selectedEnemyHeroes}
            available={data.allEnemyHeroes}
            onAdd={addEnemyHero}
            onRemove={removeEnemyHero}
            heroNames={heroNames}
            side="enemy"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Winrates · Matchup summary"
          title={hasAnySelection ? "Filtered matchup" : "Overall record"}
          description={
            hasAnySelection
              ? `Based on ${summary.gamesPlayed} matching map${summary.gamesPlayed === 1 ? "" : "s"}`
              : `Across all ${summary.gamesPlayed} tracked maps`
          }
        />
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            {summary.gamesPlayed > 0 ? (
              <MatchupSummaryDetail
                summary={summary}
                baseWinrate={baseWinrate}
                hasSelection={hasAnySelection}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {hasAnySelection
                  ? "No maps found for this matchup combination."
                  : "Select heroes above to explore matchup data."}
              </p>
            )}
          </div>
          <div className="lg:col-span-7">
            <MatchupTrendChart trendData={trendData} />
          </div>
        </div>
      </section>

      <BestCompositionsSection comps={bestComps} heroNames={heroNames} />

      <MatchupResultsTable maps={filteredMaps} heroNames={heroNames} />
    </div>
  );
}

type HeroMultiSelectProps = {
  label: string;
  description: string;
  selected: HeroName[];
  available: HeroName[];
  onAdd: (hero: HeroName) => void;
  onRemove: (hero: HeroName) => void;
  heroNames: Map<string, string>;
  side: "our" | "enemy";
};

function HeroMultiSelect({
  label,
  description,
  selected,
  available,
  onAdd,
  onRemove,
  heroNames,
  side,
}: HeroMultiSelectProps) {
  const emptySlots = 5 - selected.length;
  const accentVar = side === "our" ? "var(--team-1-off)" : "var(--team-2-off)";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className="font-mono text-[11px] tracking-[0.16em] uppercase"
          style={{ color: accentVar }}
        >
          {label}
        </span>
        {selected.length > 0 && (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            ({selected.length}/5)
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
        {selected.map((hero) => (
          <HeroSlot
            key={hero}
            hero={hero}
            heroNames={heroNames}
            onRemove={() => onRemove(hero)}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <HeroPickerSlot
            key={`empty-${selected.length + i}`} // oxlint-disable-line react/no-array-index-key
            available={available}
            excluded={[...selected]}
            selected={selected}
            heroNames={heroNames}
            onSelect={(hero) => onAdd(hero as HeroName)}
          />
        ))}
      </div>
    </div>
  );
}

type HeroSlotProps = {
  hero: string;
  heroNames: Map<string, string>;
  onRemove: () => void;
};

function HeroSlot({ hero, heroNames, onRemove }: HeroSlotProps) {
  const slug = toHero(hero);
  const displayName = heroNames.get(slug) ?? hero;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${displayName}`}
          className="group focus-visible:ring-destructive hover:ring-destructive/70 relative h-11 w-11 overflow-hidden rounded-md border border-transparent transition-all duration-150 ease-out hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          <Image
            src={`/heroes/${slug}.png`}
            alt={displayName}
            fill
            className="object-cover"
            sizes="44px"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="text-xs font-bold text-white">✕</span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {displayName} (click to remove)
      </TooltipContent>
    </Tooltip>
  );
}

const ROLE_LIMITS: Record<string, number> = {
  Tank: 1,
  Damage: 2,
  Support: 2,
};

type HeroPickerSlotProps = {
  available: HeroName[];
  excluded: string[];
  selected: HeroName[];
  heroNames: Map<string, string>;
  onSelect: (hero: string) => void;
};

function HeroPickerSlot({
  available,
  excluded,
  selected,
  heroNames,
  onSelect,
}: HeroPickerSlotProps) {
  const excludedSet = new Set(excluded);
  const pickable = available.filter((h) => !excludedSet.has(h));

  const selectedRoleCounts: Record<string, number> = {
    Tank: 0,
    Damage: 0,
    Support: 0,
  };
  for (const hero of selected) {
    const role = determineRole(hero);
    if (role in selectedRoleCounts) {
      selectedRoleCounts[role]++;
    }
  }

  const byRole: Record<string, HeroName[]> = {
    Tank: [],
    Damage: [],
    Support: [],
  };
  for (const hero of pickable) {
    const role = determineRole(hero);
    if (role === "Tank" || role === "Damage" || role === "Support") {
      byRole[role].push(hero);
    }
  }

  const roleFull: Record<string, boolean> = {
    Tank: selectedRoleCounts.Tank >= ROLE_LIMITS.Tank,
    Damage: selectedRoleCounts.Damage >= ROLE_LIMITS.Damage,
    Support: selectedRoleCounts.Support >= ROLE_LIMITS.Support,
  };

  const allRoles: ("Tank" | "Damage" | "Support")[] = [
    "Tank",
    "Damage",
    "Support",
  ];
  const roleOrder = allRoles.sort((a, b) => {
    if (roleFull[a] === roleFull[b]) return 0;
    return roleFull[a] ? 1 : -1;
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add hero"
          className={cn(
            "focus-visible:ring-ring border-border hover:border-muted-foreground/40 flex h-11 w-11 items-center justify-center rounded-md border-2 border-dashed transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="text-lg leading-none">+</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        aria-label="Hero picker"
      >
        <ScrollArea className="h-72">
          <div className="space-y-3 pr-2">
            {roleOrder.map((role) => {
              if (byRole[role].length === 0) return null;
              const isFull = roleFull[role];
              return (
                <div key={role} className={isFull ? "opacity-40" : ""}>
                  <p className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                    {role}
                    {isFull && (
                      <span className="ml-1 text-[10px] font-normal normal-case">
                        (full)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {byRole[role].map((hero) => {
                      const slug = toHero(hero);
                      const displayName = heroNames.get(slug) ?? hero;
                      return (
                        <Tooltip key={hero}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={
                                isFull
                                  ? `${displayName} (${role} slot full)`
                                  : `Select ${displayName}`
                              }
                              onClick={() => {
                                if (!isFull) onSelect(hero);
                              }}
                              disabled={isFull}
                              className={cn(
                                "group focus-visible:ring-ring relative h-9 w-9 overflow-hidden rounded transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:outline-none",
                                isFull
                                  ? "cursor-not-allowed grayscale"
                                  : "hover:scale-110 hover:shadow-md"
                              )}
                            >
                              <Image
                                src={`/heroes/${slug}.png`}
                                alt={displayName}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            {isFull
                              ? `${displayName} (${role} slot full)`
                              : displayName}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

type MatchupSummaryDetailProps = {
  summary: {
    wins: number;
    losses: number;
    winrate: number;
    gamesPlayed: number;
  };
  baseWinrate: number;
  hasSelection: boolean;
};

function MatchupSummaryDetail({
  summary,
  baseWinrate,
  hasSelection,
}: MatchupSummaryDetailProps) {
  const delta = summary.winrate - baseWinrate;
  const pct = summary.winrate.toFixed(1);

  const confidence =
    summary.gamesPlayed >= 5
      ? "high"
      : summary.gamesPlayed >= 3
        ? "medium"
        : "low";

  const confidenceTone: Record<string, string> = {
    high: "bg-primary/15 text-primary",
    medium: "bg-muted text-muted-foreground",
    low: "bg-destructive/15 text-destructive",
  };

  const confidenceLabel: Record<string, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span
          className="text-primary font-mono text-5xl leading-none font-semibold tabular-nums"
          aria-label={`Win rate: ${pct}%`}
        >
          {pct}%
        </span>
        <div className="space-y-1">
          <span
            className={cn(
              "inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
              confidenceTone[confidence]
            )}
          >
            {confidenceLabel[confidence]}
          </span>
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {summary.wins}W / {summary.losses}L ({summary.gamesPlayed} maps)
          </p>
        </div>
      </div>

      {hasSelection && (
        <div className="text-muted-foreground flex items-start gap-2 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-foreground">
            {Math.abs(delta) < 1
              ? "Roughly equal to your base winrate"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}pp ${delta > 0 ? "above" : "below"} base (${baseWinrate.toFixed(0)}%)`}
          </span>
        </div>
      )}
    </div>
  );
}

type TrendDataPoint = {
  period: string;
  runningWinrate: number;
  trendLine: number;
  scrimWinrate: number;
  scrimWins: number;
  scrimLosses: number;
  scrimName: string;
  totalWins: number;
  totalLosses: number;
};

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: TrendDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const isWinningScrim = payload.scrimWinrate > 50;
  const isSplit = payload.scrimWinrate === 50;
  const fill = isSplit
    ? "var(--muted-foreground)"
    : isWinningScrim
      ? "var(--primary)"
      : "var(--destructive)";
  return (
    <circle cx={cx} cy={cy} r={5} fill={fill} stroke={fill} strokeWidth={1.5} />
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    const data = payload[0].payload as TrendDataPoint;
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm">
          Cumulative:{" "}
          <span className="font-bold">{data.runningWinrate.toFixed(1)}%</span>
          <span className="text-muted-foreground ml-1 text-xs">
            ({data.totalWins}W / {data.totalLosses}L)
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {data.scrimName}: {data.scrimWins}W / {data.scrimLosses}L (
          {data.scrimWinrate.toFixed(0)}%)
        </p>
      </div>
    );
  }
  return null;
}

type MatchupTrendChartProps = {
  trendData: TrendDataPoint[];
};

function MatchupTrendChart({ trendData }: MatchupTrendChartProps) {
  const hasEnoughData = trendData.length >= 2;

  const currentWinrate =
    trendData.length > 0 ? trendData[trendData.length - 1].runningWinrate : 0;

  const trend =
    trendData.length >= 2
      ? trendData[trendData.length - 1].trendLine - trendData[0].trendLine
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          Cumulative winrate trend
        </p>
        {hasEnoughData && (
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            Now {currentWinrate.toFixed(1)}%{" "}
            <span
              className={
                trend > 0 ? "text-primary" : trend < 0 ? "text-destructive" : ""
              }
            >
              ({trend > 0 ? "+" : ""}
              {trend.toFixed(1)}pp trending)
            </span>
          </p>
        )}
      </div>
      {hasEnoughData ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={trendData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{
                fontSize: 10,
                fill: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              stroke="var(--border)"
            />
            <YAxis
              domain={[0, 100]}
              tick={{
                fontSize: 10,
                fill: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              stroke="var(--border)"
              label={{
                value: "Win %",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                },
              }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={() => 50}
              stroke="var(--muted-foreground)"
              strokeDasharray="5 5"
              strokeWidth={1}
              name="50%"
              dot={false}
            />
            <Line
              type="linear"
              dataKey="trendLine"
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeOpacity={0.5}
              strokeDasharray="8 4"
              name="Trend"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="runningWinrate"
              stroke="var(--chart-1)"
              strokeWidth={2}
              name="Cumulative Winrate"
              dot={<CustomDot />}
              activeDot={{ r: 7, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-muted-foreground text-sm">
          Not enough data to show a trend. Need at least 2 scrims.
        </p>
      )}
    </div>
  );
}

type CompEntry = {
  heroes: HeroName[];
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

type BestCompositionsSectionProps = {
  comps: CompEntry[];
  heroNames: Map<string, string>;
};

function BestCompositionsSection({
  comps,
  heroNames,
}: BestCompositionsSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Winrates · Compositions"
        title="Best compositions"
        description="Top performing five-stacks for this matchup (min. 2 games)."
      />
      {comps.length > 0 ? (
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm" aria-label="Best compositions">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="w-12 px-4 py-2 text-left font-medium">Rank</th>
                <th className="px-4 py-2 text-left font-medium">Composition</th>
                <th className="px-4 py-2 text-right font-medium">Winrate</th>
                <th className="px-4 py-2 text-right font-medium">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {comps.map((comp, i) => (
                <tr
                  key={comp.heroes.join(",")}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                    #{i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {comp.heroes.map((hero) => {
                        const slug = toHero(hero);
                        const displayName = heroNames.get(slug) ?? hero;
                        return (
                          <Tooltip key={hero}>
                            <TooltipTrigger asChild>
                              <div className="border-border relative h-7 w-7 overflow-hidden rounded border">
                                <Image
                                  src={`/heroes/${slug}.png`}
                                  alt={displayName}
                                  fill
                                  className="object-cover"
                                  sizes="28px"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              {displayName}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                      comp.winrate >= 60 && "text-primary",
                      comp.winrate <= 40 && "text-destructive"
                    )}
                  >
                    {comp.winrate.toFixed(0)}%
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                    {comp.wins}W / {comp.losses}L
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Not enough data to identify top compositions.
        </p>
      )}
    </section>
  );
}

type MatchupResultsTableProps = {
  maps: MatchupMapResult[];
  heroNames: Map<string, string>;
};

function MatchupResultsTable({ maps, heroNames }: MatchupResultsTableProps) {
  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Winrates · Match results"
        title="Match results"
        description="Individual map outcomes for this matchup."
      />
      {maps.length > 0 ? (
        <ScrollArea className="h-[420px]">
          <div className="border-border overflow-hidden rounded-md border">
            <table className="w-full text-sm" role="table">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Scrim</th>
                  <th className="px-4 py-2 text-left font-medium">Map</th>
                  <th className="px-4 py-2 text-left font-medium">Result</th>
                  <th
                    className="px-4 py-2 text-left font-medium"
                    style={{ color: "var(--team-1-off)" }}
                  >
                    Our heroes
                  </th>
                  <th
                    className="px-4 py-2 text-left font-medium"
                    style={{ color: "var(--team-2-off)" }}
                  >
                    Enemy heroes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {maps.map((map) => (
                  <tr
                    key={map.mapDataId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                      {formatDate(map.date)}
                    </td>
                    <td className="text-foreground max-w-[140px] truncate px-4 py-3">
                      {map.scrimName}
                    </td>
                    <td className="text-foreground px-4 py-3">{map.mapName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
                          map.isWin
                            ? "bg-primary/15 text-primary"
                            : "bg-destructive/15 text-destructive"
                        )}
                      >
                        {map.isWin ? "W" : "L"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <HeroImageRow
                        heroes={map.ourHeroes.map((h) => h.heroName)}
                        heroNames={heroNames}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <HeroImageRow
                        heroes={map.enemyHeroes.map((h) => h.heroName)}
                        heroNames={heroNames}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      ) : (
        <p className="text-muted-foreground text-sm">No matching maps found.</p>
      )}
    </section>
  );
}

type HeroImageRowProps = {
  heroes: string[];
  heroNames: Map<string, string>;
};

function HeroImageRow({ heroes, heroNames }: HeroImageRowProps) {
  return (
    <div className="flex gap-0.5">
      {heroes.map((hero) => {
        const slug = toHero(hero);
        const displayName = heroNames.get(slug) ?? hero;
        return (
          <Tooltip key={hero}>
            <TooltipTrigger asChild>
              <div className="border-border relative h-6 w-6 overflow-hidden rounded border">
                <Image
                  src={`/heroes/${slug}.png`}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{displayName}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function computePerMapTrend(maps: MatchupMapResult[]): TrendDataPoint[] {
  if (maps.length === 0) return [];

  const scrimMap = new Map<
    string,
    { date: Date; scrimName: string; wins: number; losses: number }
  >();

  for (const map of maps) {
    const date = new Date(map.date);
    const dayKey = `${date.toISOString().slice(0, 10)}|${map.scrimName}`;

    if (!scrimMap.has(dayKey)) {
      scrimMap.set(dayKey, {
        date,
        scrimName: map.scrimName,
        wins: 0,
        losses: 0,
      });
    }

    const scrim = scrimMap.get(dayKey)!;
    if (map.isWin) {
      scrim.wins++;
    } else {
      scrim.losses++;
    }
  }

  const scrims = Array.from(scrimMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let totalWins = 0;
  let totalLosses = 0;
  const runningWinrates: number[] = [];

  for (const scrim of scrims) {
    totalWins += scrim.wins;
    totalLosses += scrim.losses;
    const total = totalWins + totalLosses;
    runningWinrates.push(total > 0 ? (totalWins / total) * 100 : 0);
  }

  const trendValues = linearRegression(runningWinrates);

  totalWins = 0;
  totalLosses = 0;

  return scrims.map((scrim, i) => {
    totalWins += scrim.wins;
    totalLosses += scrim.losses;
    const scrimTotal = scrim.wins + scrim.losses;

    return {
      period: scrim.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      runningWinrate: runningWinrates[i],
      trendLine: trendValues[i],
      scrimWinrate: scrimTotal > 0 ? (scrim.wins / scrimTotal) * 100 : 0,
      scrimWins: scrim.wins,
      scrimLosses: scrim.losses,
      scrimName: scrim.scrimName,
      totalWins,
      totalLosses,
    };
  });
}

function linearRegression(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return values.map((_, i) =>
    Math.max(0, Math.min(100, intercept + slope * i))
  );
}

function computeBestCompositions(maps: MatchupMapResult[]): CompEntry[] {
  const compMap = new Map<
    string,
    { heroes: HeroName[]; wins: number; losses: number }
  >();

  for (const map of maps) {
    const heroNames = map.ourHeroes.map((h) => h.heroName).sort();
    const key = heroNames.join(",");

    if (!compMap.has(key)) {
      compMap.set(key, { heroes: heroNames, wins: 0, losses: 0 });
    }

    const entry = compMap.get(key)!;
    if (map.isWin) {
      entry.wins++;
    } else {
      entry.losses++;
    }
  }

  return Array.from(compMap.values())
    .filter((c) => c.wins + c.losses >= 2)
    .map((c) => ({
      ...c,
      winrate: (c.wins / (c.wins + c.losses)) * 100,
      gamesPlayed: c.wins + c.losses,
    }))
    .sort((a, b) => b.winrate - a.winrate || b.gamesPlayed - a.gamesPlayed)
    .slice(0, 5);
}

type OrientationStats = {
  scrimCount: number;
  compositionCount: number;
  best: { label: string; winrate: number; games: number } | null;
  worst: { label: string; winrate: number; games: number } | null;
};

function computeOrientationStats(maps: MatchupMapResult[]): OrientationStats {
  const scrimSet = new Set<string>();
  const compMap = new Map<string, { wins: number; losses: number }>();
  const enemyHeroAgg = new Map<string, { wins: number; losses: number }>();

  for (const map of maps) {
    const scrimKey = `${new Date(map.date).toISOString().slice(0, 10)}|${map.scrimName}`;
    scrimSet.add(scrimKey);

    const compKey = map.ourHeroes
      .map((h) => h.heroName)
      .sort()
      .join(",");
    if (!compMap.has(compKey)) {
      compMap.set(compKey, { wins: 0, losses: 0 });
    }
    const compEntry = compMap.get(compKey)!;
    if (map.isWin) compEntry.wins++;
    else compEntry.losses++;

    for (const enemyHero of map.enemyHeroes) {
      const key = enemyHero.heroName;
      if (!enemyHeroAgg.has(key)) {
        enemyHeroAgg.set(key, { wins: 0, losses: 0 });
      }
      const entry = enemyHeroAgg.get(key)!;
      if (map.isWin) entry.wins++;
      else entry.losses++;
    }
  }

  const enemyHeroEntries = Array.from(enemyHeroAgg.entries())
    .map(([heroName, e]) => ({
      heroName,
      wins: e.wins,
      losses: e.losses,
      games: e.wins + e.losses,
      winrate: (e.wins / (e.wins + e.losses)) * 100 || 0,
    }))
    .filter((e) => e.games >= 3);

  const best =
    enemyHeroEntries.length > 0
      ? enemyHeroEntries.reduce((a, b) => (b.winrate > a.winrate ? b : a))
      : null;
  const worst =
    enemyHeroEntries.length > 0
      ? enemyHeroEntries.reduce((a, b) => (b.winrate < a.winrate ? b : a))
      : null;

  return {
    scrimCount: scrimSet.size,
    compositionCount: compMap.size,
    best: best
      ? {
          label: `vs ${best.heroName} (${best.games}m)`,
          winrate: best.winrate,
          games: best.games,
        }
      : null,
    worst:
      worst && worst !== best
        ? {
            label: `vs ${worst.heroName} (${worst.games}m)`,
            winrate: worst.winrate,
            games: worst.games,
          }
        : null,
  };
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
