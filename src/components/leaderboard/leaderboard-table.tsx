"use client";

import { PlayerHoverCard } from "@/components/player/hover-card";
import { cn } from "@/lib/utils";
import Link from "next/link";

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  percentile: string;
  role: string;
  hero: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  taken_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
  maps: number;
  minutes_played: number;
};

type Props = {
  data: LeaderboardPlayer[];
  role?: "Tank" | "Damage" | "Support";
  selectedPlayer: LeaderboardPlayer | null;
  onPlayerSelect: (player: LeaderboardPlayer) => void;
};

const COLS_BASE =
  "grid-cols-[2.5rem_minmax(0,1fr)_4rem_3.5rem_4.5rem_4.5rem]";
const COLS_FOUR = `${COLS_BASE} sm:grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4rem_5rem_5rem_5rem]`;
const COLS_FIVE = `${COLS_BASE} sm:grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4rem_5rem_5rem_5rem_5rem]`;

export function LeaderboardTable({
  data,
  role,
  selectedPlayer,
  onPlayerSelect,
}: Props) {
  const cols = role === "Damage" ? COLS_FOUR : COLS_FIVE;
  const extraColLabel =
    role === "Support" ? "Heal/10" : role === "Tank" ? "Block/10" : null;

  return (
    <section>
      <div
        className={cn(
          "text-muted-foreground border-border grid items-center gap-4 border-b pb-3 font-mono text-[11px] tracking-[0.14em] uppercase",
          cols
        )}
      >
        <div>#</div>
        <div>Player</div>
        <div className="text-right">SR</div>
        <div className="text-right">Maps</div>
        <div className="hidden text-right sm:block">Time</div>
        <div className="text-right">Elims/10</div>
        <div className="text-right">Dmg/10</div>
        {extraColLabel ? (
          <div className="hidden text-right sm:block">{extraColLabel}</div>
        ) : null}
      </div>

      {data.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No players found.
        </div>
      ) : (
        <ul>
          {data.map((row, index) => (
            <Row
              key={row.player_name}
              row={row}
              index={index}
              role={role}
              cols={cols}
              selected={selectedPlayer?.player_name === row.player_name}
              onSelect={() => onPlayerSelect(row)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  row,
  index,
  role,
  cols,
  selected,
  onSelect,
}: {
  row: LeaderboardPlayer;
  index: number;
  role?: "Tank" | "Damage" | "Support";
  cols: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isTop = index === 0;
  const rank = String(row.rank).padStart(2, "0");

  function handleKey(e: React.KeyboardEvent<HTMLLIElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <li
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={handleKey}
      className={cn(
        "border-border group grid cursor-pointer items-center gap-4 border-b py-3 transition-colors",
        "focus-visible:bg-muted/60 focus-visible:outline-none",
        selected ? "bg-primary/[0.06]" : "hover:bg-muted/40",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:[animation-fill-mode:both]",
        cols
      )}
      style={{ animationDelay: `${Math.min(index, 20) * 15}ms` }}
    >
      <div
        className={cn(
          "font-mono text-sm tabular-nums",
          isTop ? "text-primary" : "text-muted-foreground"
        )}
      >
        {rank}
      </div>

      <div className="min-w-0">
        <PlayerHoverCard player={row.player_name}>
          <Link
            href={`/profile/${row.player_name}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "block min-w-0 truncate leading-tight font-medium hover:underline",
              isTop && "text-primary"
            )}
          >
            {row.player_name}
          </Link>
        </PlayerHoverCard>
      </div>

      <div
        className={cn(
          "text-right font-mono text-base tabular-nums",
          isTop ? "text-primary font-semibold" : "font-medium"
        )}
      >
        {row.composite_sr}
      </div>

      <div className="text-right font-mono text-sm tabular-nums">
        {row.maps}
      </div>

      <div className="text-muted-foreground hidden text-right font-mono text-sm tabular-nums sm:block">
        {Math.round(row.minutes_played)}
      </div>

      <div className="text-right font-mono text-sm tabular-nums">
        {row.elims_per10?.toFixed(2) ?? "—"}
      </div>

      <div className="text-right font-mono text-sm tabular-nums">
        {Math.round(row.damage_per10).toLocaleString()}
      </div>

      {role === "Support" ? (
        <div className="hidden text-right font-mono text-sm tabular-nums sm:block">
          {Math.round(row.healing_per10 ?? 0).toLocaleString()}
        </div>
      ) : null}
      {role === "Tank" ? (
        <div className="hidden text-right font-mono text-sm tabular-nums sm:block">
          {Math.round(row.blocked_per10 ?? 0).toLocaleString()}
        </div>
      ) : null}
    </li>
  );
}
