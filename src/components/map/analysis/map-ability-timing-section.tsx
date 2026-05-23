"use client";

import type {
  AbilityTimingAnalysis,
  AbilityTimingOutlier,
  AbilityTimingRow,
  FightPhase,
  MapAbilityTimingAnalysis,
} from "@/data/scrim/types";
import { cn, toHero } from "@/lib/utils";
import {
  ExclamationTriangleIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import { Info } from "lucide-react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import React, { useState } from "react";

const PHASE_ORDER: FightPhase[] = [
  "pre-fight",
  "early",
  "mid",
  "late",
  "cleanup",
];

const PHASE_KEYS: Record<FightPhase, string> = {
  "pre-fight": "preFight",
  early: "early",
  mid: "mid",
  late: "late",
  cleanup: "cleanup",
};

const MIN_FIGHTS = 3;

function getWinrateColor(winrate: number, hasFights: boolean): string {
  if (!hasFights) return "bg-muted";
  if (winrate < 45) return "bg-destructive/10";
  if (winrate < 55) return "bg-muted";
  if (winrate < 65) return "bg-emerald-500/10 dark:bg-emerald-500/15";
  return "bg-emerald-500/20 dark:bg-emerald-500/25";
}

function getWinrateTextColor(winrate: number, hasFights: boolean): string {
  if (!hasFights) return "text-muted-foreground";
  if (winrate < 45) return "text-destructive";
  if (winrate < 55) return "text-muted-foreground";
  return "text-emerald-600 dark:text-emerald-400";
}

function getOutlierBorder(
  row: AbilityTimingRow,
  phase: FightPhase,
  outliers: AbilityTimingOutlier[]
): string {
  const outlier = outliers.find(
    (o) =>
      o.heroName === row.heroName &&
      o.abilityName === row.abilityName &&
      o.phase === phase
  );
  if (!outlier) return "";
  return outlier.type === "negative"
    ? "ring-2 ring-destructive"
    : "ring-2 ring-emerald-500";
}

function OutlierInsight({ outlier }: { outlier: AbilityTimingOutlier }) {
  const t = useTranslations("mapPage.overview.analysis.abilityTiming");
  const formatter = useFormatter();
  const isNegative = outlier.type === "negative";
  const phase = t(`phase.${PHASE_KEYS[outlier.phase]}`);
  const bestPhase = t(`phase.${PHASE_KEYS[outlier.bestPhase]}`);
  const phaseWinrate = formatter.number(outlier.phaseWinrate / 100, {
    maximumFractionDigits: 0,
    style: "percent",
  });
  const bestPhaseWinrate = formatter.number(outlier.bestPhaseWinrate / 100, {
    maximumFractionDigits: 0,
    style: "percent",
  });

  return (
    <div className="bg-muted/60 border-border flex min-w-0 flex-1 items-start gap-2 rounded-lg border p-3">
      <span className="mt-0.5 shrink-0">
        {isNegative ? (
          <ExclamationTriangleIcon className="text-destructive h-3.5 w-3.5" />
        ) : (
          <LightningBoltIcon className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </span>
      <p className="text-foreground min-w-0 text-xs leading-relaxed">
        {isNegative ? (
          t.rich("negativeOutlier", {
            abilityName: outlier.abilityName,
            phase,
            phaseWinrate,
            bestPhase,
            bestPhaseWinrate,
            ability: (chunks) => (
              <span className="font-semibold">{chunks}</span>
            ),
            negativeRate: (chunks) => (
              <span className="text-destructive font-semibold">{chunks}</span>
            ),
            positiveRate: (chunks) => (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {chunks}
              </span>
            ),
          })
        ) : (
          t.rich("positiveOutlier", {
            abilityName: outlier.abilityName,
            phase,
            phaseWinrate,
            pattern:
              outlier.phase === "pre-fight"
                ? t("patternInitiation")
                : t("patternTiming"),
            ability: (chunks) => (
              <span className="font-semibold">{chunks}</span>
            ),
            positiveRate: (chunks) => (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {chunks}
              </span>
            ),
          })
        )}
      </p>
    </div>
  );
}

type HoveredCell = {
  team: "team1" | "team2";
  heroName: string;
  abilityName: string;
  phase: FightPhase;
};

function TeamHeatmap({
  analysis,
  teamName,
  teamColor,
  teamKey,
  hoveredCell,
  setHoveredCell,
}: {
  analysis: AbilityTimingAnalysis;
  teamName: string;
  teamColor: string;
  teamKey: "team1" | "team2";
  hoveredCell: HoveredCell | null;
  setHoveredCell: (cell: HoveredCell | null) => void;
}) {
  const t = useTranslations("mapPage.overview.analysis.abilityTiming");
  const formatter = useFormatter();
  if (analysis.rows.length === 0) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        {t("noTeamData", { teamName })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Team header */}
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: teamColor }}
        />
        <span className="text-sm font-semibold">{teamName}</span>
      </div>

      {/* Outlier insight cards */}
      {analysis.outliers.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {analysis.outliers.map((outlier) => (
            <OutlierInsight
              key={`${outlier.heroName}-${outlier.abilityName}-${outlier.phase}`}
              outlier={outlier}
            />
          ))}
        </div>
      )}

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `180px repeat(${PHASE_ORDER.length}, 1fr)`,
            }}
          >
            {/* Header row */}
            <div />
            {PHASE_ORDER.map((phase) => (
              <div
                key={phase}
                className="text-muted-foreground px-2 pb-2 text-center font-mono text-xs tracking-[0.06em] uppercase"
              >
                {t(`phase.${PHASE_KEYS[phase]}`)}
              </div>
            ))}

            {/* Data rows */}
            {analysis.rows.map((row) => (
              <React.Fragment key={`${row.heroName}-${row.abilitySlot}-row`}>
                <div
                  key={`${row.heroName}-${row.abilitySlot}-label`}
                  className="flex items-center gap-2 pr-2 text-sm"
                >
                  <div className="relative h-6 w-6 shrink-0">
                    <Image
                      src={`/heroes/${toHero(row.heroName)}.png`}
                      alt={row.heroName}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                  <span className="truncate font-medium">
                    {row.abilityName}
                  </span>
                </div>

                {PHASE_ORDER.map((phase) => {
                  const stats = row.phases[phase];
                  const hasFights = stats.fights >= MIN_FIGHTS;
                  const isHovered =
                    hoveredCell?.team === teamKey &&
                    hoveredCell?.heroName === row.heroName &&
                    hoveredCell?.abilityName === row.abilityName &&
                    hoveredCell?.phase === phase;

                  return (
                    <div
                      key={`${row.heroName}-${row.abilitySlot}-${phase}`}
                      className={cn(
                        "flex h-10 cursor-default items-center justify-center rounded transition-all",
                        getWinrateColor(stats.winrate, hasFights),
                        getWinrateTextColor(stats.winrate, hasFights),
                        getOutlierBorder(row, phase, analysis.outliers),
                        isHovered && "ring-primary ring-2"
                      )}
                      onMouseEnter={() =>
                        setHoveredCell({
                          team: teamKey,
                          heroName: row.heroName,
                          abilityName: row.abilityName,
                          phase,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      title={
                        hasFights
                          ? t("cellTitle", {
                              winrate: formatter.number(stats.winrate / 100, {
                                maximumFractionDigits: 0,
                                style: "percent",
                              }),
                              wins: stats.wins,
                              losses: stats.losses,
                              fights: stats.fights,
                            })
                          : t("fewerThanFights", { count: MIN_FIGHTS })
                      }
                    >
                      <span className="font-mono text-xs font-bold tabular-nums">
                        {hasFights
                          ? formatter.number(stats.winrate / 100, {
                              maximumFractionDigits: 0,
                              style: "percent",
                            })
                          : "-"}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapAbilityTimingSection({
  analysis,
  team1,
  team2,
}: {
  analysis: MapAbilityTimingAnalysis;
  team1: { name: string; color: string };
  team2: { name: string; color: string };
}) {
  const t = useTranslations("mapPage.overview.analysis.abilityTiming");
  const formatter = useFormatter();
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  const hasAnyData =
    analysis.team1.rows.length > 0 || analysis.team2.rows.length > 0;

  if (!hasAnyData) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {t("empty")}
      </div>
    );
  }

  const hoveredAnalysis =
    hoveredCell?.team === "team1" ? analysis.team1 : analysis.team2;
  const hoveredStats = hoveredCell
    ? hoveredAnalysis.rows.find(
        (r) =>
          r.heroName === hoveredCell.heroName &&
          r.abilityName === hoveredCell.abilityName
      )?.phases[hoveredCell.phase]
    : null;

  return (
    <div className="space-y-6">
      <TeamHeatmap
        analysis={analysis.team1}
        teamName={team1.name}
        teamColor={team1.color}
        teamKey="team1"
        hoveredCell={hoveredCell}
        setHoveredCell={setHoveredCell}
      />

      <TeamHeatmap
        analysis={analysis.team2}
        teamName={team2.name}
        teamColor={team2.color}
        teamKey="team2"
        hoveredCell={hoveredCell}
        setHoveredCell={setHoveredCell}
      />

      {/* Legend */}
      <div className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3">
        <span className="text-muted-foreground text-xs">
          {t("legendWinRate")}
        </span>
        <div className="flex items-center gap-1">
          <div className="bg-destructive/10 h-3 w-3 rounded-sm" />
          <span className="text-muted-foreground text-xs">&lt;45%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-muted h-3 w-3 rounded-sm" />
          <span className="text-muted-foreground text-xs">45-55%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/10 dark:bg-emerald-500/15" />
          <span className="text-muted-foreground text-xs">55-65%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/20 dark:bg-emerald-500/25" />
          <span className="text-muted-foreground text-xs">&gt;65%</span>
        </div>
        <span className="bg-border mx-1 h-3 w-px" />
        <div className="flex items-center gap-1">
          <div className="ring-destructive h-3 w-3 rounded-sm ring-2" />
          <span className="text-muted-foreground text-xs">
            {t("legendBadTiming")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm ring-2 ring-emerald-500" />
          <span className="text-muted-foreground text-xs">
            {t("legendGoodTiming")}
          </span>
        </div>
      </div>

      {/* Hover detail / info */}
      {hoveredCell && hoveredStats && hoveredStats.fights >= MIN_FIGHTS ? (
        <div className="bg-muted rounded-lg p-3 text-sm">
          {t.rich("hoverDetail", {
            abilityName: hoveredCell.abilityName,
            phase: t(`phase.${PHASE_KEYS[hoveredCell.phase]}`),
            winrate: formatter.number(hoveredStats.winrate / 100, {
              maximumFractionDigits: 0,
              style: "percent",
            }),
            fights: hoveredStats.fights,
            wins: hoveredStats.wins,
            losses: hoveredStats.losses,
            ability: (chunks) => (
              <span className="font-semibold">{chunks}</span>
            ),
            rate: (chunks) => (
              <span className="font-semibold tabular-nums">{chunks}</span>
            ),
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Info
            className="text-muted-foreground h-3.5 w-3.5 shrink-0"
            aria-hidden
          />
          <p className="text-muted-foreground text-xs">
            {t("info", { count: MIN_FIGHTS })}
          </p>
        </div>
      )}
    </div>
  );
}
