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
  HeroUltImpact,
  ScenarioStats,
  UltImpactAnalysis,
} from "@/data/team-ult-impact-dto";
import { cn, toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type UltImpactAnalysisCardProps = {
  analysis: UltImpactAnalysis;
};

const ROLE_ORDER = ["Tank", "Damage", "Support"] as const;

function getWinrateColor(winrate: number): string {
  if (winrate >= 55) return "text-green-600 dark:text-green-400";
  if (winrate >= 45) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/** Flip stats to show from the ult-user's perspective (swap wins/losses). */
function flipStats(stats: ScenarioStats): ScenarioStats {
  return {
    fights: stats.fights,
    wins: stats.losses,
    losses: stats.wins,
    winrate: stats.fights > 0 ? (stats.losses / stats.fights) * 100 : 0,
  };
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
  stats: ScenarioStats;
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
              {favorable ? "We win" : "We lose"}
            </span>
            <span
              className={cn(
                "text-3xl font-bold",
                getWinrateColor(favorable ? stats.winrate : 100 - stats.winrate)
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

function HeadlineInsight({ data }: { data: HeroUltImpact }) {
  const scenarios = [
    {
      key: "uncontestedOurs" as const,
      label: "uncontested (ours)",
      stats: data.scenarios.uncontestedOurs,
    },
    {
      key: "uncontestedTheirs" as const,
      label: "uncontested (enemy)",
      stats: flipStats(data.scenarios.uncontestedTheirs),
    },
    {
      key: "mirrorOursFirst" as const,
      label: "in mirrors (ours first)",
      stats: data.scenarios.mirrorOursFirst,
    },
    {
      key: "mirrorTheirsFirst" as const,
      label: "in mirrors (theirs first)",
      stats: flipStats(data.scenarios.mirrorTheirsFirst),
    },
  ];

  // Find the scenario with the highest fight count and meaningful winrate deviation
  const best = scenarios
    .filter((s) => s.stats.fights >= 1)
    .sort((a, b) => {
      const aSignal =
        Math.abs(a.stats.winrate - 50) * Math.log2(a.stats.fights + 1);
      const bSignal =
        Math.abs(b.stats.winrate - 50) * Math.log2(b.stats.fights + 1);
      return bSignal - aSignal;
    })[0];

  if (!best) return null;

  return (
    <p className="text-muted-foreground text-sm">
      <span className="text-foreground font-medium">{data.hero}</span> wins{" "}
      <span
        className={cn(
          "font-semibold tabular-nums",
          getWinrateColor(best.stats.winrate)
        )}
      >
        {best.stats.winrate.toFixed(0)}%
      </span>{" "}
      of fights {best.label} ({best.stats.fights} fights)
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

export function UltImpactAnalysisCard({
  analysis,
}: UltImpactAnalysisCardProps) {
  const [selectedHero, setSelectedHero] = useState<string | null>(null);

  // Resolve selected hero from combobox value (Command lowercases)
  const resolvedHero = useMemo(() => {
    if (!selectedHero) return null;
    // Command's onSelect returns the lowercased value; match against available heroes
    const match = analysis.availableHeroes.find(
      (h) => h.toLowerCase() === selectedHero.toLowerCase()
    );
    return match ?? null;
  }, [selectedHero, analysis.availableHeroes]);

  const heroData = resolvedHero ? analysis.byHero[resolvedHero] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ultimate Impact Analysis</CardTitle>
        <CardDescription>
          Analyze how specific hero ultimates affect fight outcomes across
          different scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <HeroCombobox
          availableHeroes={analysis.availableHeroes}
          selectedHero={resolvedHero}
          onSelect={setSelectedHero}
        />

        {heroData ? (
          <>
            <HeadlineInsight data={heroData} />

            <div className="grid gap-4 md:grid-cols-2">
              <ScenarioCard
                label={`Our ${heroData.hero} uncontested`}
                stats={heroData.scenarios.uncontestedOurs}
                favorable={true}
                footer={`We win ${heroData.scenarios.uncontestedOurs.wins}/${heroData.scenarios.uncontestedOurs.fights} fights when using ultimate uncontested`}
              />
              <ScenarioCard
                label={`Enemy ${heroData.hero} uncontested`}
                stats={flipStats(heroData.scenarios.uncontestedTheirs)}
                favorable={false}
                footer={`Enemy wins ${heroData.scenarios.uncontestedTheirs.losses}/${heroData.scenarios.uncontestedTheirs.fights} fights when using ultimate uncontested`}
              />
              <ScenarioCard
                label="Mirror — Ours first"
                stats={heroData.scenarios.mirrorOursFirst}
                favorable={true}
                footer={`We win ${heroData.scenarios.mirrorOursFirst.wins}/${heroData.scenarios.mirrorOursFirst.fights} fights when we use ultimate first`}
              />
              <ScenarioCard
                label="Mirror — Theirs first"
                stats={flipStats(heroData.scenarios.mirrorTheirsFirst)}
                favorable={false}
                footer={`Enemy wins ${heroData.scenarios.mirrorTheirsFirst.losses}/${heroData.scenarios.mirrorTheirsFirst.fights} fights when they use ultimate first`}
              />
            </div>

            {heroData.totalFightsAnalyzed < 10 && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <AlertTriangle
                  className="h-3.5 w-3.5 text-amber-500"
                  aria-hidden="true"
                />
                Only {heroData.totalFightsAnalyzed} fight
                {heroData.totalFightsAnalyzed === 1 ? "" : "s"} analyzed for{" "}
                {heroData.hero}. Results may not be statistically significant.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select a hero above to see how their ultimate impacts fight
            outcomes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
