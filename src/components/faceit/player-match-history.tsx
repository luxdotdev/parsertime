"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { PlayerMatchHistoryEntry } from "@/data/faceit/player-types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import type { Route } from "next";
import Link from "next/link";

type Props = {
  entries: PlayerMatchHistoryEntry[];
};

const PAGE_SIZE = 20;

export function PlayerMatchHistory({ entries }: Props) {
  const t = useTranslations("faceitPlayerPage");
  const format = useFormatter();
  const [page, setPage] = useState(0);

  if (entries.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("history.eyebrow")}
          title={t("history.title")}
        />
        <p className="text-muted-foreground text-sm">{t("history.empty")}</p>
      </section>
    );
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages - 1);
  const pageEntries = entries.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("history.eyebrow")}
        title={t("history.title")}
        description={t("history.count", { count: entries.length })}
      />
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="w-16 px-4 py-2 text-left font-medium">
                {t("history.result")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("history.team")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("history.opponent")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("history.tier")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("history.score")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("history.role")}
              </th>
              <th className="w-24 px-4 py-2 text-right font-medium">
                {t("history.date")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {pageEntries.map((entry) => {
              const teamHref =
                entry.teamId != null
                  ? (`/faceit/team/${encodeURIComponent(entry.teamId)}` as Route)
                  : null;
              const date =
                entry.finishedAt instanceof Date
                  ? entry.finishedAt
                  : new Date(entry.finishedAt);

              return (
                <tr
                  key={entry.matchId}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase tabular-nums",
                        entry.won
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {entry.won ? t("history.win") : t("history.loss")}
                    </span>
                  </td>
                  <td className="text-foreground px-4 py-3 font-medium">
                    {teamHref != null ? (
                      <Link
                        href={teamHref}
                        className="hover:text-primary underline-offset-2 hover:underline"
                      >
                        {entry.teamName ?? "—"}
                      </Link>
                    ) : (
                      (entry.teamName ?? "—")
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {entry.opponentName ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 font-mono">
                    {entry.tier}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {entry.score}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 font-mono">
                    {entry.role ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {format.dateTime(date, { month: "short", day: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(0, p - 1));
                }}
                aria-disabled={safePage === 0}
                className={cn(
                  safePage === 0 && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={i === safePage}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(i);
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                }}
                aria-disabled={safePage === totalPages - 1}
                className={cn(
                  safePage === totalPages - 1 &&
                    "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}
