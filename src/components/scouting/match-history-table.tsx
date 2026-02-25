"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoutingMatchHistoryEntry } from "@/data/scouting-dto";
import { useTranslations } from "next-intl";
import { useState } from "react";

type MatchHistoryTableProps = {
  matches: ScoutingMatchHistoryEntry[];
};

const PAGE_SIZE = 10;

export function MatchHistoryTable({ matches }: MatchHistoryTableProps) {
  const t = useTranslations("scoutingPage.team.overview");
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const pageMatches = matches.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("matchHistory")}</CardTitle>
        <CardDescription>{t("matchHistoryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("opponent")}</TableHead>
                <TableHead className="text-center">{t("score")}</TableHead>
                <TableHead className="text-center">{t("result")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("tournament")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageMatches.map((match) => (
                <TableRow key={`${match.date.toISOString()}-${match.opponent}`}>
                  <TableCell className="tabular-nums">
                    {formatDate(match.date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{match.opponent}</span>
                    <span className="text-muted-foreground ml-1.5 hidden text-xs md:inline">
                      {match.opponentFullName}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {match.teamScore ?? "?"} &ndash;{" "}
                    {match.opponentScore ?? "?"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        match.result === "win" ? "default" : "destructive"
                      }
                      className="w-7 justify-center"
                    >
                      {match.result === "win" ? t("win") : t("loss")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[200px] truncate sm:table-cell">
                    {match.tournament}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("noMatches")}
          </p>
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("previousPage")}
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {t("pageInfo", { current: page + 1, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("nextPage")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
