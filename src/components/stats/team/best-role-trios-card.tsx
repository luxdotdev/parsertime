"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { RoleTrio } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Fragment, useState } from "react";

type BestRoleTriosCardProps = {
  trios: RoleTrio[];
};

function winrateClass(winrate: number): string {
  if (winrate >= 60) return "text-primary";
  if (winrate < 50) return "text-destructive";
  return "text-foreground";
}

export function BestRoleTriosCard({ trios }: BestRoleTriosCardProps) {
  const t = useTranslations("teamStatsPage.bestRoleTriosCard");
  const format = useFormatter();
  const [expandedTrios, setExpandedTrios] = useState<Set<number>>(new Set([0]));

  function formatPercent(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  if (trios.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  function toggleTrio(index: number) {
    setExpandedTrios((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="w-12 px-4 py-2 text-left font-medium">
                {t("rank")}
              </th>
              <th className="px-4 py-2 text-left font-medium">{t("roster")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("games")}</th>
              <th className="px-4 py-2 text-right font-medium">
                {t("recordHeader")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("winrateHeader")}
              </th>
              <th className="w-10 px-4 py-2" aria-label={t("toggleDetails")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {trios.map((trio, index) => {
              const isOpen = expandedTrios.has(index);
              const rosterPreview = [
                trio.tank,
                trio.dps1,
                trio.dps2,
                trio.support1,
                trio.support2,
              ].join(", ");
              const detailId = `trio-detail-${index}`;

              return (
                <Fragment
                  key={`${trio.tank}-${trio.dps1}-${trio.dps2}-${trio.support1}-${trio.support2}`}
                >
                  <tr
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => toggleTrio(index)}
                  >
                    <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{rosterPreview}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {format.number(trio.gamesPlayed)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {t("record", { wins: trio.wins, losses: trio.losses })}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                        winrateClass(trio.winrate)
                      )}
                    >
                      {formatPercent(trio.winrate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={detailId}
                        aria-label={
                          isOpen
                            ? t("collapseTrio", { rank: index + 1 })
                            : t("expandTrio", { rank: index + 1 })
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleTrio(index);
                        }}
                        className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr id={detailId} className="bg-muted/20">
                      <td colSpan={6} className="px-4 py-4">
                        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                              {t("tank")}
                            </dt>
                            <dd className="text-foreground font-medium">
                              {trio.tank}
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                              {t("damage")}
                            </dt>
                            <dd className="text-foreground space-y-0.5 font-medium">
                              <div>{trio.dps1}</div>
                              <div>{trio.dps2}</div>
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                              {t("support")}
                            </dt>
                            <dd className="text-foreground space-y-0.5 font-medium">
                              <div>{trio.support1}</div>
                              <div>{trio.support2}</div>
                            </dd>
                          </div>
                        </dl>
                        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-[0.12em] uppercase">
                          <span>
                            {t("gamesPlayed", { count: trio.gamesPlayed })}
                          </span>
                          <span>
                            {t("wins", { count: trio.wins })} ·{" "}
                            {t("losses", { count: trio.losses })}
                          </span>
                          <span className={cn(winrateClass(trio.winrate))}>
                            {t("winRateValue", {
                              winrate: formatPercent(trio.winrate),
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
