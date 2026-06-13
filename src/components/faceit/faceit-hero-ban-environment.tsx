"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import type { HeroBanEnvironmentEntry } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

type FaceitHeroBanEnvironmentProps = {
  entries: HeroBanEnvironmentEntry[];
};

export function FaceitHeroBanEnvironment({ entries }: FaceitHeroBanEnvironmentProps) {
  const t = useTranslations("faceitScoutingPage");
  const [showUnrated, setShowUnrated] = useState(false);

  const ratedEntries = entries.filter((e) => e.rated);
  const unratedEntries = entries.filter((e) => !e.rated);
  const visibleEntries = showUnrated ? entries : ratedEntries;

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("bans.title")}</CardTitle>
          <CardDescription>{t("bans.caveat")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("bans.hero")}</TableHead>
                <TableHead className="text-right">{t("bans.withBan")}</TableHead>
                <TableHead className="text-right">{t("bans.withoutBan")}</TableHead>
                <TableHead className="text-right">{t("bans.delta")}</TableHead>
                <TableHead className="text-right">{t("bans.sample")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => (
                <TableRow
                  key={entry.hero}
                  className={cn(!entry.rated && "text-muted-foreground")}
                >
                  <TableCell className="font-medium">{entry.hero}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.bannedWinRate.toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.notBannedWinRate.toFixed(0)}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      entry.delta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : entry.delta < 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                    )}
                  >
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta.toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {entry.bannedPlayed}/{entry.notBannedPlayed}
                  </TableCell>
                </TableRow>
              ))}
              {visibleEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {unratedEntries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnrated((v) => !v)}
            >
              {t("bans.showUnrated")}
              {showUnrated && (
                <Badge variant="secondary" className="ml-1.5">
                  {unratedEntries.length}
                </Badge>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
