"use client";

import { FactorsRadar } from "@/components/charts/tsr/factors-radar";
import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RECENCY_HALF_LIFE_LABEL,
  type TsrBreakdown,
  type TsrBreakdownMatch,
} from "@/lib/tsr/breakdown";
import { cn } from "@/lib/utils";
import { type FaceitTier, TsrRegion } from "@prisma/client";

const TIER_LABEL: Record<FaceitTier, string> = {
  UNCLASSIFIED: "—",
  OPEN: "Open",
  CAH: "CAH",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
  MASTERS: "Masters",
  OWCS: "OWCS",
};

type Props = {
  breakdown: TsrBreakdown | null;
  loading: boolean;
};

export function TsrDetailPanel({ breakdown, loading }: Props) {
  if (loading) return <DetailSkeleton />;
  if (!breakdown) return <EmptyState />;

  const { player, record, tierMix, factors, recentMatches, topSwings } =
    breakdown;
  const totalMatches = record.wins + record.losses;

  return (
    <div className="space-y-8">
      <header className="border-border border-b pb-5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          Selected · {player.region === TsrRegion.OTHER ? "—" : player.region} ·
          Peak {TIER_LABEL[player.maxTierReached]}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl leading-tight font-semibold tracking-tight">
            {player.battletag ?? player.faceitNickname}
          </h2>
          <div className="text-right">
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {player.rating.toLocaleString()}
            </div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              Rating
            </div>
          </div>
        </div>
        {player.battletag ? (
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            {player.faceitNickname}
          </p>
        ) : null}
      </header>

      <section>
        <TierLadder
          rating={player.rating}
          maxTierReached={player.maxTierReached}
        />
      </section>

      <section className="space-y-3">
        <SectionLabel>Match record</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <RecordCell label="Wins" value={record.wins} />
          <RecordCell label="Losses" value={record.losses} />
          <RecordCell
            label="Win rate"
            value={
              totalMatches > 0 ? `${Math.round(record.winRate * 100)}%` : "—"
            }
          />
          <RecordCell
            label="Last 365d"
            value={`${record.recentWins}W · ${record.recentLosses}L`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Tier breakdown</SectionLabel>
        <ul className="divide-border divide-y">
          {tierMix.map((row) => {
            return (
              <li
                key={row.tier}
                className="grid grid-cols-[5rem_minmax(0,1fr)_4rem_5rem] items-center gap-3 py-2 text-sm"
              >
                <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                  {TIER_LABEL[row.tier]}
                </span>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary/70 h-full"
                    style={{
                      width: `${(row.matches / Math.max(...tierMix.map((t) => t.matches))) * 100}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-sm tabular-nums">
                  {row.matches}
                </span>
                <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
                  {row.wins}W · {row.losses}L
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <SectionLabel>Contributing factors</SectionLabel>
        <FactorsRadar factors={factors} />
        <ul className="grid grid-cols-1 gap-x-10 gap-y-2.5 text-sm sm:grid-cols-2">
          {factors.map((f) => (
            <li
              key={f.key}
              className="border-border/60 flex items-baseline justify-between gap-6 border-b py-1.5 last:border-b-0"
            >
              <span className="text-muted-foreground">{f.label}</span>
              <span className="text-foreground font-mono tabular-nums">
                {f.rawLabel}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground/70 mt-4 text-[11px] leading-relaxed">
          Normalized 0 to 1 within reasonable population bounds. Recency
          weighted with a {RECENCY_HALF_LIFE_LABEL}.
        </p>
      </section>

      {topSwings.length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>Top swings</SectionLabel>
          <ul className="divide-border divide-y">
            {topSwings.map((m) => (
              <MatchRow key={m.matchId} match={m} highlight="impact" />
            ))}
          </ul>
        </section>
      ) : null}

      {recentMatches.length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>Recent matches</SectionLabel>
          <ul className="divide-border divide-y">
            {recentMatches.map((m) => (
              <MatchRow key={m.matchId} match={m} highlight="date" />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
      {children}
    </h3>
  );
}

function RecordCell({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="font-mono text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}

function MatchRow({
  match,
  highlight,
}: {
  match: TsrBreakdownMatch;
  highlight: "impact" | "date";
}) {
  const date = match.finishedAt.toISOString().slice(0, 10);
  const impact = match.impactScore;
  const impactPct = `${impact >= 0 ? "+" : ""}${(impact * 100).toFixed(0)}`;
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem_4rem] items-center gap-3 py-2 text-sm">
      <span
        className={cn(
          "font-mono text-[11px] tracking-wider uppercase",
          match.won ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {match.won ? "Won" : "Lost"}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm">{match.championshipName}</div>
        <div className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
          {TIER_LABEL[match.tier]}
        </div>
      </div>
      <span className="text-right font-mono text-sm tabular-nums">
        {match.score[0]}-{match.score[1]}
      </span>
      <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
        {highlight === "impact" ? impactPct : date}
      </span>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="border-border bg-muted/20 flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed p-8">
      <div className="max-w-xs text-center">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
          Detail panel
        </p>
        <p className="text-foreground mt-3 text-sm leading-relaxed">
          Pick a player to see what shaped their rating: tier ladder, match
          record, contributing factors, and the matches that moved the needle.
        </p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-5">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
