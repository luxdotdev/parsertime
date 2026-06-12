"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FightEntry } from "@/lib/win-probability/timeline";
import { CASCADE_MIN_WP } from "@/lib/win-probability/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FightLedgerTable({
  fights,
  team1,
}: {
  fights: FightEntry[];
  team1: string;
}) {
  const t = useTranslations("mapPage.matchStory.ledger");
  const [sortBySwing, setSortBySwing] = useState(true);
  const sorted = [...fights].sort((a, b) =>
    sortBySwing ? Math.abs(b.swing) - Math.abs(a.swing) : a.start - b.start
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("fight")}</TableHead>
          <TableHead>
            <button
              type="button"
              onClick={() => setSortBySwing(false)}
              className={sortBySwing ? "" : "text-primary"}
            >
              {t("time")}
            </button>
          </TableHead>
          <TableHead>{t("zone")}</TableHead>
          <TableHead>{t("result")}</TableHead>
          <TableHead>
            <button
              type="button"
              onClick={() => setSortBySwing(true)}
              className={sortBySwing ? "text-primary" : ""}
            >
              {t("swing")}
            </button>
          </TableHead>
          <TableHead>{t("ults")}</TableHead>
          <TableHead>{t("carryover")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((f) => {
          const result =
            f.winner === null
              ? t("even")
              : f.winner === team1
                ? t("won")
                : t("lost");
          const carryParts: string[] = [];
          if (f.carryover !== null) {
            if (Math.abs(f.carryover.ultEconomy) >= CASCADE_MIN_WP) {
              carryParts.push(
                `${t("ultEconomy")} ${(f.carryover.ultEconomy * 100).toFixed(0)}%`
              );
            }
            if (Math.abs(f.carryover.stagger) >= CASCADE_MIN_WP) {
              carryParts.push(
                `${t("stagger")} ${(f.carryover.stagger * 100).toFixed(0)}%`
              );
            }
          }
          return (
            <TableRow key={f.index}>
              <TableCell className="font-mono tabular-nums">
                {f.index + 1}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatClock(f.start)}
              </TableCell>
              <TableCell>{f.zoneName ?? "—"}</TableCell>
              <TableCell>{result}</TableCell>
              <TableCell
                className={`font-mono tabular-nums ${f.swing >= 0 ? "text-primary" : "text-destructive"}`}
              >
                {f.swing >= 0 ? "+" : ""}
                {(f.swing * 100).toFixed(0)}%
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {f.ultsSpentTeam1}–{f.ultsSpentTeam2}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {carryParts.length > 0 ? carryParts.join(", ") : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
