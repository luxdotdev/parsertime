"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  MatchupMapResult,
  MatchupWinrateData,
} from "@/data/team-matchup-winrate-dto";
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
      <Card>
        <CardHeader>
          <CardTitle>Hero Matchup Winrates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No game data available for the selected time period. Play some
            scrims to unlock matchup analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <MatchupFilterPanel
        availableOurHeroes={data.allOurHeroes}
        availableEnemyHeroes={data.allEnemyHeroes}
        selectedOurHeroes={selectedOurHeroes}
        selectedEnemyHeroes={selectedEnemyHeroes}
        onAddOurHero={addOurHero}
        onRemoveOurHero={removeOurHero}
        onAddEnemyHero={addEnemyHero}
        onRemoveEnemyHero={removeEnemyHero}
        onClearAll={clearAll}
        hasAnySelection={hasAnySelection}
        heroNames={heroNames}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <MatchupSummaryCard
          summary={summary}
          baseWinrate={baseWinrate}
          hasSelection={hasAnySelection}
        />
        <MatchupTrendChart trendData={trendData} />
      </div>

      <BestCompositionsCard comps={bestComps} heroNames={heroNames} />

      <MatchupResultsTable maps={filteredMaps} heroNames={heroNames} />
    </div>
  );
}

// --- Filter Panel ---

type MatchupFilterPanelProps = {
  availableOurHeroes: HeroName[];
  availableEnemyHeroes: HeroName[];
  selectedOurHeroes: HeroName[];
  selectedEnemyHeroes: HeroName[];
  onAddOurHero: (hero: HeroName) => void;
  onRemoveOurHero: (hero: HeroName) => void;
  onAddEnemyHero: (hero: HeroName) => void;
  onRemoveEnemyHero: (hero: HeroName) => void;
  onClearAll: () => void;
  hasAnySelection: boolean;
  heroNames: Map<string, string>;
};

function MatchupFilterPanel({
  availableOurHeroes,
  availableEnemyHeroes,
  selectedOurHeroes,
  selectedEnemyHeroes,
  onAddOurHero,
  onRemoveOurHero,
  onAddEnemyHero,
  onRemoveEnemyHero,
  onClearAll,
  hasAnySelection,
  heroNames,
}: MatchupFilterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Hero Matchup Winrates</CardTitle>
            <CardDescription className="mt-1">
              Select heroes on each side to explore specific matchups. All
              selected heroes must be present in a map for it to count.
            </CardDescription>
          </div>
          {hasAnySelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="shrink-0"
              aria-label="Clear all hero selections"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <HeroMultiSelect
            label="Our Heroes"
            description="Heroes your team played"
            selected={selectedOurHeroes}
            available={availableOurHeroes}
            excluded={[]}
            onAdd={onAddOurHero}
            onRemove={onRemoveOurHero}
            heroNames={heroNames}
            colorClass="border-blue-500/30 bg-blue-500/5"
            emptySlotClass="border-blue-300/40 hover:border-blue-400/60"
          />

          <div className="hidden items-center sm:flex">
            <span className="text-muted-foreground text-sm font-semibold">
              vs
            </span>
          </div>
          <Separator className="sm:hidden" />

          <HeroMultiSelect
            label="Enemy Heroes"
            description="Heroes the opponent played"
            selected={selectedEnemyHeroes}
            available={availableEnemyHeroes}
            excluded={[]}
            onAdd={onAddEnemyHero}
            onRemove={onRemoveEnemyHero}
            heroNames={heroNames}
            colorClass="border-red-500/30 bg-red-500/5"
            emptySlotClass="border-red-300/40 hover:border-red-400/60"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Hero Multi-Select ---

type HeroMultiSelectProps = {
  label: string;
  description: string;
  selected: HeroName[];
  available: HeroName[];
  excluded: string[];
  onAdd: (hero: HeroName) => void;
  onRemove: (hero: HeroName) => void;
  heroNames: Map<string, string>;
  colorClass: string;
  emptySlotClass: string;
};

function HeroMultiSelect({
  label,
  description,
  selected,
  available,
  excluded,
  onAdd,
  onRemove,
  heroNames,
  colorClass,
  emptySlotClass,
}: HeroMultiSelectProps) {
  const emptySlots = 5 - selected.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        {selected.length > 0 && (
          <span className="text-muted-foreground text-xs">
            ({selected.length}/5)
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div
        className={cn("flex flex-wrap gap-2 rounded-md border p-2", colorClass)}
      >
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
            key={`empty-${selected.length + i}`}
            available={available}
            excluded={[...excluded, ...selected]}
            selected={selected}
            heroNames={heroNames}
            onSelect={(hero) => onAdd(hero as HeroName)}
            emptySlotClass={emptySlotClass}
          />
        ))}
      </div>
    </div>
  );
}

// --- Hero Slot (selected, removable) ---

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
          className="group relative h-11 w-11 overflow-hidden rounded-md border border-transparent transition-all duration-150 ease-out hover:ring-2 hover:ring-red-400/70 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
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
        {displayName} — click to remove
      </TooltipContent>
    </Tooltip>
  );
}

// --- Hero Picker Slot (empty, opens popover) ---

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
  emptySlotClass: string;
};

function HeroPickerSlot({
  available,
  excluded,
  selected,
  heroNames,
  onSelect,
  emptySlotClass,
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
            "focus-visible:ring-ring flex h-11 w-11 items-center justify-center rounded-md border-2 border-dashed transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
            "text-muted-foreground hover:text-foreground",
            emptySlotClass
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
                  <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
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
                              ? `${displayName} — ${role} slot full`
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

// --- Summary Card ---

type MatchupSummaryCardProps = {
  summary: {
    wins: number;
    losses: number;
    winrate: number;
    gamesPlayed: number;
  };
  baseWinrate: number;
  hasSelection: boolean;
};

function MatchupSummaryCard({
  summary,
  baseWinrate,
  hasSelection,
}: MatchupSummaryCardProps) {
  const delta = summary.winrate - baseWinrate;
  const pct = summary.winrate.toFixed(1);

  const winrateColorClass =
    summary.gamesPlayed === 0
      ? "text-foreground"
      : summary.winrate > 55
        ? "text-green-600 dark:text-green-400"
        : summary.winrate < 45
          ? "text-red-600 dark:text-red-400"
          : "text-foreground";

  const confidence =
    summary.gamesPlayed >= 5
      ? "high"
      : summary.gamesPlayed >= 3
        ? "medium"
        : "low";

  const confidenceConfig = {
    high: { label: "High confidence", variant: "default" as const },
    medium: { label: "Medium confidence", variant: "secondary" as const },
    low: { label: "Low confidence", variant: "destructive" as const },
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Matchup Summary</CardTitle>
        <CardDescription>
          {hasSelection
            ? `Based on ${summary.gamesPlayed} matching map${summary.gamesPlayed === 1 ? "" : "s"}`
            : `Overall record across ${summary.gamesPlayed} maps`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {summary.gamesPlayed > 0 ? (
          <>
            <div className="flex items-baseline gap-3">
              <span
                className={cn(
                  "text-5xl leading-none font-bold",
                  winrateColorClass
                )}
                style={{ fontVariantNumeric: "tabular-nums" }}
                aria-label={`Win rate: ${pct}%`}
              >
                {pct}%
              </span>
              <div className="flex flex-col gap-1">
                <Badge variant={confidenceConfig[confidence].variant}>
                  {confidenceConfig[confidence].label}
                </Badge>
                <span
                  className="text-muted-foreground text-sm tabular-nums"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {summary.wins}W – {summary.losses}L ({summary.gamesPlayed}{" "}
                  maps)
                </span>
              </div>
            </div>

            {hasSelection && (
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950/40">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-800 dark:text-blue-300">
                  {Math.abs(delta) < 1
                    ? "Roughly equal to your base winrate"
                    : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}pp ${delta > 0 ? "above" : "below"} your base winrate (${baseWinrate.toFixed(0)}%)`}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground mt-auto text-center text-sm">
            {hasSelection
              ? "No maps found for this matchup combination."
              : "Select heroes above to explore matchup data."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Trend Chart ---

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
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={isSplit ? "#94a3b8" : isWinningScrim ? "#22c55e" : "#ef4444"}
      stroke={isSplit ? "#64748b" : isWinningScrim ? "#16a34a" : "#dc2626"}
      strokeWidth={1.5}
    />
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
            ({data.totalWins}W – {data.totalLosses}L)
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {data.scrimName}: {data.scrimWins}W – {data.scrimLosses}L (
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
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Winrate Trend</CardTitle>
          {hasEnoughData && (
            <CardDescription className="mt-1">
              Current: {currentWinrate.toFixed(1)}%{" "}
              <span
                className={
                  trend > 0
                    ? "text-green-600 dark:text-green-400"
                    : trend < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }
              >
                ({trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} trending)
              </span>
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {hasEnoughData ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={trendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: "Win %",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={() => 50}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1}
                name="50%"
                dot={false}
              />
              <Line
                type="linear"
                dataKey="trendLine"
                stroke="#a78bfa"
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
                stroke="#3b82f6"
                strokeWidth={2}
                name="Cumulative Winrate"
                dot={<CustomDot />}
                activeDot={{ r: 7, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground mt-auto text-center text-sm">
            Not enough data to show a trend. Need at least 2 scrims.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Best Compositions ---

type CompEntry = {
  heroes: HeroName[];
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

type BestCompositionsCardProps = {
  comps: CompEntry[];
  heroNames: Map<string, string>;
};

function BestCompositionsCard({ comps, heroNames }: BestCompositionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Compositions</CardTitle>
        <CardDescription>
          Top performing team compositions for this matchup (min. 2 games)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {comps.length > 0 ? (
          <div className="space-y-2" role="list" aria-label="Best compositions">
            {comps.map((comp, i) => (
              <div
                key={comp.heroes.join(",")}
                role="listitem"
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <span className="text-muted-foreground w-6 shrink-0 text-sm font-semibold tabular-nums">
                  #{i + 1}
                </span>
                <div className="flex gap-1">
                  {comp.heroes.map((hero) => {
                    const slug = toHero(hero);
                    const displayName = heroNames.get(slug) ?? hero;
                    return (
                      <Tooltip key={hero}>
                        <TooltipTrigger asChild>
                          <div className="relative h-7 w-7 overflow-hidden rounded">
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
                <div className="ml-auto flex items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      comp.winrate > 55
                        ? "text-green-600 dark:text-green-400"
                        : comp.winrate < 45
                          ? "text-red-600 dark:text-red-400"
                          : "text-foreground"
                    )}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {comp.winrate.toFixed(0)}%
                  </span>
                  <span
                    className="text-muted-foreground text-xs tabular-nums"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {comp.wins}W-{comp.losses}L
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Not enough data to identify top compositions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Results Table ---

type MatchupResultsTableProps = {
  maps: MatchupMapResult[];
  heroNames: Map<string, string>;
};

function MatchupResultsTable({ maps, heroNames }: MatchupResultsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
        <CardDescription>
          Individual map outcomes for this matchup
        </CardDescription>
      </CardHeader>
      <CardContent>
        {maps.length > 0 ? (
          <ScrollArea className="h-[420px]">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="pr-3 pb-2 font-medium">Date</th>
                  <th className="pr-3 pb-2 font-medium">Scrim</th>
                  <th className="pr-3 pb-2 font-medium">Map</th>
                  <th className="pr-3 pb-2 font-medium">Result</th>
                  <th className="pr-3 pb-2 font-medium">Our Heroes</th>
                  <th className="pb-2 font-medium">Enemy Heroes</th>
                </tr>
              </thead>
              <tbody>
                {maps.map((map) => (
                  <tr key={map.mapDataId} className="border-b last:border-0">
                    <td
                      className="py-2 pr-3 tabular-nums"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDate(map.date)}
                    </td>
                    <td className="max-w-[120px] truncate py-2 pr-3">
                      {map.scrimName}
                    </td>
                    <td className="py-2 pr-3">{map.mapName}</td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant={map.isWin ? "default" : "destructive"}
                        className={
                          map.isWin
                            ? "bg-green-600 text-white dark:bg-green-700"
                            : ""
                        }
                      >
                        {map.isWin ? "W" : "L"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <HeroImageRow
                        heroes={map.ourHeroes.map((h) => h.heroName)}
                        heroNames={heroNames}
                      />
                    </td>
                    <td className="py-2">
                      <HeroImageRow
                        heroes={map.enemyHeroes.map((h) => h.heroName)}
                        heroNames={heroNames}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-sm">
            No matching maps found.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Hero Image Row (compact, for tables) ---

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
              <div className="relative h-6 w-6 overflow-hidden rounded">
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

// --- Utility Functions ---

function computePerMapTrend(maps: MatchupMapResult[]): TrendDataPoint[] {
  if (maps.length === 0) return [];

  // Group maps by scrim (using scrimName + date as key)
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

  // Build cumulative running winrate
  let totalWins = 0;
  let totalLosses = 0;
  const runningWinrates: number[] = [];

  for (const scrim of scrims) {
    totalWins += scrim.wins;
    totalLosses += scrim.losses;
    const total = totalWins + totalLosses;
    runningWinrates.push(total > 0 ? (totalWins / total) * 100 : 0);
  }

  // Linear regression on running winrate for trend direction
  const trendValues = linearRegression(runningWinrates);

  // Reset running totals for building the final data
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

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
