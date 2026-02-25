"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import type { UnlabeledMatchesResult } from "@/data/data-labeling-dto";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

type UnlabeledMatchListProps = {
  initialData: UnlabeledMatchesResult;
};

const PAGE_SIZE = 20;

export function UnlabeledMatchList({ initialData }: UnlabeledMatchListProps) {
  const t = useTranslations("dataLabeling.matchList");
  const [data] = useState(initialData);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));
  const pageMatches = data.matches.slice(
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
        <CardTitle className="flex items-center justify-between">
          <span>{t("title", { defaultMessage: "Unlabeled Matches" })}</span>
          <Badge variant="outline" className="tabular-nums">
            {data.totalCount} matches
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.matches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("teams")}</TableHead>
                <TableHead className="text-center">{t("score")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("tournament")}
                </TableHead>
                <TableHead className="text-center">{t("progress")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageMatches.map((match) => (
                <TableRow key={match.id} className="group">
                  <TableCell className="tabular-nums">
                    {formatDate(match.matchDate)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/data-labeling/match/${match.id}` as Route}
                      className="group-hover:text-primary font-medium underline-offset-4 group-hover:underline"
                    >
                      {match.team1} {t("vs")} {match.team2}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {match.team1Score ?? "?"} &ndash;{" "}
                    {match.team2Score ?? "?"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[200px] truncate sm:table-cell">
                    {match.tournament}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        match.labeledMaps === match.totalMaps
                          ? "default"
                          : "secondary"
                      }
                      className="tabular-nums"
                    >
                      {match.labeledMaps}/{match.totalMaps}
                    </Badge>
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
