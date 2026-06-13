"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import type { FaceitMapAnalysis } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type FaceitMapPerformanceProps = {
  analysis: FaceitMapAnalysis;
};

export function FaceitMapPerformance({ analysis }: FaceitMapPerformanceProps) {
  const t = useTranslations("faceitScoutingPage");

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("maps.byMap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("maps.map")}</TableHead>
                <TableHead className="text-right">{t("maps.played")}</TableHead>
                <TableHead className="text-right">{t("maps.won")}</TableHead>
                <TableHead className="text-right">{t("maps.winRate")}</TableHead>
                <TableHead className="text-right">{t("maps.weighted")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.byMap.map((entry) => (
                <TableRow
                  key={entry.key}
                  className={cn(!entry.rated && "text-muted-foreground")}
                >
                  <TableCell className="font-medium">
                    {entry.key}
                    {!entry.rated && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {t("maps.lowSample")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{entry.played}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.won}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.winRate.toFixed(0)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.weightedWinRate.toFixed(0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("maps.byType")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("maps.mode")}</TableHead>
                <TableHead className="text-right">{t("maps.played")}</TableHead>
                <TableHead className="text-right">{t("maps.won")}</TableHead>
                <TableHead className="text-right">{t("maps.winRate")}</TableHead>
                <TableHead className="text-right">{t("maps.weighted")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.byType.map((entry) => (
                <TableRow
                  key={entry.key}
                  className={cn(!entry.rated && "text-muted-foreground")}
                >
                  <TableCell className="font-medium">
                    {entry.key}
                    {!entry.rated && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {t("maps.lowSample")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{entry.played}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.won}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.winRate.toFixed(0)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.weightedWinRate.toFixed(0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("maps.attackDefense")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("maps.attacking")}</p>
              <p className="text-2xl font-bold tabular-nums">
                {analysis.attackDefense.attackWinRate.toFixed(0)}%
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                {analysis.attackDefense.attackWon}/{analysis.attackDefense.attackPlayed} maps
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("maps.defending")}</p>
              <p className="text-2xl font-bold tabular-nums">
                {analysis.attackDefense.defenseWinRate.toFixed(0)}%
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                {analysis.attackDefense.defenseWon}/{analysis.attackDefense.defensePlayed} maps
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
