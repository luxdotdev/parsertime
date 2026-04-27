"use client";

import { LeaderboardSubnav } from "@/components/leaderboard/leaderboard-subnav";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TsrLeaderboardRow,
  TsrLeaderboardSnapshot,
} from "@/lib/tsr/leaderboard";
import { cn } from "@/lib/utils";
import { FaceitTier, TsrRegion } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  snapshot: TsrLeaderboardSnapshot;
};

type RegionFilter = "All" | TsrRegion;
type TierFilter = "All" | FaceitTier;
type SortKey = "rating" | "matches" | "recent";

const REGION_PILLS: { value: RegionFilter; label: string }[] = [
  { value: "All", label: "All regions" },
  { value: TsrRegion.NA, label: "NA" },
  { value: TsrRegion.EMEA, label: "EMEA" },
  { value: TsrRegion.OTHER, label: "Other" },
];

const TIER_PILLS: { value: TierFilter; label: string }[] = [
  { value: "All", label: "All tiers" },
  { value: FaceitTier.OWCS, label: "OWCS" },
  { value: FaceitTier.MASTERS, label: "Masters" },
  { value: FaceitTier.EXPERT, label: "Expert" },
  { value: FaceitTier.ADVANCED, label: "Advanced" },
  { value: FaceitTier.OPEN, label: "Open" },
  { value: FaceitTier.CAH, label: "CAH" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "Rating" },
  { value: "matches", label: "Total matches" },
  { value: "recent", label: "Recent activity" },
];

const TIER_LABEL: Record<FaceitTier, string> = {
  UNCLASSIFIED: "—",
  OPEN: "Open",
  CAH: "CAH",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
  MASTERS: "Masters",
  OWCS: "OWCS",
};

const COLS =
  "grid-cols-[2.5rem_minmax(0,1fr)_4rem_5.5rem_5.5rem_5.5rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_6rem_6rem_5.5rem_6.5rem]";

function formatRelativeDate(d: Date | null): string {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function formatComputedAt(d: Date | null): string | null {
  if (!d) return null;
  const minutes = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TsrLeaderboard({ snapshot }: Props) {
  const [region, setRegion] = useState<RegionFilter>("All");
  const [tier, setTier] = useState<TierFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = snapshot.rows.filter((r) => {
      if (region !== "All" && r.region !== region) return false;
      if (tier !== "All" && r.maxTierReached !== tier) return false;
      if (q.length > 0) {
        const hayNickname = r.faceitNickname.toLowerCase();
        const hayBattletag = r.battletag?.toLowerCase() ?? "";
        if (!hayNickname.includes(q) && !hayBattletag.includes(q)) return false;
      }
      return true;
    });
    return [...out].sort((a, b) => {
      if (sortKey === "matches") return b.matchCount - a.matchCount;
      if (sortKey === "recent")
        return b.recentMatchCount365d - a.recentMatchCount365d;
      return b.rating - a.rating;
    });
  }, [snapshot.rows, region, tier, sortKey, query]);

  const computedAt = formatComputedAt(snapshot.computedAt);

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            Leaderboard
            {computedAt ? ` · Computed ${computedAt}` : null}
          </p>
          <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
            Tournament Skill Rating
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Elo-style rating from FACEIT-hosted Overwatch 2 tournament results.
            Recency weighted, anchored at peak tier reached.
          </p>
        </div>
        <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
          <Stat label="Active" value={snapshot.totalActive.toLocaleString()} />
          <Stat
            label="Tracked players"
            value={snapshot.totalAll.toLocaleString()}
          />
          <Stat
            label="Tracked matches"
            value={snapshot.totalTrackedMatches.toLocaleString()}
          />
          <Stat
            label="Top rating"
            value={snapshot.topRating ? snapshot.topRating.toLocaleString() : "—"}
          />
        </dl>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <LeaderboardSubnav />
        <FilterPills
          value={region}
          onChange={setRegion}
          options={REGION_PILLS}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nickname or BattleTag"
          className="h-9 w-full sm:w-[220px]"
          aria-label="Search players"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground hidden font-mono text-[11px] tracking-wider uppercase sm:inline">
            Sort
          </span>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
        {TIER_PILLS.map((p) => {
          const active = tier === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setTier(active ? "All" : p.value)}
              className={cn(
                "rounded-sm px-2 py-0.5 text-xs transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <section className="mt-8">
        <div
          className={cn(
            "text-muted-foreground border-border grid items-center gap-4 border-b pb-3 font-mono text-[11px] tracking-[0.14em] uppercase",
            COLS
          )}
        >
          <div>#</div>
          <div>Player</div>
          <div className="text-right">Region</div>
          <div className="hidden sm:block">Peak tier</div>
          <div className="text-right">Rating</div>
          <div className="text-right">Matches</div>
          <div className="hidden text-right sm:block">Last seen</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {snapshot.rows.length === 0
              ? "No tracked TSR data yet. Seed FACEIT players to populate."
              : "No players match the selected filters."}
          </div>
        ) : (
          <ul>
            {filtered.map((row, index) => (
              <PlayerRow key={row.faceitPlayerId} row={row} index={index} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Region filter"
      className="border-border bg-card flex rounded-md border p-0.5"
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-sm px-3 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PlayerRow({ row, index }: { row: TsrLeaderboardRow; index: number }) {
  const isTop = index === 0;
  const rank = String(index + 1).padStart(2, "0");
  return (
    <li
      className={cn(
        "border-border hover:bg-muted/40 group grid items-center gap-4 border-b py-3 transition-colors",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:[animation-fill-mode:both]",
        COLS
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
        <Link
          href={`/profile/${encodeURIComponent(row.faceitNickname)}`}
          className={cn(
            "block min-w-0 truncate leading-tight font-medium hover:underline",
            isTop && "text-primary"
          )}
        >
          {row.faceitNickname}
        </Link>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          {row.battletag ? (
            <span className="font-mono">{row.battletag}</span>
          ) : null}
          <span className="sm:hidden font-mono text-[10px] tracking-wider uppercase">
            {TIER_LABEL[row.maxTierReached]}
          </span>
        </div>
      </div>

      <div className="text-muted-foreground text-right font-mono text-[11px] tracking-wider uppercase">
        {row.region === TsrRegion.OTHER ? "—" : row.region}
      </div>

      <div className="text-muted-foreground hidden font-mono text-[11px] tracking-wider uppercase sm:block">
        {TIER_LABEL[row.maxTierReached]}
      </div>

      <div
        className={cn(
          "text-right font-mono text-base tabular-nums",
          isTop ? "text-primary font-semibold" : "font-medium"
        )}
      >
        {row.rating.toLocaleString()}
      </div>

      <div className="text-right">
        <div className="font-mono text-sm tabular-nums">{row.matchCount}</div>
        <div className="text-muted-foreground font-mono text-[10px] tabular-nums">
          {row.recentMatchCount365d} · 365d
        </div>
      </div>

      <div className="text-muted-foreground hidden text-right font-mono text-sm tabular-nums sm:block">
        {formatRelativeDate(row.lastMatchAt)}
      </div>
    </li>
  );
}
