"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import type { PlayerMatchHistoryEntry } from "@/data/faceit/player-types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import Link from "next/link";

type Props = {
  entries: PlayerMatchHistoryEntry[];
};

const PAGE_SIZE = 20;

export function PlayerMatchHistory({ entries }: Props) {
  const t = useTranslations("faceitPlayerPage");
  const [page, setPage] = useState(0);

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader eyebrow={t("history.eyebrow")} title={t("history.title")} />
        <p className="text-muted-foreground text-sm">{t("history.empty")}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <SectionHeader eyebrow="History" title={t("history.title")} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("history.date")}</TableHead>
            <TableHead>{t("history.team")}</TableHead>
            <TableHead>{t("history.opponent")}</TableHead>
            <TableHead>{t("history.tier")}</TableHead>
            <TableHead>{t("history.score")}</TableHead>
            <TableHead>{t("history.result")}</TableHead>
            <TableHead>{t("history.role")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageEntries.map((entry) => {
            const teamHref =
              entry.teamId != null
                ? (`/faceit/team/${encodeURIComponent(entry.teamId)}` as Route)
                : null;

            return (
              <TableRow key={entry.matchId}>
                <TableCell className="tabular-nums text-sm whitespace-nowrap">
                  {entry.finishedAt instanceof Date
                    ? entry.finishedAt.toLocaleDateString()
                    : new Date(entry.finishedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">
                  {teamHref != null ? (
                    <Link
                      href={teamHref}
                      className="hover:text-primary underline underline-offset-2"
                    >
                      {entry.teamName ?? "—"}
                    </Link>
                  ) : (
                    (entry.teamName ?? "—")
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {entry.opponentName ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-sm">{entry.tier}</TableCell>
                <TableCell className="tabular-nums text-sm">{entry.score}</TableCell>
                <TableCell>
                  <Badge
                    variant={entry.won ? "default" : "secondary"}
                    className={cn(
                      "font-mono text-xs",
                      entry.won
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    {entry.won ? t("history.win") : t("history.loss")}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {entry.role ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
                aria-disabled={page === 0}
                className={cn(page === 0 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={i === page}
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
                aria-disabled={page === totalPages - 1}
                className={cn(
                  page === totalPages - 1 && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
