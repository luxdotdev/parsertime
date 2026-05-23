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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { UltCombosAnalysis, UltResponseStat } from "@/data/team/types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { cn, toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

type UltResponseCardProps = {
  analysis: UltCombosAnalysis;
};

type ResponseView = "matrix" | "flow";

const ROLE_ORDER = ["Tank", "Damage", "Support"] as const;
const MATRIX_MAX = 7;
const FLOW_MAX_SOURCES = 5;
const FLOW_MAX_TARGETS = 6;
const FLOW_SINGLE_TARGETS = 6;

/** Near-black that reads on a strong amber fill in both light and dark mode. */
const ON_AMBER_TEXT = "oklch(0.18 0.02 80)";

function winrateColor(winrate: number): string {
  if (winrate >= 55) return "var(--primary)";
  if (winrate < 45) return "var(--destructive)";
  return "var(--muted-foreground)";
}

function tint(color: string, percent: number): string {
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`;
}

export function UltResponseCard({ analysis }: UltResponseCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.responses");
  const { team1, team2 } = useColorblindMode();
  const [view, setView] = useState<ResponseView>("matrix");
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(
    analysis.enemyHeroes[0] ?? null
  );

  if (analysis.responses.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Ultimates · Enemy responses"
          title={t("title")}
        />
        <p className="text-muted-foreground text-sm">
          {t("noData", { window: analysis.windowSeconds })}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Ultimates · Enemy responses"
        title={t("title")}
        description={t("description", {
          window: analysis.windowSeconds,
          maps: analysis.totalMaps,
        })}
        rightSlot={
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => value && setView(value as ResponseView)}
            variant="outline"
            size="sm"
            aria-label={t("viewLabel")}
          >
            <ToggleGroupItem value="matrix">{t("matrix")}</ToggleGroupItem>
            <ToggleGroupItem value="flow">{t("flow")}</ToggleGroupItem>
          </ToggleGroup>
        }
      />

      {view === "matrix" ? (
        <ResponseMatrix analysis={analysis} team1={team1} team2={team2} t={t} />
      ) : (
        <ResponseFlow
          analysis={analysis}
          selectedEnemy={selectedEnemy}
          onSelectEnemy={setSelectedEnemy}
          team1={team1}
          team2={team2}
          t={t}
        />
      )}
    </section>
  );
}

type Translator = ReturnType<typeof useTranslations>;

function ResponseMatrix({
  analysis,
  team1,
  team2,
  t,
}: {
  analysis: UltCombosAnalysis;
  team1: string;
  team2: string;
  t: Translator;
}) {
  const enemyRows = analysis.enemyHeroes.slice(0, MATRIX_MAX);
  const ourCols = analysis.responseHeroes.slice(0, MATRIX_MAX);

  const cellMap = useMemo(() => {
    const map = new Map<string, UltResponseStat>();
    for (const r of analysis.responses)
      map.set(`${r.enemyHero}|${r.ourHero}`, r);
    return map;
  }, [analysis.responses]);

  const maxCell = useMemo(() => {
    let max = 1;
    for (const enemy of enemyRows) {
      for (const our of ourCols) {
        const cell = cellMap.get(`${enemy}|${our}`);
        if (cell && cell.count > max) max = cell.count;
      }
    }
    return max;
  }, [cellMap, enemyRows, ourCols]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.16em] uppercase">
        <span style={{ color: team2 }}>{t("enemyAxis")} ↓</span>
        <span style={{ color: team1 }}>{t("ourAxis")} →</span>
        <span className="text-muted-foreground tracking-normal normal-case">
          {t("matrixHint")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-32" />
              {ourCols.map((our) => (
                <th key={our} className="p-0">
                  <div
                    className="mx-auto flex w-12 justify-center rounded-md py-1 sm:w-14"
                    style={{ backgroundColor: tint(team1, 12) }}
                  >
                    <Image
                      src={`/heroes/${toHero(our)}.png`}
                      alt={our}
                      width={24}
                      height={24}
                      className="rounded-sm"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enemyRows.map((enemy) => (
              <tr key={enemy}>
                <th scope="row" className="pr-2 text-right align-middle">
                  <div
                    className="flex items-center justify-end gap-2 rounded-md py-1 pr-2 pl-2"
                    style={{ backgroundColor: tint(team2, 12) }}
                  >
                    <span className="truncate text-xs font-medium">
                      {enemy}
                    </span>
                    <Image
                      src={`/heroes/${toHero(enemy)}.png`}
                      alt={enemy}
                      width={24}
                      height={24}
                      className="shrink-0 rounded-sm"
                    />
                  </div>
                </th>
                {ourCols.map((our) => {
                  const cell = cellMap.get(`${enemy}|${our}`);
                  if (!cell) {
                    return (
                      <td
                        key={our}
                        className="text-muted-foreground/30 h-12 w-12 text-center align-middle text-sm sm:w-14"
                      >
                        ·
                      </td>
                    );
                  }
                  const intensity = cell.count / maxCell;
                  // Blend toward the card surface (not black) so low cells recede
                  // and only heavy-usage cells read as amber.
                  const alpha = Math.round((0.1 + 0.72 * intensity) * 100);
                  // Strong amber fills get near-black text; subtle cells keep
                  // the page foreground. Either way contrast holds in both modes.
                  const textColor =
                    intensity > 0.5 ? ON_AMBER_TEXT : "var(--foreground)";
                  return (
                    <td
                      key={our}
                      className="h-12 w-12 rounded-md text-center align-middle sm:w-14"
                      style={{
                        // oklab (not oklch): mixing across the amber->neutral hue arc
                        // in oklch would detour through green. oklab stays amber.
                        backgroundColor: `color-mix(in oklab, var(--primary) ${alpha}%, var(--card))`,
                      }}
                      title={t("cellSummary", {
                        ourHero: our,
                        enemyHero: enemy,
                        count: cell.count,
                        winrate: cell.winrate.toFixed(0),
                      })}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span
                          className="font-mono text-sm font-semibold tabular-nums"
                          style={{ color: textColor }}
                        >
                          {cell.count}
                        </span>
                        <span
                          className="font-mono text-[10px] tabular-nums"
                          style={{ color: textColor, opacity: 0.72 }}
                        >
                          {cell.winrate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ribbonPath(
  x1: number,
  y1Top: number,
  x2: number,
  y2Top: number,
  h: number
): string {
  const xm = (x1 + x2) / 2;
  const y1b = y1Top + h;
  const y2b = y2Top + h;
  return `M ${x1} ${y1Top} C ${xm} ${y1Top} ${xm} ${y2Top} ${x2} ${y2Top} L ${x2} ${y2b} C ${xm} ${y2b} ${xm} ${y1b} ${x1} ${y1b} Z`;
}

type FlowTargetNode = {
  hero: string;
  total: number;
  wins: number;
  winrate: number;
  x: number;
  y: number;
  h: number;
};
type FlowSourceNode = {
  hero: string;
  total: number;
  x: number;
  y: number;
  h: number;
};

function ResponseFlow({
  analysis,
  selectedEnemy,
  onSelectEnemy,
  team1,
  team2,
  t,
}: {
  analysis: UltCombosAnalysis;
  selectedEnemy: string | null;
  onSelectEnemy: (hero: string | null) => void;
  team1: string;
  team2: string;
  t: Translator;
}) {
  const layout = useMemo(() => {
    const sources = selectedEnemy
      ? [selectedEnemy]
      : analysis.enemyHeroes.slice(0, FLOW_MAX_SOURCES);
    const sourceSet = new Set(sources);

    let links = analysis.responses.filter((r) => sourceSet.has(r.enemyHero));

    const targetTotals = new Map<string, number>();
    for (const l of links)
      targetTotals.set(l.ourHero, (targetTotals.get(l.ourHero) ?? 0) + l.count);
    const maxTargets = selectedEnemy ? FLOW_SINGLE_TARGETS : FLOW_MAX_TARGETS;
    const targets = [...targetTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTargets)
      .map(([hero]) => hero);
    const targetSet = new Set(targets);
    links = links.filter((l) => targetSet.has(l.ourHero));

    if (links.length === 0) return null;

    const srcTotals = new Map<string, number>();
    const tgtTotals = new Map<string, number>();
    const tgtWins = new Map<string, number>();
    for (const l of links) {
      srcTotals.set(l.enemyHero, (srcTotals.get(l.enemyHero) ?? 0) + l.count);
      tgtTotals.set(l.ourHero, (tgtTotals.get(l.ourHero) ?? 0) + l.count);
      tgtWins.set(l.ourHero, (tgtWins.get(l.ourHero) ?? 0) + l.wins);
    }

    const sourceList = [...srcTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([hero, total]) => ({ hero, total }));
    const targetList = [...tgtTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([hero, total]) => ({ hero, total }));

    const total = links.reduce((s, l) => s + l.count, 0);

    const W = 600;
    const LABEL_W = 116;
    const NODE_W = 8;
    const gap = 14;
    const topPad = 8;
    // Floor node height so a thin flow still has room for its two-line label.
    const MIN_NODE_H = 9;
    const maxNodes = Math.max(sourceList.length, targetList.length);
    const columnHeight = Math.min(300, Math.max(140, maxNodes * 42));
    const scale = (columnHeight - (maxNodes - 1) * gap) / total;

    const leftNodeX = LABEL_W;
    const rightNodeX = W - LABEL_W - NODE_W;
    const plotLeft = leftNodeX + NODE_W;
    const plotRight = rightNodeX;

    function placeColumn<T extends { hero: string; total: number }>(
      nodes: T[],
      x: number
    ): {
      map: Map<string, T & { x: number; y: number; h: number }>;
      stackH: number;
    } {
      const heights = nodes.map((n) => Math.max(MIN_NODE_H, n.total * scale));
      const stackH =
        heights.reduce((s, h) => s + h, 0) + (nodes.length - 1) * gap;
      let y = topPad + Math.max(0, (columnHeight - stackH) / 2);
      const map = new Map<string, T & { x: number; y: number; h: number }>();
      nodes.forEach((n, i) => {
        map.set(n.hero, { ...n, x, y, h: heights[i] });
        y += heights[i] + gap;
      });
      return { map, stackH };
    }

    const src = placeColumn(sourceList, leftNodeX);
    const tgt = placeColumn(targetList, rightNodeX);
    const srcNodes = src.map;
    const tgtNodes = tgt.map;
    const H = topPad * 2 + Math.max(columnHeight, src.stackH, tgt.stackH);

    const targetNodes: FlowTargetNode[] = [...tgtNodes.values()].map((n) => {
      const wins = tgtWins.get(n.hero) ?? 0;
      return {
        ...n,
        wins,
        winrate: n.total > 0 ? (wins / n.total) * 100 : 0,
      };
    });
    const sourceNodes: FlowSourceNode[] = [...srcNodes.values()];

    const srcCursor = new Map<string, number>();
    const tgtCursor = new Map<string, number>();
    const targetIndex = new Map(targetList.map((node, i) => [node.hero, i]));
    const sourceIndex = new Map(sourceList.map((node, i) => [node.hero, i]));

    const ordered = [...links].sort((a, b) => {
      const srcDiff =
        (sourceIndex.get(a.enemyHero) ?? 0) -
        (sourceIndex.get(b.enemyHero) ?? 0);
      if (srcDiff !== 0) return srcDiff;
      return (
        (targetIndex.get(a.ourHero) ?? 0) - (targetIndex.get(b.ourHero) ?? 0)
      );
    });

    const ribbons = ordered
      .map((link) => {
        const src = srcNodes.get(link.enemyHero);
        const tgt = tgtNodes.get(link.ourHero);
        if (!src || !tgt) return null;
        const h = link.count * scale;
        const sy = src.y + (srcCursor.get(link.enemyHero) ?? 0);
        const ty = tgt.y + (tgtCursor.get(link.ourHero) ?? 0);
        srcCursor.set(link.enemyHero, (srcCursor.get(link.enemyHero) ?? 0) + h);
        tgtCursor.set(link.ourHero, (tgtCursor.get(link.ourHero) ?? 0) + h);
        return {
          key: `${link.enemyHero}|${link.ourHero}`,
          d: ribbonPath(plotLeft, sy, plotRight, ty, h),
          link,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return { W, H, NODE_W, sourceNodes, targetNodes, ribbons };
  }, [analysis, selectedEnemy]);

  const ariaSummary = layout
    ? layout.ribbons
        .map((r) =>
          t("flowSummary", {
            ourHero: r.link.ourHero,
            enemyHero: r.link.enemyHero,
            count: r.link.count,
            winrate: r.link.winrate.toFixed(0),
          })
        )
        .join(". ")
    : t("noResponsesForHero");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("selectEnemyUlt")}
        </span>
        <EnemyUltCombobox
          enemyHeroes={analysis.enemyHeroes}
          selectedEnemy={selectedEnemy}
          onSelect={onSelectEnemy}
          allLabel={t("allEnemyUlts")}
          placeholder={t("searchEnemyUlts")}
          emptyLabel={t("noEnemyUlts")}
        />
        <div className="ml-auto flex items-center gap-3 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span style={{ color: team2 }}>{t("enemyAxis")}</span>
          <span className="text-muted-foreground">→</span>
          <span style={{ color: team1 }}>{t("ourAxis")}</span>
        </div>
      </div>

      {layout ? (
        <svg
          viewBox={`0 0 ${layout.W} ${layout.H}`}
          className="mx-auto block h-auto w-full max-w-2xl"
          role="img"
          aria-label={ariaSummary}
        >
          {layout.ribbons.map((r) => (
            <path
              key={r.key}
              d={r.d}
              style={{ fill: "var(--primary)" }}
              className="opacity-25 transition-opacity hover:opacity-55"
            >
              <title>
                {t("flowSummary", {
                  ourHero: r.link.ourHero,
                  enemyHero: r.link.enemyHero,
                  count: r.link.count,
                  winrate: r.link.winrate.toFixed(0),
                })}
              </title>
            </path>
          ))}

          {layout.sourceNodes.map((n) => (
            <g key={`src-${n.hero}`}>
              <rect
                x={n.x}
                y={n.y}
                width={layout.NODE_W}
                height={Math.max(2, n.h)}
                rx={2}
                style={{ fill: team2 }}
              />
              <image
                href={`/heroes/${toHero(n.hero)}.png`}
                x={n.x - 20}
                y={n.y + n.h / 2 - 8}
                width={16}
                height={16}
                clipPath="inset(0% round 3px)"
              />
              <text
                x={n.x - 24}
                y={n.y + n.h / 2}
                dy={4}
                textAnchor="end"
                style={{ fill: "var(--foreground)", fontSize: 11 }}
              >
                {n.hero}
              </text>
            </g>
          ))}

          {layout.targetNodes.map((n) => (
            <g key={`tgt-${n.hero}`}>
              <rect
                x={n.x}
                y={n.y}
                width={layout.NODE_W}
                height={Math.max(2, n.h)}
                rx={2}
                style={{ fill: team1 }}
              />
              <image
                href={`/heroes/${toHero(n.hero)}.png`}
                x={n.x + layout.NODE_W + 4}
                y={n.y + n.h / 2 - 8}
                width={16}
                height={16}
                clipPath="inset(0% round 3px)"
              />
              <text
                x={n.x + layout.NODE_W + 26}
                y={n.y + n.h / 2 - 4}
                style={{ fill: "var(--foreground)", fontSize: 11 }}
              >
                {n.hero}
              </text>
              <text
                x={n.x + layout.NODE_W + 26}
                y={n.y + n.h / 2 + 9}
                style={{
                  fill: winrateColor(n.winrate),
                  fontSize: 10,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {n.total} · {n.winrate.toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("noResponsesForHero")}
        </p>
      )}
    </div>
  );
}

function EnemyUltCombobox({
  enemyHeroes,
  selectedEnemy,
  onSelect,
  allLabel,
  placeholder,
  emptyLabel,
}: {
  enemyHeroes: string[];
  selectedEnemy: string | null;
  onSelect: (hero: string | null) => void;
  allLabel: string;
  placeholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const availableSet = useMemo(() => new Set(enemyHeroes), [enemyHeroes]);

  const byRole = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const role of ROLE_ORDER) {
      const heroes = roleHeroMapping[role].filter((h) => availableSet.has(h));
      if (heroes.length > 0) groups[role] = heroes;
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
          aria-controls="ult-response-enemy-listbox"
          aria-label={allLabel}
          className="w-56 justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            {selectedEnemy ? (
              <>
                <Image
                  src={`/heroes/${toHero(selectedEnemy)}.png`}
                  alt={selectedEnemy}
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
                {selectedEnemy}
              </>
            ) : (
              allLabel
            )}
          </span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command
          filter={(value, search) => {
            const normalized = toHero(value);
            const normalizedSearch = toHero(search);
            return normalized.includes(normalizedSearch) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={placeholder} />
          <CommandList id="ult-response-enemy-listbox">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedEnemy === null ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true"
                />
                {allLabel}
              </CommandItem>
            </CommandGroup>
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
                        onSelect(val === selectedEnemy ? null : val);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedEnemy === hero ? "opacity-100" : "opacity-0"
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
