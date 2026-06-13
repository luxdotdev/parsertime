"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { MeterBar } from "@/components/faceit/viz";
import type { PatchEra } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

type Props = {
  eras: PatchEra[];
};

export function FaceitPatchTimeline({ eras }: Props) {
  const t = useTranslations("faceitScoutingPage.patches");
  const format = useFormatter();

  if (eras.length === 0) return null;

  // Only a pre-tracking bucket means no matches since patch tracking began.
  const hasPatchEra = eras.some((e) => e.patchType !== null);

  function eraLabel(era: PatchEra): string {
    if (era.patchType === null) return t("preTracking");
    if (era.patchType === "SEASON") return era.name;
    return t("midSeason", {
      date: era.startDate
        ? format.dateTime(era.startDate, { month: "short", day: "numeric" })
        : "",
    });
  }

  function dateRange(era: PatchEra): string | null {
    if (era.startDate == null) return t("through2025");
    const start = format.dateTime(era.startDate, {
      month: "short",
      day: "numeric",
    });
    const end = era.endDate
      ? format.dateTime(era.endDate, { month: "short", day: "numeric" })
      : t("now");
    return `${start} – ${end}`;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      {!hasPatchEra ? (
        <p className="text-muted-foreground text-sm">{t("noRecent")}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="px-4 py-2 text-left font-medium">{t("patch")}</th>
                <th
                  className="hidden w-40 px-4 py-2 text-left font-medium sm:table-cell"
                  aria-hidden="true"
                />
                <th className="px-4 py-2 text-right font-medium">
                  {t("winRate")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("matches")}
                </th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                  {t("mostBanned")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {eras.map((era) => {
                const isPre = era.patchType === null;
                const above = Math.round(era.winRate) >= 50;
                const tone = isPre || !era.rated ? "muted" : above ? "primary" : "destructive";
                return (
                  <tr
                    key={era.key}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      isPre && "text-muted-foreground"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "font-medium",
                            isPre ? "text-muted-foreground" : "text-foreground"
                          )}
                        >
                          {eraLabel(era)}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                          {dateRange(era)}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <MeterBar
                        value={era.winRate}
                        max={100}
                        referenceAt={0.5}
                        tone={tone}
                      />
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                        !isPre && era.rated && above && "text-primary",
                        !isPre && era.rated && !above && "text-destructive"
                      )}
                    >
                      {Math.round(era.winRate)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span className={isPre ? "" : "text-foreground"}>
                        {era.matches}
                      </span>
                      {!era.rated ? (
                        <span className="bg-muted text-muted-foreground ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase">
                          {t("lowSample")}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {era.topBans.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {era.topBans.map((b) => (
                            <span
                              key={b.hero}
                              className="border-border text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                            >
                              {b.hero}
                              <span className="text-foreground/60 ml-1">
                                {b.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 font-mono text-xs">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
