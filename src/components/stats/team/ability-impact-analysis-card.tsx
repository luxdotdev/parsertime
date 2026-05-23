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
  AbilityImpactAnalysis,
  AbilityImpactData,
  HeroAbilityImpact,
} from "@/data/team/types";
import { cn, toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type AbilityImpactAnalysisCardProps = {
  analysis: AbilityImpactAnalysis;
};

const ROLE_ORDER = ["Tank", "Damage", "Support"] as const;

type AbilityRow = {
  abilityName: string;
  fights: number;
  withWinrate: number | null;
  withFights: number;
  withoutWinrate: number | null;
  withoutFights: number;
  delta: number | null;
  totalAnalyzed: number;
};

function buildRows(heroData: HeroAbilityImpact): AbilityRow[] {
  return [heroData.ability1, heroData.ability2].map((a) => toRow(a));
}

function toRow(ability: AbilityImpactData): AbilityRow {
  const used = ability.scenarios.usedByUs;
  const notUsed = ability.scenarios.notUsedByUs;
  const withWR = used.fights > 0 ? used.winrate : null;
  const withoutWR = notUsed.fights > 0 ? notUsed.winrate : null;
  const delta =
    withWR !== null && withoutWR !== null ? withWR - withoutWR : null;
  return {
    abilityName: ability.abilityName,
    fights: used.fights + notUsed.fights,
    withWinrate: withWR,
    withFights: used.fights,
    withoutWinrate: withoutWR,
    withoutFights: notUsed.fights,
    delta,
    totalAnalyzed: ability.totalFightsAnalyzed,
  };
}

function getDeltaClass(delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  if (delta >= 5) return "text-primary";
  if (delta <= -5) return "text-destructive";
  return "text-foreground";
}

function getWinrateClass(winrate: number | null): string {
  if (winrate === null) return "text-muted-foreground";
  if (winrate >= 55) return "text-primary";
  if (winrate < 45) return "text-destructive";
  return "text-foreground";
}

function formatPercent(
  value: number,
  formatter: ReturnType<typeof useFormatter>,
  digits = 0
) {
  return formatter.number(value / 100, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercentagePoints(
  value: number,
  formatter: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations>
) {
  return t("percentagePoints", {
    value: formatter.number(value, {
      maximumFractionDigits: 0,
      signDisplay: "exceptZero",
    }),
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
  const t = useTranslations("teamStatsPage.abilityImpactAnalysisCard");
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
          aria-controls="ability-hero-combobox-listbox"
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
          <CommandList id="ability-hero-combobox-listbox">
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

export function AbilityImpactAnalysisCard({
  analysis,
}: AbilityImpactAnalysisCardProps) {
  const t = useTranslations("teamStatsPage.abilityImpactAnalysisCard");
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

  const { keyAbility, riskAbility } = useMemo(() => {
    const withDelta = rows.filter((r) => r.delta !== null);
    if (withDelta.length === 0) {
      return { keyAbility: null, riskAbility: null };
    }
    const sorted = [...withDelta].sort((a, b) => b.delta! - a.delta!);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const keyAbility = top && top.delta! >= 5 ? top.abilityName : null;
    const riskAbility =
      bottom && bottom !== top && bottom.delta! <= -5
        ? bottom.abilityName
        : null;
    return { keyAbility, riskAbility };
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
            onSelect={(hero) => {
              setSelectedHero(hero);
            }}
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
                    {t("table.ability")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.fights")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.withWr")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.withoutWr")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {t("table.delta")}
                  </th>
                  <th className="w-24 px-4 py-2 text-right font-medium">
                    {t("table.tag")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => {
                  const isKey =
                    keyAbility !== null && row.abilityName === keyAbility;
                  const isRisk =
                    riskAbility !== null && row.abilityName === riskAbility;
                  return (
                    <tr
                      key={row.abilityName}
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
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {row.abilityName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {heroData.hero}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        {formatter.number(row.fights)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono tabular-nums",
                          getWinrateClass(row.withWinrate)
                        )}
                      >
                        {row.withWinrate !== null
                          ? formatPercent(row.withWinrate, formatter)
                          : "—"}
                        {row.withFights > 0 ? (
                          <span className="text-muted-foreground ml-1 text-xs">
                            {t("sampleCount", { count: row.withFights })}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono tabular-nums",
                          getWinrateClass(row.withoutWinrate)
                        )}
                      >
                        {row.withoutWinrate !== null
                          ? formatPercent(row.withoutWinrate, formatter)
                          : "—"}
                        {row.withoutFights > 0 ? (
                          <span className="text-muted-foreground ml-1 text-xs">
                            {t("sampleCount", { count: row.withoutFights })}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                          getDeltaClass(row.delta)
                        )}
                      >
                        {row.delta !== null
                          ? formatPercentagePoints(row.delta, formatter, t)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isKey ? (
                          <span className="bg-primary/15 text-primary rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                            {t("tags.key")}
                          </span>
                        ) : isRisk ? (
                          <span className="bg-destructive/15 text-destructive rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                            {t("tags.risk")}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.some((r) => r.totalAnalyzed < 10) && (
            <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {t("smallSample", { hero: heroData.hero })}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{t("selectHeroPrompt")}</p>
      )}
    </section>
  );
}
