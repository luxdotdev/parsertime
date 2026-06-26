"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
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
import type {
  HeroUltImpact,
  ScenarioStats,
  UltImpactAnalysis,
} from "@/data/team/types";
import { cn, toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type UltImpactAnalysisCardProps = {
  analysis: UltImpactAnalysis;
};

const ROLE_ORDER = ["Tank", "Damage", "Support"] as const;

type ScenarioKey =
  | "uncontestedOurs"
  | "uncontestedTheirs"
  | "mirrorOursFirst"
  | "mirrorTheirsFirst";

type ScenarioRow = {
  key: ScenarioKey;
  perspective: "ours" | "theirs";
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};

const SCENARIO_DEFS: {
  key: ScenarioKey;
  perspective: "ours" | "theirs";
}[] = [
  {
    key: "uncontestedOurs",
    perspective: "ours",
  },
  {
    key: "uncontestedTheirs",
    perspective: "theirs",
  },
  {
    key: "mirrorOursFirst",
    perspective: "ours",
  },
  {
    key: "mirrorTheirsFirst",
    perspective: "theirs",
  },
];

/** Flip stats to show from the ult-user's perspective (swap wins/losses). */
function flipStats(stats: ScenarioStats): ScenarioStats {
  return {
    fights: stats.fights,
    wins: stats.losses,
    losses: stats.wins,
    winrate: stats.fights > 0 ? (stats.losses / stats.fights) * 100 : 0,
  };
}

function buildRows(heroData: HeroUltImpact): ScenarioRow[] {
  return SCENARIO_DEFS.map((def) => {
    const raw = heroData.scenarios[def.key];
    const stats = def.perspective === "theirs" ? flipStats(raw) : raw;
    return {
      key: def.key,
      perspective: def.perspective,
      fights: stats.fights,
      wins: stats.wins,
      losses: stats.losses,
      winrate: stats.winrate,
    };
  });
}

function getWinrateClass(
  winrate: number,
  perspective: "ours" | "theirs"
): string {
  // For "theirs" rows, a high winrate is bad for us.
  const adjusted = perspective === "ours" ? winrate : 100 - winrate;
  if (adjusted >= 55) return "text-primary";
  if (adjusted < 45) return "text-destructive";
  return "text-foreground";
}

function formatPercent(
  value: number,
  formatter: ReturnType<typeof useFormatter>
) {
  return formatter.number(value / 100, {
    style: "percent",
    maximumFractionDigits: 0,
  });
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
  const t = useTranslations("teamStatsPage.ultImpactAnalysisCard");
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
          aria-controls="ult-hero-combobox-listbox"
          aria-label={t("selectHero")}
          className="w-full justify-between font-normal md:w-64"
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
              t("selectHero")
            )}
          </span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command
          filter={(value, search) => {
            const normalized = toHero(value);
            const normalizedSearch = toHero(search);
            return normalized.includes(normalizedSearch) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t("searchHeroes")} />
          <CommandList id="ult-hero-combobox-listbox">
            <CommandEmpty>{t("noHeroesFound")}</CommandEmpty>
            {ROLE_ORDER.map((role) => {
              const heroes = byRole[role];
              if (!heroes || heroes.length === 0) return null;
              return (
                <CommandGroup key={role} heading={t(`roles.${role}`)}>
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
  const t = useTranslations("teamStatsPage.ultImpactAnalysisCard");
  const formatter = useFormatter();
  const [selectedHero, setSelectedHero] = useState<string | null>(null);

  const resolvedHero = useMemo(() => {
    if (!selectedHero) return null;
    const match = analysis.availableHeroes.find(
      (h) => h.toLowerCase() === selectedHero.toLowerCase()
    );
    return match ?? null;
  }, [selectedHero, analysis.availableHeroes]);

  const heroData = resolvedHero ? analysis.byHero[resolvedHero] : null;

  const rows = useMemo(() => (heroData ? buildRows(heroData) : []), [heroData]);

  // Find the most-impactful scenario: highest |winrate - 50|, weighted by sample size.
  const keyScenarioKey = useMemo<ScenarioKey | null>(() => {
    const candidates = rows.filter((r) => r.fights >= 1);
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort((a, b) => {
      const aSignal = Math.abs(a.winrate - 50) * Math.log2(a.fights + 1);
      const bSignal = Math.abs(b.winrate - 50) * Math.log2(b.fights + 1);
      return bSignal - aSignal;
    });
    return sorted[0]?.key ?? null;
  }, [rows]);

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        rightSlot={
          <HeroCombobox
            availableHeroes={analysis.availableHeroes}
            selectedHero={resolvedHero}
            onSelect={setSelectedHero}
          />
        }
      />

      {heroData ? (
        <>
          <div className="border-border overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                  <th className="px-4 py-2 text-left font-medium">
                    {t("table.hero")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("table.scenario")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.fights")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.wins")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.losses")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.winrate")}
                  </th>
                  <th className="w-28 px-4 py-2 text-right font-medium">
                    {t("table.tag")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => {
                  const isKey = row.fights > 0 && row.key === keyScenarioKey;
                  const noData = row.fights === 0;
                  return (
                    <tr
                      key={row.key}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src={`/heroes/${toHero(heroData.hero)}.png`}
                            alt={heroData.hero}
                            width={28}
                            height={28}
                            className="border-border shrink-0 rounded border"
                          />
                          <span className="font-medium">{heroData.hero}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-foreground">
                          {t(`scenarios.${row.key}`)}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        {noData ? "—" : formatter.number(row.fights)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        {noData ? "—" : formatter.number(row.wins)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        {noData ? "—" : formatter.number(row.losses)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                          noData
                            ? "text-muted-foreground"
                            : getWinrateClass(row.winrate, row.perspective)
                        )}
                      >
                        {noData ? "—" : formatPercent(row.winrate, formatter)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isKey ? (
                          <span className="bg-primary/15 text-primary rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                            {t("tags.keyUlt")}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {heroData.totalFightsAnalyzed < 10 && (
            <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {t("smallSample", {
                count: heroData.totalFightsAnalyzed,
                hero: heroData.hero,
              })}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{t("selectHeroPrompt")}</p>
      )}
    </section>
  );
}
