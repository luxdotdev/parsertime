"use client";

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
import type {
  AbilityImpactAnalysis,
  AbilityImpactData,
  AbilityScenarioStats,
  HeroAbilityImpact,
} from "@/data/team-ability-impact-dto";
import { cn, toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type AbilityImpactAnalysisCardProps = {
  analysis: AbilityImpactAnalysis;
};

const ROLE_ORDER = ["Tank", "Damage", "Support"] as const;

function getWinrateColor(winrate: number): string {
  if (winrate >= 55) return "text-green-600 dark:text-green-400";
  if (winrate >= 45) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getAccentBorder(favorable: boolean): string {
  return favorable
    ? "border-l-green-500 dark:border-l-green-400"
    : "border-l-red-500 dark:border-l-red-400";
}

function ScenarioCard({
  label,
  stats,
  favorable,
  footer,
}: {
  label: string;
  stats: AbilityScenarioStats;
  favorable: boolean;
  footer: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/50 rounded-lg border-l-4 p-4",
        getAccentBorder(favorable)
      )}
    >
      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
        {label}
      </h4>
      {stats.fights > 0 ? (
        <>
          <p className="flex min-w-0 items-center gap-2 tabular-nums">
            <span className="text-muted-foreground text-sm font-medium">
              We win
            </span>
            <span
              className={cn(
                "text-3xl font-bold",
                getWinrateColor(stats.winrate)
              )}
            >
              {stats.winrate.toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-sm font-medium">
              of fights
            </span>
          </p>
          <p className="text-muted-foreground mt-2 text-sm tabular-nums">
            {footer}
          </p>
          {stats.fights < 3 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Small sample size
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No data</p>
      )}
    </div>
  );
}

function HeadlineInsight({
  data,
  abilityData,
}: {
  data: HeroAbilityImpact;
  abilityData: AbilityImpactData;
}) {
  const { usedByUs, notUsedByUs } = abilityData.scenarios;

  if (usedByUs.fights === 0 && notUsedByUs.fights === 0) return null;

  if (usedByUs.fights >= 1 && notUsedByUs.fights >= 1) {
    const delta = usedByUs.winrate - notUsedByUs.winrate;
    const deltaSign = delta >= 0 ? "+" : "";

    return (
      <p className="text-muted-foreground text-sm">
        When our{" "}
        <span className="text-foreground font-medium">{data.hero}</span> uses{" "}
        <span className="text-foreground font-medium">
          {abilityData.abilityName}
        </span>
        , we win{" "}
        <span
          className={cn(
            "font-semibold tabular-nums",
            getWinrateColor(usedByUs.winrate)
          )}
        >
          {usedByUs.winrate.toFixed(0)}%
        </span>{" "}
        of fights (
        <span
          className={cn(
            "font-semibold tabular-nums",
            delta >= 5
              ? "text-green-600 dark:text-green-400"
              : delta <= -5
                ? "text-red-600 dark:text-red-400"
                : "text-yellow-600 dark:text-yellow-400"
          )}
        >
          {deltaSign}
          {delta.toFixed(0)}%
        </span>{" "}
        vs. not using it)
      </p>
    );
  }

  const bestSide = usedByUs.fights >= 1 ? usedByUs : notUsedByUs;
  const label = usedByUs.fights >= 1 ? "uses" : "doesn't use";

  return (
    <p className="text-muted-foreground text-sm">
      When our <span className="text-foreground font-medium">{data.hero}</span>{" "}
      {label}{" "}
      <span className="text-foreground font-medium">
        {abilityData.abilityName}
      </span>
      , we win{" "}
      <span
        className={cn(
          "font-semibold tabular-nums",
          getWinrateColor(bestSide.winrate)
        )}
      >
        {bestSide.winrate.toFixed(0)}%
      </span>{" "}
      of fights ({bestSide.fights} fights)
    </p>
  );
}

function HeroCombobox({
  availableHeroes,
  selectedHero,
  onSelect,
}: {
  availableHeroes: string[];
  selectedHero: string | null;
  onSelect: (hero: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const availableSet = useMemo(
    () => new Set(availableHeroes),
    [availableHeroes]
  );

  const byRole = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const role of ROLE_ORDER) {
      const heroes = roleHeroMapping[role].filter((h) => availableSet.has(h));
      if (heroes.length > 0) {
        groups[role] = heroes;
      }
    }
    return groups;
  }, [availableSet]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a hero"
          className="w-full justify-between font-normal md:w-72"
        >
          <span className="flex items-center gap-2 truncate">
            {selectedHero ? (
              <>
                <Image
                  src={`/heroes/${toHero(selectedHero)}.png`}
                  alt={selectedHero}
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
                {selectedHero}
              </>
            ) : (
              "Select a hero…"
            )}
          </span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command
          filter={(value, search) => {
            const normalized = toHero(value);
            const normalizedSearch = toHero(search);
            return normalized.includes(normalizedSearch) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search heroes…" />
          <CommandList>
            <CommandEmpty>No heroes found.</CommandEmpty>
            {ROLE_ORDER.map((role) => {
              const heroes = byRole[role];
              if (!heroes || heroes.length === 0) return null;
              return (
                <CommandGroup key={role} heading={role}>
                  {heroes.map((hero) => (
                    <CommandItem
                      key={hero}
                      value={hero}
                      onSelect={(val) => {
                        onSelect(val === selectedHero ? null : val);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedHero === hero ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      <Image
                        src={`/heroes/${toHero(hero)}.png`}
                        alt={hero}
                        width={20}
                        height={20}
                        className="mr-2 rounded-sm"
                      />
                      {hero}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AbilityImpactAnalysisCard({
  analysis,
}: AbilityImpactAnalysisCardProps) {
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<1 | 2>(1);

  const resolvedHero = useMemo(() => {
    if (!selectedHero) return null;
    const match = analysis.availableHeroes.find(
      (h) => h.toLowerCase() === selectedHero.toLowerCase()
    );
    return match ?? null;
  }, [selectedHero, analysis.availableHeroes]);

  const heroData = resolvedHero ? analysis.byHero[resolvedHero] : null;
  const abilityData = heroData
    ? selectedAbility === 1
      ? heroData.ability1
      : heroData.ability2
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ability Impact Analysis</CardTitle>
        <CardDescription>
          Analyze how specific hero abilities affect fight outcomes across your
          scrims
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <HeroCombobox
            availableHeroes={analysis.availableHeroes}
            selectedHero={resolvedHero}
            onSelect={(hero) => {
              setSelectedHero(hero);
              setSelectedAbility(1);
            }}
          />

          {heroData && (
            <div className="flex gap-2">
              <Button
                variant={selectedAbility === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAbility(1)}
              >
                {heroData.ability1.abilityName}
              </Button>
              <Button
                variant={selectedAbility === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAbility(2)}
              >
                {heroData.ability2.abilityName}
              </Button>
            </div>
          )}
        </div>

        {heroData && abilityData ? (
          <>
            <HeadlineInsight data={heroData} abilityData={abilityData} />

            <div className="grid gap-4 md:grid-cols-2">
              <ScenarioCard
                label={`Our ${heroData.hero} used ${abilityData.abilityName}`}
                stats={abilityData.scenarios.usedByUs}
                favorable={true}
                footer={`We win ${abilityData.scenarios.usedByUs.wins}/${abilityData.scenarios.usedByUs.fights} fights when ability is used`}
              />
              <ScenarioCard
                label={`Our ${heroData.hero} didn't use ${abilityData.abilityName}`}
                stats={abilityData.scenarios.notUsedByUs}
                favorable={false}
                footer={`We win ${abilityData.scenarios.notUsedByUs.wins}/${abilityData.scenarios.notUsedByUs.fights} fights without ability usage`}
              />
              <ScenarioCard
                label={`Enemy ${heroData.hero} used ${abilityData.abilityName}`}
                stats={abilityData.scenarios.usedByEnemy}
                favorable={false}
                footer={`We win ${abilityData.scenarios.usedByEnemy.wins}/${abilityData.scenarios.usedByEnemy.fights} fights when enemy uses ability`}
              />
              <ScenarioCard
                label={`Enemy ${heroData.hero} didn't use ${abilityData.abilityName}`}
                stats={abilityData.scenarios.notUsedByEnemy}
                favorable={true}
                footer={`We win ${abilityData.scenarios.notUsedByEnemy.wins}/${abilityData.scenarios.notUsedByEnemy.fights} fights when enemy doesn't use ability`}
              />
            </div>

            {abilityData.totalFightsAnalyzed < 10 && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <AlertTriangle
                  className="h-3.5 w-3.5 text-amber-500"
                  aria-hidden="true"
                />
                Only {abilityData.totalFightsAnalyzed} fight
                {abilityData.totalFightsAnalyzed === 1 ? "" : "s"} analyzed for{" "}
                {heroData.hero}. Results may not be statistically significant.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select a hero above to see how their abilities impact fight
            outcomes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
