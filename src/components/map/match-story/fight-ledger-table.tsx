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
import { useMemo, useState } from "react";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Inline diverging bar: zero-centered, width ∝ |swing|, hue = gaining team. */
function SwingBar({
  swing,
  maxSwing,
  team1Color,
  team2Color,
}: {
  swing: number;
  maxSwing: number;
  team1Color: string;
  team2Color: string;
}) {
  const half = Math.min(1, Math.abs(swing) / maxSwing) * 50;
  const color = swing >= 0 ? team1Color : team2Color;
  return (
    <span aria-hidden className="bg-muted relative block h-1.5 w-24">
      <span className="bg-border absolute inset-y-0 left-1/2 w-px" />
      <span
        className="absolute inset-y-0"
        style={{
          backgroundColor: color,
          left: swing >= 0 ? "50%" : `${50 - half}%`,
          width: `${half}%`,
        }}
      />
    </span>
  );
}

export function FightLedgerTable({
  fights,
  teams,
  team1Color,
  team2Color,
  focusFight,
  onFocusFight,
}: {
  fights: FightEntry[];
  teams: { team1: string; team2: string };
  team1Color: string;
  team2Color: string;
  focusFight: number | null;
  onFocusFight: (index: number | null) => void;
}) {
  const t = useTranslations("mapPage.matchStory.ledger");
  const [sortBySwing, setSortBySwing] = useState(true);
  const sorted = useMemo(
    () =>
      [...fights].sort((a, b) =>
        sortBySwing ? Math.abs(b.swing) - Math.abs(a.swing) : a.start - b.start
      ),
    [fights, sortBySwing]
  );
  const hasZones = fights.some((f) => f.zoneName !== null);
  const maxSwing = Math.max(0.01, ...fights.map((f) => Math.abs(f.swing)));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">{t("fight")}</TableHead>
          <TableHead className="w-20">
            <button
              type="button"
              onClick={() => setSortBySwing(false)}
              className={sortBySwing ? "" : "text-foreground"}
            >
              {t("time")}
              {sortBySwing ? "" : " ↓"}
            </button>
          </TableHead>
          {hasZones ? <TableHead>{t("zone")}</TableHead> : null}
          <TableHead>{t("result")}</TableHead>
          <TableHead>
            <button
              type="button"
              onClick={() => setSortBySwing(true)}
              className={sortBySwing ? "text-foreground" : ""}
            >
              {t("swing")}
              {sortBySwing ? " ↓" : ""}
            </button>
          </TableHead>
          <TableHead className="w-20 text-right">{t("ults")}</TableHead>
          <TableHead>{t("carryover")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody onMouseLeave={() => onFocusFight(null)}>
        {sorted.map((f) => {
          const winnerColor =
            f.winner === teams.team1
              ? team1Color
              : f.winner === teams.team2
                ? team2Color
                : null;
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
            <TableRow
              key={f.index}
              data-state={focusFight === f.index ? "selected" : undefined}
              onMouseEnter={() => onFocusFight(f.index)}
              className="cursor-default"
            >
              <TableCell className="font-mono tabular-nums">
                {f.index + 1}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatClock(f.start)}
              </TableCell>
              {hasZones ? <TableCell>{f.zoneName ?? "—"}</TableCell> : null}
              <TableCell>
                {winnerColor !== null ? (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: winnerColor }}
                    />
                    {f.winner}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("even")}</span>
                )}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-3">
                  <SwingBar
                    swing={f.swing}
                    maxSwing={maxSwing}
                    team1Color={team1Color}
                    team2Color={team2Color}
                  />
                  <span className="w-12 text-right font-mono tabular-nums">
                    {f.swing >= 0 ? "+" : "−"}
                    {Math.abs(f.swing * 100).toFixed(0)}%
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
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
