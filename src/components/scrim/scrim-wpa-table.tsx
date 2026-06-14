"use client";

import { DivergingBar } from "@/components/faceit/viz";
import type { ScrimWpaEntry } from "@/data/map/match-story-service";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type SortKey = "player" | "team" | "maps" | "wpa";

/** Sortable header styled to match the FACEIT scouting tables: a tiny
 * uppercase mono label with a subtle chevron affordance, clickable to sort. */
function SortHeader({
  sortKey,
  label,
  className,
  sort,
  onToggle,
}: {
  sortKey: SortKey;
  label: string;
  className?: string;
  sort: { key: SortKey; desc: boolean };
  onToggle: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={cn("px-4 py-2 text-left font-medium", className)}
      aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className="hover:text-foreground inline-flex items-center gap-1 uppercase tracking-[0.16em] transition-colors"
      >
        {label}
        {active ? (
          sort.desc ? (
            <ChevronDownIcon className="size-3 shrink-0" />
          ) : (
            <ChevronUpIcon className="size-3 shrink-0" />
          )
        ) : (
          <ChevronUpDownIcon className="size-3 shrink-0 opacity-40" />
        )}
      </button>
    </th>
  );
}

/**
 * Flat, sortable WPA table mirroring the FACEIT scouting tables: a bordered
 * container, a muted uppercase header, and a per-row diverging bar so each
 * player's positive/negative contribution reads at a glance. Default sort is
 * WPA descending. `wpa` is a signed fraction (e.g. 0.12 → +12.0%).
 */
export function ScrimWpaTable({ wpa }: { wpa: ScrimWpaEntry[] }) {
  const t = useTranslations("scrimPage.wpa");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "wpa",
    desc: true,
  });

  function toggleSort(key: SortKey): void {
    setSort((prev) =>
      prev.key === key ? { key, desc: !prev.desc } : { key, desc: true }
    );
  }

  const sorted = useMemo(() => {
    function rank(p: ScrimWpaEntry): number | string {
      switch (sort.key) {
        case "player":
          return p.player;
        case "team":
          return p.team;
        case "maps":
          return p.maps;
        case "wpa":
          return p.wpa;
      }
    }
    const dir = sort.desc ? -1 : 1;
    return [...wpa].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      const cmp =
        typeof ra === "string" || typeof rb === "string"
          ? String(ra).localeCompare(String(rb))
          : ra - rb;
      return cmp === 0 ? a.player.localeCompare(b.player) : dir * cmp;
    });
  }, [wpa, sort]);

  // Largest absolute contribution fills the bar's half-width; everyone else
  // scales against it. Floored so an all-zero scrim doesn't divide by zero.
  const magnitude = Math.max(0.0001, ...wpa.map((p) => Math.abs(p.wpa)));

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            <SortHeader
              sortKey="player"
              label={t("columns.player")}
              sort={sort}
              onToggle={toggleSort}
            />
            <SortHeader
              sortKey="team"
              label={t("columns.team")}
              sort={sort}
              onToggle={toggleSort}
            />
            <th
              className="hidden w-40 px-4 py-2 text-left font-medium sm:table-cell"
              aria-hidden="true"
            />
            <SortHeader
              sortKey="wpa"
              label={t("columns.wpa")}
              className="text-right"
              sort={sort}
              onToggle={toggleSort}
            />
            <SortHeader
              sortKey="maps"
              label={t("columns.maps")}
              className="w-24 text-right"
              sort={sort}
              onToggle={toggleSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {sorted.map((p) => {
            const positive = p.wpa >= 0;
            return (
              <tr
                key={`${p.team}-${p.player}`}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="text-foreground px-4 py-3 font-medium">
                  {p.player}
                </td>
                <td className="text-muted-foreground px-4 py-3">{p.team}</td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <DivergingBar value={p.wpa} magnitude={magnitude} />
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                    positive ? "text-primary" : "text-destructive"
                  )}
                >
                  {positive ? "+" : "−"}
                  {Math.abs(p.wpa * 100).toFixed(1)}%
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                  {p.maps}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
