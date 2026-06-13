"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type {
  ScoutingMatchHistoryEntry,
  ScoutingTeamOverview as Overview,
} from "@/data/scouting/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  overview: Overview;
  matchHistory: ScoutingMatchHistoryEntry[];
};

const PAGE_SIZE = 10;

export function ScoutingTeamOverview({ overview, matchHistory }: Props) {
  const t = useTranslations("scoutingPage.team.overview");
  const format = useFormatter();
  const [page, setPage] = useState(0);

  const form = stableFormKeys(overview.recentForm);
  const totalPages = Math.max(1, Math.ceil(matchHistory.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visible = matchHistory.slice(start, start + PAGE_SIZE);

  return (
    <section className="space-y-5">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />

      <div className="space-y-3">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("recentForm")}
        </p>
        {form.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label={t("recentForm")}>
            {form.map(({ key, result }) => (
              <span
                key={key}
                role="listitem"
                className={cn(
                  "flex size-7 items-center justify-center rounded-sm font-mono text-xs font-semibold",
                  result === "win"
                    ? "bg-primary/15 text-primary"
                    : "bg-destructive/15 text-destructive"
                )}
              >
                {result === "win" ? t("win") : t("loss")}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noMatches")}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("matchHistory")}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("matchHistoryDescription")}
          </p>
        </div>

        {matchHistory.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noMatches")}</p>
        ) : (
          <>
            <div className="border-border overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                    <th className="px-4 py-2 text-left font-medium">{t("date")}</th>
                    <th className="px-4 py-2 text-left font-medium">
                      {t("opponent")}
                    </th>
                    <th className="px-4 py-2 text-center font-medium">
                      {t("result")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t("score")}
                    </th>
                    <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                      {t("tournament")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visible.map((m) => {
                    const won = m.result === "win";
                    return (
                      <tr
                        key={`${m.date.toISOString()}-${m.opponent}-${m.tournament}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="text-muted-foreground px-4 py-3 font-mono text-xs whitespace-nowrap tabular-nums">
                          {format.dateTime(m.date, {
                            year: "2-digit",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-foreground font-medium">
                            {m.opponent}
                          </span>
                          <span className="text-muted-foreground ml-1.5 hidden text-xs sm:inline">
                            {m.opponentFullName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "font-mono text-xs font-semibold",
                              won ? "text-primary" : "text-destructive"
                            )}
                          >
                            {won ? t("win") : t("loss")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {m.teamScore != null && m.opponentScore != null ? (
                            <span>
                              <span
                                className={won ? "text-foreground" : "text-muted-foreground"}
                              >
                                {m.teamScore}
                              </span>
                              <span className="text-muted-foreground/60">–</span>
                              <span
                                className={!won ? "text-foreground" : "text-muted-foreground"}
                              >
                                {m.opponentScore}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="text-muted-foreground hidden max-w-[16rem] truncate px-4 py-3 text-xs md:table-cell">
                          {m.tournament}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-muted-foreground enabled:hover:text-foreground font-mono text-[11px] tracking-[0.16em] uppercase transition-colors disabled:opacity-40"
                >
                  {t("previousPage")}
                </button>
                <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                  {t("pageInfo", { current: page + 1, total: totalPages })}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-muted-foreground enabled:hover:text-foreground font-mono text-[11px] tracking-[0.16em] uppercase transition-colors disabled:opacity-40"
                >
                  {t("nextPage")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function stableFormKeys(form: ("win" | "loss")[]) {
  const counts = new Map<string, number>();
  return form.map((result) => {
    const n = (counts.get(result) ?? 0) + 1;
    counts.set(result, n);
    return { key: `${result}-${n}`, result };
  });
}
