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
import type { FaceitRosterPlayer } from "@/data/faceit/types";
import { useTranslations } from "next-intl";

type FaceitRosterProps = {
  roster: FaceitRosterPlayer[];
};

export function FaceitRoster({ roster }: FaceitRosterProps) {
  const t = useTranslations("faceitScoutingPage");

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("tabs.roster")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("roster.player")}</TableHead>
                <TableHead>{t("roster.role")}</TableHead>
                <TableHead className="text-right">{t("roster.share")}</TableHead>
                <TableHead></TableHead>
                <TableHead className="text-right">{t("roster.fsr")}</TableHead>
                <TableHead className="text-right">{t("roster.tsr")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((player) => (
                <TableRow key={player.faceitPlayerId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{player.nickname}</p>
                      {player.battletag && (
                        <p className="text-muted-foreground text-xs">{player.battletag}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{player.role ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {(player.appearanceShare * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={player.starter ? "default" : "secondary"}>
                      {player.starter ? t("roster.starter") : t("roster.sub")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {player.fsr ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {player.tsr ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
