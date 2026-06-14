"use client";

import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import type { PlayerWpa } from "@/lib/win-probability/timeline";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type SortKey = "player" | "wpa";

/** Sortable label styled to match the FACEIT scouting tables: a tiny uppercase
 * mono header with a subtle chevron affordance, clickable to sort. Lives in a
 * grid cell (this table keeps its expandable <details> rows, not a <table>). */
function SortButton({
  sortKey,
  label,
  align = "left",
  sort,
  onToggle,
}: {
  sortKey: SortKey;
  label: string;
  align?: "left" | "right";
  sort: { key: SortKey; desc: boolean };
  onToggle: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        "hover:text-foreground inline-flex items-center gap-1 uppercase tracking-[0.16em] transition-colors",
        align === "right" && "justify-self-end"
      )}
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
  );
}

export function WpaTable({
  wpa,
  teams,
  team1Color,
  team2Color,
}: {
  wpa: PlayerWpa[];
  teams: { team1: string; team2: string };
  team1Color: string;
  team2Color: string;
}) {
  const t = useTranslations("mapPage.matchStory.wpa");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "wpa",
    desc: true,
  });

  function toggleSort(key: SortKey): void {
    setSort((prev) =>
      prev.key === key ? { key, desc: !prev.desc } : { key, desc: true }
    );
  }

  const maxWpa = Math.max(0.001, ...wpa.map((p) => Math.abs(p.wpa)));
  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    return [...wpa].sort((a, b) => {
      const cmp =
        sort.key === "player"
          ? a.player.localeCompare(b.player)
          : a.wpa - b.wpa;
      return cmp === 0 ? a.player.localeCompare(b.player) : dir * cmp;
    });
  }, [wpa, sort]);

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <div className="text-muted-foreground bg-muted/30 border-border grid grid-cols-[8rem_1fr_4.5rem] items-center gap-3 border-b px-4 py-2 font-mono text-[10px] tracking-[0.16em] uppercase">
        <SortButton
          sortKey="player"
          label={t("player")}
          sort={sort}
          onToggle={toggleSort}
        />
        <span aria-hidden className="text-center">
          − / +
        </span>
        <SortButton
          sortKey="wpa"
          label={t("total")}
          align="right"
          sort={sort}
          onToggle={toggleSort}
        />
      </div>
      {sorted.map((p) => {
        const teamColor =
          p.team === teams.team1
            ? team1Color
            : p.team === teams.team2
              ? team2Color
              : "var(--muted-foreground)";
        const half = Math.min(1, Math.abs(p.wpa) / maxWpa) * 50;
        return (
          <details
            key={`${p.team}-${p.player}`}
            className="border-border group border-b last:border-b-0"
          >
            <summary className="hover:bg-muted/30 grid cursor-pointer grid-cols-[8rem_1fr_4.5rem] items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 motion-reduce:transition-none">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: teamColor }}
                />
                <span className="truncate">{p.player}</span>
              </span>
              <span
                aria-hidden
                className="bg-muted relative block h-1.5 overflow-hidden rounded-full"
              >
                <span className="bg-border absolute inset-y-0 left-1/2 w-px" />
                <span
                  className="absolute inset-y-0"
                  style={{
                    backgroundColor: teamColor,
                    left: p.wpa >= 0 ? "50%" : `${50 - half}%`,
                    width: `${half}%`,
                  }}
                />
              </span>
              <span className="text-right font-mono text-sm tabular-nums">
                {p.wpa >= 0 ? "+" : "−"}
                {Math.abs(p.wpa * 100).toFixed(1)}%
              </span>
            </summary>
            <ul className="text-muted-foreground grid grid-cols-2 gap-x-6 px-4 pb-2 pl-7 text-xs sm:grid-cols-3">
              {p.byFight.map((share) => (
                <li key={share.fightIndex} className="font-mono tabular-nums">
                  {t("fightShare", {
                    fight: share.fightIndex + 1,
                    share: (share.share * 100).toFixed(1),
                  })}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
