"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SimulatorContext } from "@/data/team/types";
import { determineRole } from "@/lib/player-table-data";
import {
  computePrediction,
  type PredictionMessage,
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
import { useFormatter, useTranslations } from "next-intl";
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
  const t = useTranslations("teamStatsPage.simulatorTab");
  const formatter = useFormatter();
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
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("header.eyebrow")}
          title={t("header.title")}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const basePct = formatter.number(ctx.baseWinrate, {
    style: "percent",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

  return (
    <div className="space-y-12">
      <StatRibbon
        cells={[
          {
            label: t("stats.mapsTracked"),
            value: String(ctx.totalGames),
            sub: t("stats.historicalSample"),
            emphasis: true,
          },
          {
            label: t("stats.baseWinrate"),
            value: basePct,
            sub: t("stats.beforeScenario"),
          },
          {
            label: t("stats.heroesScored"),
            value: String(ctx.availableHeroes.length),
            sub: t("stats.availablePicks"),
          },
          {
            label: t("stats.mapsScored"),
            value: String(ctx.availableMaps.length),
            sub: t("stats.availablePicks"),
          },
        ]}
        columns={4}
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ScenarioPanel
            ctx={ctx}
            scenario={scenario}
            dispatch={dispatch}
            hasAnyInput={hasAnyInput}
          />
        </div>
        <div className="lg:col-span-5">
          <PredictionResultPanel
            result={result}
            ctx={ctx}
            hasInput={hasAnyInput}
          />
        </div>
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
  const t = useTranslations("teamStatsPage.simulatorTab.scenario");
  const heroNames = useHeroNames();

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        rightSlot={
          hasAnyInput ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "RESET" })}
              aria-label={t("resetAria")}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("reset")}
            </Button>
          ) : null
        }
      />
      <div className="space-y-6">
        <BanSection
          label={t("enemyBans.label")}
          description={t("enemyBans.description")}
          icon={<ShieldOff className="text-muted-foreground h-4 w-4" />}
          selected={scenario.enemyBansAgainstUs}
          onAdd={(hero) => dispatch({ type: "ADD_ENEMY_BAN", hero })}
          onRemove={(hero) => dispatch({ type: "REMOVE_ENEMY_BAN", hero })}
          available={ctx.availableHeroes}
          excluded={[...scenario.ourBans, ...scenario.ourComposition]}
          heroNames={heroNames}
          maxSlots={4}
        />

        <BanSection
          label={t("ourBans.label")}
          description={t("ourBans.description")}
          icon={<Swords className="text-muted-foreground h-4 w-4" />}
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
        />

        <MapCombobox
          availableMaps={ctx.availableMaps}
          selectedMap={scenario.selectedMap}
          onSelect={(map) => dispatch({ type: "SET_MAP", map })}
        />

        <CompositionSection
          label={t("ourComposition.label")}
          description={t("ourComposition.description")}
          selected={scenario.ourComposition}
          onAdd={(hero) => dispatch({ type: "ADD_COMP_HERO", hero })}
          onRemove={(hero) => dispatch({ type: "REMOVE_COMP_HERO", hero })}
          available={ctx.availableHeroes}
          excluded={[...scenario.enemyBansAgainstUs, ...scenario.ourBans]}
          heroNames={heroNames}
        />

        <CompositionSection
          label={t("enemyComposition.label")}
          description={t("enemyComposition.description")}
          selected={scenario.enemyComposition}
          onAdd={(hero) => dispatch({ type: "ADD_ENEMY_COMP_HERO", hero })}
          onRemove={(hero) =>
            dispatch({ type: "REMOVE_ENEMY_COMP_HERO", hero })
          }
          available={ctx.availableHeroes}
          excluded={[...scenario.enemyBansAgainstUs, ...scenario.ourBans]}
          heroNames={heroNames}
        />
      </div>
    </section>
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
}: BanSectionProps) {
  const emptySlots = maxSlots - selected.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase">
          {label}
        </span>
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
            key={`empty-slot-${selected.length + i}`} // oxlint-disable-line react/no-array-index-key
            available={available}
            excluded={[...excluded, ...selected]}
            heroNames={heroNames}
            onSelect={onAdd}
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
}: CompositionSectionProps) {
  const emptySlots = 5 - selected.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase">
          {label}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          ({selected.length}/5)
        </span>
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
            key={`empty-slot-${selected.length + i}`} // oxlint-disable-line react/no-array-index-key
            available={available}
            excluded={[...excluded, ...selected]}
            heroNames={heroNames}
            onSelect={onAdd}
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
  const t = useTranslations("teamStatsPage.simulatorTab.heroPicker");
  const slug = toHero(hero);
  const displayName = heroNames.get(slug) ?? hero;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeHero", { hero: displayName })}
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
        {t("removeTooltip", { hero: displayName })}
      </TooltipContent>
    </Tooltip>
  );
}

type HeroPickerSlotProps = {
  available: HeroName[];
  excluded: string[];
  heroNames: Map<string, string>;
  onSelect: (hero: string) => void;
};

function HeroPickerSlot({
  available,
  excluded,
  heroNames,
  onSelect,
}: HeroPickerSlotProps) {
  const t = useTranslations("teamStatsPage.simulatorTab.heroPicker");
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
          aria-label={t("addHero")}
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
        aria-label={t("label")}
      >
        <ScrollArea className="h-72">
          <div className="space-y-3 pr-2">
            {(["Tank", "Damage", "Support"] as const).map((role) => {
              if (byRole[role].length === 0) return null;
              return (
                <div key={role}>
                  <p className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                    {t(`roles.${role}`)}
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
                              aria-label={t("selectHero", {
                                hero: displayName,
                              })}
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
  const t = useTranslations("teamStatsPage.simulatorTab.mapPicker");
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
      <span className="font-mono text-[11px] tracking-[0.16em] uppercase">
        {t("label")}
      </span>
      <p className="text-muted-foreground text-xs">{t("description")}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls="map-combobox-listbox"
            aria-label={t("selectAria")}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{selectedMap ?? t("placeholder")}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={t("searchPlaceholder")} />
            <CommandList id="map-combobox-listbox">
              <CommandEmpty>{t("noMapsFound")}</CommandEmpty>
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
                {t("noneSelected")}
              </CommandItem>
              {MAP_TYPE_ORDER.map((type) => {
                const maps = byType.get(type);
                if (!maps || maps.length === 0) return null;
                return (
                  <CommandGroup key={type} heading={t(`mapTypes.${type}`)}>
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

type PredictionResultPanelProps = {
  result: PredictionResult;
  ctx: SimulatorContext;
  hasInput: boolean;
};

function PredictionResultPanel({
  result,
  ctx,
  hasInput,
}: PredictionResultPanelProps) {
  const t = useTranslations("teamStatsPage.simulatorTab.prediction");
  const formatter = useFormatter();
  const pct = formatter.number(result.estimatedWinrate, {
    style: "percent",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const basePct = formatter.number(ctx.baseWinrate, {
    style: "percent",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const delta = result.estimatedWinrate - ctx.baseWinrate;
  const deltaPct = formatter.number(Math.abs(delta) * 100, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

  const confidenceTone: Record<string, string> = {
    high: "bg-primary/15 text-primary",
    medium: "bg-muted text-muted-foreground",
    low: "bg-destructive/15 text-destructive",
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", { count: ctx.totalGames })}
      />
      <div className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span
            className="text-primary font-mono text-5xl leading-none font-semibold tabular-nums"
            aria-label={t("estimatedWinRateAria", { value: pct })}
          >
            {pct}
          </span>
          <div className="space-y-1">
            <span
              className={cn(
                "inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
                confidenceTone[result.confidence]
              )}
            >
              {t(`confidence.${result.confidence}`)}
            </span>
            {hasInput && (
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                {t("deltaVsBase", {
                  direction: delta >= 0 ? "positive" : "negative",
                  delta: deltaPct,
                  base: basePct,
                })}
              </p>
            )}
          </div>
        </div>

        {result.topInsight && (
          <div className="text-muted-foreground flex items-start gap-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="text-foreground">
              {renderPredictionInsight(t, result.topInsight)}
            </span>
          </div>
        )}
      </div>

      <BreakdownTable result={result} hasInput={hasInput} />

      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("warningsLabel")}
          </p>
          <ul className="space-y-1.5">
            {result.warnings.map((warning) => (
              <li
                key={`${warning.key}-${Object.values(warning.values).join("-")}`}
                className="flex items-start gap-1.5 text-xs"
              >
                <AlertTriangle className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="text-muted-foreground">
                  {formatPredictionWarning(t, warning)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasInput && (
        <p className="text-muted-foreground text-sm">{t("emptyScenario")}</p>
      )}
    </section>
  );
}

type BreakdownTableProps = {
  result: PredictionResult;
  hasInput: boolean;
};

const MAX_BAR_DELTA_PP = 30;

function BreakdownTable({ result, hasInput }: BreakdownTableProps) {
  const t = useTranslations("teamStatsPage.simulatorTab.breakdown");
  const formatter = useFormatter();
  const { breakdown } = result;

  const rows: {
    label: string;
    value: number;
    isBase?: boolean;
    icon?: React.ReactNode;
  }[] = [
    {
      label: t("baseWinrate"),
      value: breakdown.baseWinrate,
      isBase: true,
    },
    {
      label: t("enemyBanImpact"),
      value: breakdown.banImpact,
      icon:
        breakdown.banImpact < -0.005 ? (
          <TrendingDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : breakdown.banImpact > 0.005 ? (
          <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
        ) : null,
    },
    {
      label: t("ourBans"),
      value: breakdown.ourBanImpact,
      icon:
        breakdown.ourBanImpact > 0.005 ? (
          <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
        ) : null,
    },
    {
      label: t("map"),
      value: breakdown.mapImpact,
      icon:
        breakdown.mapImpact > 0.005 ? (
          <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
        ) : breakdown.mapImpact < -0.005 ? (
          <TrendingDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : null,
    },
    {
      label: t("composition"),
      value: breakdown.compositionImpact,
      icon:
        breakdown.compositionImpact > 0.005 ? (
          <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
        ) : breakdown.compositionImpact < -0.005 ? (
          <TrendingDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : null,
    },
    {
      label: t("enemyComp"),
      value: breakdown.enemyCompositionImpact,
      icon:
        breakdown.enemyCompositionImpact > 0.005 ? (
          <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
        ) : breakdown.enemyCompositionImpact < -0.005 ? (
          <TrendingDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : null,
    },
  ];

  const maxAbsDelta = Math.max(
    ...rows.filter((r) => !r.isBase).map((r) => Math.abs(r.value * 100))
  );
  const scale = Math.max(maxAbsDelta, 5);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
        {t("heading")}
      </p>
      <div className="space-y-1.5" role="list" aria-label={t("listAria")}>
        {rows.map((row) => {
          if (row.isBase) {
            return (
              <BaseRow key={row.label} label={row.label} value={row.value} />
            );
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
                "flex items-center gap-2 rounded-sm px-2 py-1.5 transition-colors duration-150",
                isLargest && "bg-muted/40"
              )}
            >
              <div className="flex w-28 shrink-0 items-center gap-1 text-xs">
                {row.icon}
                <span className="text-muted-foreground truncate">
                  {row.label}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isActive
                        ? isPositive
                          ? "bg-primary/70"
                          : "bg-destructive/70"
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
                    "w-14 text-right font-mono text-xs font-medium tabular-nums",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {isActive
                    ? t("impactPercent", {
                        direction: isPositive ? "positive" : "negative",
                        value: formatter.number(Math.abs(row.value * 100), {
                          maximumFractionDigits: 1,
                          minimumFractionDigits: 1,
                        }),
                      })
                    : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        {t("barScale", {
          scale: Math.ceil(scale),
          max: MAX_BAR_DELTA_PP,
        })}
      </p>
    </div>
  );
}

function BaseRow({ label, value }: { label: string; value: number }) {
  const formatter = useFormatter();
  return (
    <div
      role="listitem"
      className="flex items-center gap-2 rounded-sm px-2 py-1.5"
    >
      <div className="text-muted-foreground w-28 shrink-0 text-xs">{label}</div>
      <div className="flex flex-1 items-center gap-2">
        <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-muted-foreground/50 h-full rounded-full"
            style={{ width: `${value * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-muted-foreground w-14 text-right font-mono text-xs font-medium tabular-nums">
          {formatter.number(value, {
            style: "percent",
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
          })}
        </span>
      </div>
    </div>
  );
}

function formatPredictionWarning(
  t: ReturnType<typeof useTranslations>,
  message: PredictionMessage
) {
  switch (message.key) {
    case "warnings.enemyBanLowSample":
    case "warnings.ourBanLowSample":
    case "warnings.mapLowSample":
    case "warnings.rosterLowSample":
    case "warnings.enemyHeroLowSample":
      return t(message.key, message.values);
    case "warnings.mapModeFallback":
      return t(message.key, {
        map: message.values.map,
        mapType: t(`mapTypes.${message.values.mapType}`),
      });
    default:
      return null;
  }
}

function renderPredictionInsight(
  t: ReturnType<typeof useTranslations>,
  message: PredictionMessage
) {
  function strong(chunks: React.ReactNode) {
    return <span className="text-foreground font-medium">{chunks}</span>;
  }

  switch (message.key) {
    case "insights.enemyBanHurts":
    case "insights.ourBanHelps":
    case "insights.mapStrength":
    case "insights.compositionImpact":
    case "insights.enemyCompositionImpact":
      return t.rich(message.key, { ...message.values, strong });
    default:
      return null;
  }
}
