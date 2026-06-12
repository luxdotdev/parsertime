"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FightEntry,
  ObjectiveMarker,
} from "@/lib/win-probability/timeline";
import { CASCADE_MIN_WP } from "@/lib/win-probability/types";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

/** A capture this long after a fight's last kill still belongs to it — the
 * fight win is what enabled the capture. */
const CAPTURE_ATTACH_SECONDS = 12;

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
  objectiveMarkers,
  teams,
  team1Color,
  team2Color,
  focusFight,
  onFocusFight,
}: {
  fights: FightEntry[];
  objectiveMarkers: ObjectiveMarker[];
  teams: { team1: string; team2: string };
  team1Color: string;
  team2Color: string;
  focusFight: number | null;
  onFocusFight: (index: number | null) => void;
}) {
  const t = useTranslations("mapPage.matchStory.ledger");
  const tChart = useTranslations("mapPage.matchStory.chart");

  // Each capture belongs to the first fight whose window contains it.
  const capturesByFight = useMemo(() => {
    const ordered = [...fights].sort((a, b) => a.start - b.start);
    const map = new Map<number, ObjectiveMarker[]>();
    for (const marker of objectiveMarkers) {
      const fight = ordered.find(
        (f) =>
          marker.t >= f.start && marker.t <= f.end + CAPTURE_ATTACH_SECONDS
      );
      if (fight === undefined) continue;
      const list = map.get(fight.index) ?? [];
      list.push(marker);
      map.set(fight.index, list);
    }
    return map;
  }, [fights, objectiveMarkers]);
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
          <TableHead>{t("context")}</TableHead>
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
          // Show any carryover ≥1 point (dim); ≥ the insight threshold reads
          // emphasized. Hiding sub-threshold values entirely erased real
          // information on modes where ult economy moves map WP only a little.
          const carryParts: { text: string; strong: boolean }[] = [];
          if (f.carryover !== null) {
            for (const [label, value] of [
              [t("ultEconomy"), f.carryover.ultEconomy],
              [t("stagger"), f.carryover.stagger],
            ] as const) {
              if (Math.abs(value) >= 0.005) {
                carryParts.push({
                  text: `${label} ${value > 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(0)}%`,
                  strong: Math.abs(value) >= CASCADE_MIN_WP,
                });
              }
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
              <TableCell className="text-xs">
                {(() => {
                  const captures = capturesByFight.get(f.index) ?? [];
                  if (captures.length === 0 && carryParts.length === 0) {
                    return <span className="text-muted-foreground">—</span>;
                  }
                  return (
                    <span className="flex flex-col gap-0.5">
                      {captures.map((c) => (
                        <span
                          key={`${c.t}-${c.team}`}
                          className="flex items-center gap-1.5"
                          title={tChart("capture", { team: c.team })}
                        >
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rotate-45"
                            style={{
                              backgroundColor:
                                c.team === teams.team1
                                  ? team1Color
                                  : team2Color,
                            }}
                          />
                          {tChart("capture", { team: c.team })}
                        </span>
                      ))}
                      {carryParts.map((part) => (
                        <span
                          key={part.text}
                          className={
                            part.strong
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {part.text}
                        </span>
                      ))}
                    </span>
                  );
                })()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
