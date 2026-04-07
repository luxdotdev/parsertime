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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import type { SimulatorContext } from "@/data/team-prediction-dto";
import { determineRole } from "@/lib/player-table-data";
import {
  computePrediction,
  type PredictionResult,
  type PredictionScenario,
} from "@/lib/prediction-engine";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Info,
  RotateCcw,
  ShieldOff,
  Swords,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useReducer, useState } from "react";

type SimulatorTabProps = {
  ctx: SimulatorContext;
};

const EMPTY_SCENARIO: PredictionScenario = {
  enemyBansAgainstUs: [],
  ourBans: [],
  selectedMap: null,
  ourComposition: [],
  enemyComposition: [],
};

type ScenarioAction =
  | { type: "ADD_ENEMY_BAN"; hero: string }
  | { type: "REMOVE_ENEMY_BAN"; hero: string }
  | { type: "ADD_OUR_BAN"; hero: string }
  | { type: "REMOVE_OUR_BAN"; hero: string }
  | { type: "SET_MAP"; map: string | null }
  | { type: "ADD_COMP_HERO"; hero: string }
  | { type: "REMOVE_COMP_HERO"; hero: string }
  | { type: "ADD_ENEMY_COMP_HERO"; hero: string }
  | { type: "REMOVE_ENEMY_COMP_HERO"; hero: string }
  | { type: "RESET" };

function scenarioReducer(
  state: PredictionScenario,
  action: ScenarioAction
): PredictionScenario {
  switch (action.type) {
    case "ADD_ENEMY_BAN":
      if (state.enemyBansAgainstUs.length >= 4) return state;
      if (state.enemyBansAgainstUs.includes(action.hero)) return state;
      return {
        ...state,
        enemyBansAgainstUs: [...state.enemyBansAgainstUs, action.hero],
      };
    case "REMOVE_ENEMY_BAN":
      return {
        ...state,
        enemyBansAgainstUs: state.enemyBansAgainstUs.filter(
          (h) => h !== action.hero
        ),
      };
    case "ADD_OUR_BAN":
      if (state.ourBans.length >= 4) return state;
      if (state.ourBans.includes(action.hero)) return state;
      return { ...state, ourBans: [...state.ourBans, action.hero] };
    case "REMOVE_OUR_BAN":
      return {
        ...state,
        ourBans: state.ourBans.filter((h) => h !== action.hero),
      };
    case "SET_MAP":
      return { ...state, selectedMap: action.map };
    case "ADD_COMP_HERO":
      if (state.ourComposition.length >= 5) return state;
      if (state.ourComposition.includes(action.hero)) return state;
      return {
        ...state,
        ourComposition: [...state.ourComposition, action.hero],
      };
    case "REMOVE_COMP_HERO":
      return {
        ...state,
        ourComposition: state.ourComposition.filter((h) => h !== action.hero),
      };
    case "ADD_ENEMY_COMP_HERO":
      if (state.enemyComposition.length >= 5) return state;
      if (state.enemyComposition.includes(action.hero)) return state;
      return {
        ...state,
        enemyComposition: [...state.enemyComposition, action.hero],
      };
    case "REMOVE_ENEMY_COMP_HERO":
      return {
        ...state,
        enemyComposition: state.enemyComposition.filter(
          (h) => h !== action.hero
        ),
      };
    case "RESET":
      return { ...EMPTY_SCENARIO };
  }
}

export function SimulatorTab({ ctx }: SimulatorTabProps) {
  const [scenario, dispatch] = useReducer(scenarioReducer, {
    ...EMPTY_SCENARIO,
  });

  const result = useMemo(
    () => computePrediction(ctx, scenario),
    [ctx, scenario]
  );

  const hasAnyInput =
    scenario.enemyBansAgainstUs.length > 0 ||
    scenario.ourBans.length > 0 ||
    scenario.selectedMap !== null ||
    scenario.ourComposition.length > 0 ||
    scenario.enemyComposition.length > 0;

  if (ctx.totalGames === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Win Probability Simulator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No game data available for the selected time period. Play some
            scrims to unlock the simulator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <ScenarioPanel
          ctx={ctx}
          scenario={scenario}
          dispatch={dispatch}
          hasAnyInput={hasAnyInput}
        />
        <PredictionResultCard
          result={result}
          ctx={ctx}
          hasInput={hasAnyInput}
        />
      </div>
    </div>
  );
}

type ScenarioPanelProps = {
  ctx: SimulatorContext;
  scenario: PredictionScenario;
  dispatch: React.Dispatch<ScenarioAction>;
  hasAnyInput: boolean;
};

function ScenarioPanel({
  ctx,
  scenario,
  dispatch,
  hasAnyInput,
}: ScenarioPanelProps) {
  const heroNames = useHeroNames();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Scenario Setup</CardTitle>
            <CardDescription className="mt-1">
              Configure bans, map, and composition to see how your estimated win
              rate changes.
            </CardDescription>
          </div>
          {hasAnyInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "RESET" })}
              className="shrink-0"
              aria-label="Reset all scenario inputs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <BanSection
          label="Enemy bans against us"
          description="Heroes the opponent is banning from your pool"
          icon={<ShieldOff className="h-4 w-4 text-red-500" />}
          selected={scenario.enemyBansAgainstUs}
          onAdd={(hero) => dispatch({ type: "ADD_ENEMY_BAN", hero })}
          onRemove={(hero) => dispatch({ type: "REMOVE_ENEMY_BAN", hero })}
          available={ctx.availableHeroes}
          excluded={[...scenario.ourBans, ...scenario.ourComposition]}
          heroNames={heroNames}
          maxSlots={4}
          colorClass="border-red-500/30 bg-red-500/5"
          emptySlotClass="border-red-300/40 hover:border-red-400/60"
        />

        <BanSection
          label="Our bans"
          description="Heroes you are banning from the opponent"
          icon={<Swords className="h-4 w-4 text-blue-500" />}
          selected={scenario.ourBans}
          onAdd={(hero) => dispatch({ type: "ADD_OUR_BAN", hero })}
          onRemove={(hero) => dispatch({ type: "REMOVE_OUR_BAN", hero })}
          available={ctx.availableHeroes}
          excluded={[
            ...scenario.enemyBansAgainstUs,
            ...scenario.ourComposition,
          ]}
          heroNames={heroNames}
          maxSlots={4}
          colorClass="border-blue-500/30 bg-blue-500/5"
          emptySlotClass="border-blue-300/40 hover:border-blue-400/60"
        />

        <Separator />

        <MapCombobox
          availableMaps={ctx.availableMaps}
          selectedMap={scenario.selectedMap}
          onSelect={(map) => dispatch({ type: "SET_MAP", map })}
        />

        <Separator />

        <CompositionSection
          label="Our composition"
          description="Select up to 5 heroes for your team"
          selected={scenario.ourComposition}
          onAdd={(hero) => dispatch({ type: "ADD_COMP_HERO", hero })}
          onRemove={(hero) => dispatch({ type: "REMOVE_COMP_HERO", hero })}
          available={ctx.availableHeroes}
          excluded={[...scenario.enemyBansAgainstUs, ...scenario.ourBans]}
          heroNames={heroNames}
        />

        <Separator />

        <CompositionSection
          label="Enemy composition"
          description="Select up to 5 heroes for the enemy team"
          selected={scenario.enemyComposition}
          onAdd={(hero) => dispatch({ type: "ADD_ENEMY_COMP_HERO", hero })}
          onRemove={(hero) =>
            dispatch({ type: "REMOVE_ENEMY_COMP_HERO", hero })
          }
          available={ctx.availableHeroes}
          excluded={[...scenario.enemyBansAgainstUs, ...scenario.ourBans]}
          heroNames={heroNames}
          colorClass="border-red-500/20 bg-red-500/5"
        />
      </CardContent>
    </Card>
  );
}

type BanSectionProps = {
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: string[];
  onAdd: (hero: string) => void;
  onRemove: (hero: string) => void;
  available: HeroName[];
  excluded: string[];
  heroNames: Map<string, string>;
  maxSlots: number;
  colorClass: string;
  emptySlotClass: string;
};

function BanSection({
  label,
  description,
  icon,
  selected,
  onAdd,
  onRemove,
  available,
  excluded,
  heroNames,
  maxSlots,
  colorClass,
  emptySlotClass,
}: BanSectionProps) {
  const emptySlots = maxSlots - selected.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium">{label}</span>
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
          // oxlint-disable-next-line react/no-array-index-key -- empty placeholder slots have no unique data
          <HeroPickerSlot
            key={`empty-slot-${selected.length + i}`}
            available={available}
            excluded={[...excluded, ...selected]}
            heroNames={heroNames}
            onSelect={onAdd}
            emptySlotClass={emptySlotClass}
          />
        ))}
      </div>
    </div>
  );
}

type CompositionSectionProps = {
  label: string;
  description: string;
  selected: string[];
  onAdd: (hero: string) => void;
  onRemove: (hero: string) => void;
  available: HeroName[];
  excluded: string[];
  heroNames: Map<string, string>;
  colorClass?: string;
};

function CompositionSection({
  label,
  description,
  selected,
  onAdd,
  onRemove,
  available,
  excluded,
  heroNames,
  colorClass,
}: CompositionSectionProps) {
  const emptySlots = 5 - selected.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">
          ({selected.length}/5)
        </span>
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
          // oxlint-disable-next-line react/no-array-index-key -- empty placeholder slots have no unique data
          <HeroPickerSlot
            key={`empty-slot-${selected.length + i}`}
            available={available}
            excluded={[...excluded, ...selected]}
            heroNames={heroNames}
            onSelect={onAdd}
            emptySlotClass="hover:border-muted-foreground/40"
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

type HeroPickerSlotProps = {
  available: HeroName[];
  excluded: string[];
  heroNames: Map<string, string>;
  onSelect: (hero: string) => void;
  emptySlotClass: string;
};

function HeroPickerSlot({
  available,
  excluded,
  heroNames,
  onSelect,
  emptySlotClass,
}: HeroPickerSlotProps) {
  const excludedSet = new Set(excluded);
  const pickable = available.filter((h) => !excludedSet.has(h));

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
            {(["Tank", "Damage", "Support"] as const).map((role) => {
              if (byRole[role].length === 0) return null;
              return (
                <div key={role}>
                  <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                    {role}
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
                              aria-label={`Select ${displayName}`}
                              onClick={() => onSelect(hero)}
                              className="group focus-visible:ring-ring relative h-9 w-9 overflow-hidden rounded transition-all duration-150 ease-out hover:scale-110 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
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
                            {displayName}
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

const MAP_TYPE_LABELS: Record<$Enums.MapType, string> = {
  Control: "Control",
  Escort: "Escort",
  Hybrid: "Hybrid",
  Flashpoint: "Flashpoint",
  Push: "Push",
  Clash: "Clash",
};

const MAP_TYPE_ORDER: $Enums.MapType[] = [
  $Enums.MapType.Control,
  $Enums.MapType.Escort,
  $Enums.MapType.Hybrid,
  $Enums.MapType.Flashpoint,
  $Enums.MapType.Push,
  $Enums.MapType.Clash,
];

type MapComboboxProps = {
  availableMaps: string[];
  selectedMap: string | null;
  onSelect: (map: string | null) => void;
};

function MapCombobox({
  availableMaps,
  selectedMap,
  onSelect,
}: MapComboboxProps) {
  const [open, setOpen] = useState(false);

  const byType = useMemo(() => {
    const groups = new Map<$Enums.MapType, string[]>();
    for (const map of availableMaps) {
      const type =
        mapNameToMapTypeMapping[map as keyof typeof mapNameToMapTypeMapping];
      if (!type) continue;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(map);
    }
    for (const maps of groups.values()) {
      maps.sort();
    }
    return groups;
  }, [availableMaps]);

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Map</span>
      <p className="text-muted-foreground text-xs">
        Select the map being played
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls="map-combobox-listbox"
            aria-label="Select a map"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{selectedMap ?? "Select a map…"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search maps…" />
            <CommandList id="map-combobox-listbox">
              <CommandEmpty>No maps found.</CommandEmpty>
              <CommandItem
                value="none"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedMap === null ? "opacity-100" : "opacity-0"
                  )}
                />
                No map selected
              </CommandItem>
              {MAP_TYPE_ORDER.map((type) => {
                const maps = byType.get(type);
                if (!maps || maps.length === 0) return null;
                return (
                  <CommandGroup key={type} heading={MAP_TYPE_LABELS[type]}>
                    {maps.map((map) => (
                      <CommandItem
                        key={map}
                        value={map}
                        onSelect={(val) => {
                          onSelect(val === selectedMap ? null : val);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedMap === map ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {map}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type PredictionResultCardProps = {
  result: PredictionResult;
  ctx: SimulatorContext;
  hasInput: boolean;
};

function PredictionResultCard({
  result,
  ctx,
  hasInput,
}: PredictionResultCardProps) {
  const pct = (result.estimatedWinrate * 100).toFixed(1);
  const basePct = (ctx.baseWinrate * 100).toFixed(1);
  const delta = result.estimatedWinrate - ctx.baseWinrate;
  const deltaSign = delta >= 0 ? "+" : "";

  const winrateColorClass =
    delta > 0.02
      ? "text-green-600 dark:text-green-400"
      : delta < -0.02
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Predicted Win Rate</CardTitle>
        <CardDescription>
          Based on your team&apos;s historical data across {ctx.totalGames} maps
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "leading-none font-bold tabular-nums",
              winrateColorClass,
              "text-5xl"
            )}
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-label={`Estimated win rate: ${pct}%`}
          >
            {pct}%
          </span>
          <div className="flex flex-col gap-1">
            <ConfidenceBadge confidence={result.confidence} />
            {hasInput && (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  delta > 0.005
                    ? "text-green-600 dark:text-green-400"
                    : delta < -0.005
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                )}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {deltaSign}
                {(delta * 100).toFixed(1)}% vs. base ({basePct}%)
              </span>
            )}
          </div>
        </div>

        {result.topInsight && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950/40">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-800 dark:text-blue-300">
              {result.topInsight}
            </span>
          </div>
        )}

        <BreakdownChart result={result} hasInput={hasInput} />

        {result.warnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Warnings
            </p>
            {result.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-1.5 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="text-muted-foreground">{warning}</span>
              </div>
            ))}
          </div>
        )}

        {!hasInput && (
          <p className="text-muted-foreground mt-auto text-center text-sm">
            Configure a scenario on the left to see how parameters affect your
            win probability.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "low" | "medium" | "high";
}) {
  const config = {
    high: { label: "High confidence", variant: "default" as const },
    medium: { label: "Medium confidence", variant: "secondary" as const },
    low: { label: "Low confidence", variant: "destructive" as const },
  };
  const { label, variant } = config[confidence];
  return <Badge variant={variant}>{label}</Badge>;
}

type BreakdownChartProps = {
  result: PredictionResult;
  hasInput: boolean;
};

const MAX_BAR_DELTA_PP = 30;

function BreakdownChart({ result, hasInput }: BreakdownChartProps) {
  const { breakdown } = result;

  const rows: {
    label: string;
    value: number;
    isBase?: boolean;
    icon?: React.ReactNode;
  }[] = [
    {
      label: "Base win rate",
      value: breakdown.baseWinrate,
      isBase: true,
    },
    {
      label: "Enemy ban impact",
      value: breakdown.banImpact,
      icon:
        breakdown.banImpact < -0.005 ? (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        ) : breakdown.banImpact > 0.005 ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : null,
    },
    {
      label: "Our bans",
      value: breakdown.ourBanImpact,
      icon:
        breakdown.ourBanImpact > 0.005 ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : null,
    },
    {
      label: "Map",
      value: breakdown.mapImpact,
      icon:
        breakdown.mapImpact > 0.005 ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : breakdown.mapImpact < -0.005 ? (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        ) : null,
    },
    {
      label: "Composition",
      value: breakdown.compositionImpact,
      icon:
        breakdown.compositionImpact > 0.005 ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : breakdown.compositionImpact < -0.005 ? (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        ) : null,
    },
    {
      label: "Enemy comp",
      value: breakdown.enemyCompositionImpact,
      icon:
        breakdown.enemyCompositionImpact > 0.005 ? (
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
        ) : breakdown.enemyCompositionImpact < -0.005 ? (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        ) : null,
    },
  ];

  const maxAbsDelta = Math.max(
    ...rows.filter((r) => !r.isBase).map((r) => Math.abs(r.value * 100))
  );
  const scale = Math.max(maxAbsDelta, 5);

  return (
    <div className="space-y-2.5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Breakdown
      </p>
      <div className="space-y-2" role="list" aria-label="Win rate breakdown">
        {rows.map((row) => {
          if (row.isBase) {
            return <BaseRow key={row.label} value={row.value} />;
          }

          const isActive = Math.abs(row.value) > 0.001;
          const isPositive = row.value >= 0;
          const barWidthPct = Math.min(
            (Math.abs(row.value * 100) / MAX_BAR_DELTA_PP) * 100,
            100
          );

          const isLargest =
            hasInput &&
            isActive &&
            Math.abs(row.value * 100) === maxAbsDelta &&
            maxAbsDelta > 2;

          return (
            <div
              key={row.label}
              role="listitem"
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150",
                isLargest &&
                  "bg-muted/50 ring-muted-foreground/20 ring-1 ring-inset"
              )}
            >
              <div className="flex w-28 shrink-0 items-center gap-1 text-xs">
                {row.icon}
                <span className="text-muted-foreground truncate">
                  {row.label}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isActive
                        ? isPositive
                          ? "bg-green-500"
                          : "bg-red-500"
                        : "bg-muted-foreground/30"
                    )}
                    style={{
                      width: isActive ? `${barWidthPct}%` : "2px",
                      transitionProperty: "width",
                      transitionDuration: "200ms",
                      transitionTimingFunction:
                        "cubic-bezier(0.165, 0.84, 0.44, 1)",
                    }}
                    aria-hidden="true"
                  />
                </div>
                <span
                  className={cn(
                    "w-14 text-right text-xs font-medium tabular-nums",
                    isActive
                      ? isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {isActive
                    ? `${isPositive ? "+" : ""}${(row.value * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        Bar scale: ±{Math.ceil(scale)}pp max. Bars are capped at ±
        {MAX_BAR_DELTA_PP}pp.
      </div>
    </div>
  );
}

function BaseRow({ value }: { value: number }) {
  return (
    <div
      role="listitem"
      className="flex items-center gap-2 rounded-md px-2 py-1.5"
    >
      <div className="text-muted-foreground w-28 shrink-0 text-xs">
        Base win rate
      </div>
      <div className="flex flex-1 items-center gap-2">
        <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-muted-foreground/50 h-full rounded-full"
            style={{ width: `${value * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <span
          className="text-muted-foreground w-14 text-right text-xs font-medium tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {(value * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
