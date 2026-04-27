"use client";

import { loadTsrBreakdown } from "@/app/leaderboard/tsr/actions";
import { LeaderboardSubnav } from "@/components/leaderboard/leaderboard-subnav";
import { TsrDetailPanel } from "@/components/leaderboard/tsr-detail-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TsrBreakdown } from "@/lib/tsr/breakdown";
import type {
  TsrLeaderboardRow,
  TsrLeaderboardSnapshot,
  TsrSortKey,
} from "@/lib/tsr/leaderboard";
import { cn } from "@/lib/utils";
import { FaceitTier, TsrRegion } from "@prisma/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  initialSnapshot: TsrLeaderboardSnapshot;
};

type RegionFilter = "All" | TsrRegion;
type TierFilter = "All" | FaceitTier;

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

const SORT_OPTIONS: { value: TsrSortKey; label: string }[] = [
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
  "grid-cols-[3rem_minmax(0,1fr)_4rem_5.5rem_5.5rem_5.5rem] sm:grid-cols-[3rem_minmax(0,1fr)_4.5rem_6rem_6rem_5.5rem_6.5rem]";

const PAGE_SIZE = 50;

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

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

async function fetchSnapshot(
  region: RegionFilter,
  tier: TierFilter,
  sort: TsrSortKey,
  q: string,
  offset: number
): Promise<TsrLeaderboardSnapshot> {
  const params = new URLSearchParams();
  if (region !== "All") params.set("region", region);
  if (tier !== "All") params.set("tier", tier);
  params.set("sort", sort);
  if (q.trim()) params.set("q", q.trim());
  params.set("offset", String(offset));
  params.set("limit", String(PAGE_SIZE));
  const res = await fetch(`/api/leaderboard/tsr?${params}`);
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const json = (await res.json()) as TsrLeaderboardSnapshot;
  // Date fields come back as ISO strings; rehydrate them.
  return {
    ...json,
    rows: json.rows.map((r) => ({
      ...r,
      lastMatchAt: r.lastMatchAt ? new Date(r.lastMatchAt) : null,
    })),
    meta: {
      ...json.meta,
      computedAt: json.meta.computedAt ? new Date(json.meta.computedAt) : null,
    },
  };
}

export function TsrLeaderboard({ initialSnapshot }: Props) {
  const [region, setRegion] = useState<RegionFilter>("All");
  const [tier, setTier] = useState<TierFilter>("All");
  const [sortKey, setSortKey] = useState<TsrSortKey>("rating");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 250);
  const [accumulated, setAccumulated] = useState<TsrLeaderboardRow[]>(
    initialSnapshot.rows
  );
  const [offset, setOffset] = useState(0);

  const isInitial =
    region === "All" &&
    tier === "All" &&
    sortKey === "rating" &&
    debouncedQuery.trim() === "" &&
    offset === 0;

  const result = useQuery({
    queryKey: [
      "tsr-leaderboard",
      region,
      tier,
      sortKey,
      debouncedQuery,
      offset,
    ],
    queryFn: () => fetchSnapshot(region, tier, sortKey, debouncedQuery, offset),
    initialData: isInitial ? initialSnapshot : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const snapshot = result.data ?? initialSnapshot;

  // Reset accumulated rows when filters change; append when paginating.
  useEffect(() => {
    setOffset(0);
    setAccumulated([]);
  }, [region, tier, sortKey, debouncedQuery]);

  useEffect(() => {
    if (!result.data) return;
    if (offset === 0) {
      setAccumulated(result.data.rows);
    } else {
      // Append, deduping by faceitPlayerId in case of overlap.
      setAccumulated((prev) => {
        const seen = new Set(prev.map((r) => r.faceitPlayerId));
        const next = [...prev];
        for (const r of result.data.rows) {
          if (!seen.has(r.faceitPlayerId)) next.push(r);
        }
        return next;
      });
    }
  }, [result.data, offset]);

  const computedAt = formatComputedAt(snapshot.meta.computedAt);
  const showInactive = debouncedQuery.trim() !== "";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<TsrBreakdown | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!selectedId) {
      setBreakdown(null);
      return;
    }
    const seq = ++requestSeq.current;
    startTransition(async () => {
      const data = await loadTsrBreakdown(selectedId);
      if (seq !== requestSeq.current) return;
      setBreakdown(data);
    });
  }, [selectedId]);

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
          <Stat
            label="Active"
            value={snapshot.meta.totalActive.toLocaleString()}
          />
          <Stat
            label="Tracked players"
            value={snapshot.meta.totalAll.toLocaleString()}
          />
          <Stat
            label="Tracked matches"
            value={snapshot.meta.totalTrackedMatches.toLocaleString()}
          />
          <Stat
            label="Top rating"
            value={
              snapshot.meta.topRating
                ? snapshot.meta.topRating.toLocaleString()
                : "—"
            }
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
          placeholder="Search BattleTag or nickname"
          className="h-9 w-full sm:w-[220px]"
          aria-label="Search players"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground hidden font-mono text-[11px] tracking-wider uppercase sm:inline">
            Sort
          </span>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as TsrSortKey)}
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="min-w-0">
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

          {result.isLoading && accumulated.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Loading…
            </div>
          ) : accumulated.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {showInactive
                ? `No players match "${debouncedQuery}".`
                : "No active players match the selected filters."}
            </div>
          ) : (
            <ul>
              {accumulated.map((row) => (
                <PlayerRow
                  key={row.faceitPlayerId}
                  row={row}
                  selected={selectedId === row.faceitPlayerId}
                  onSelect={() => setSelectedId(row.faceitPlayerId)}
                  showInactive={showInactive}
                />
              ))}
            </ul>
          )}

          {snapshot.meta.hasMore ? (
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                Showing {accumulated.length} of {snapshot.meta.matchedCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                disabled={result.isFetching}
              >
                {result.isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : accumulated.length > 0 && !showInactive ? (
            <div className="text-muted-foreground mt-4 text-center font-mono text-[11px] tracking-wider uppercase">
              {accumulated.length} of {snapshot.meta.matchedCount} active
            </div>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <TsrDetailPanel breakdown={breakdown} loading={isPending} />
        </aside>
      </div>
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

function PlayerRow({
  row,
  selected,
  onSelect,
  showInactive,
}: {
  row: TsrLeaderboardRow;
  selected: boolean;
  onSelect: () => void;
  showInactive: boolean;
}) {
  const isTop = row.rank === 1;
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
        row.inactive && "opacity-70",
        COLS
      )}
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
          href={`/profile/${encodeURIComponent(row.battletag ?? row.faceitNickname)}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "block min-w-0 truncate leading-tight font-medium hover:underline",
            isTop && "text-primary"
          )}
        >
          {row.battletag ?? row.faceitNickname}
        </Link>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          {row.battletag ? (
            <span className="font-mono">{row.faceitNickname}</span>
          ) : null}
          {showInactive && row.inactive ? (
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              Inactive
            </span>
          ) : null}
          <span className="font-mono text-[10px] tracking-wider uppercase sm:hidden">
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
