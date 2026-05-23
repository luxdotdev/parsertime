"use client";

import { FactorsRadar } from "@/components/charts/tsr/factors-radar";
import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  TsrBreakdown,
  TsrBreakdownFactor,
  TsrBreakdownMatch,
} from "@/lib/tsr/breakdown";
import { RECENCY_HALF_LIFE_DAYS, TIER_RANK } from "@/lib/tsr/constants";
import { cn } from "@/lib/utils";
import { FaceitTier, TsrRegion } from "@prisma/client";
import { useFormatter, useTranslations } from "next-intl";

type DetailMessages = ReturnType<typeof useTranslations>;

type Props = {
  breakdown: TsrBreakdown | null;
  loading: boolean;
};

export function TsrDetailPanel({ breakdown, loading }: Props) {
  const t = useTranslations("leaderboardPage.tsr.detail");
  const formatter = useFormatter();

  if (loading) return <DetailSkeleton />;
  if (!breakdown) return <EmptyState t={t} />;

  const { player, record, tierMix, factors, recentMatches, topSwings } =
    breakdown;
  const totalMatches = record.wins + record.losses;
  const localizedFactors = factors.map((factor) => ({
    ...factor,
    label: getFactorLabel(factor.key, t),
    rawLabel: getFactorRawLabel(factor, {
      formatter,
      playerRecentMatches: player.recentMatchCount365d,
      t,
      totalMatches,
    }),
  }));

  return (
    <div className="space-y-8">
      <header className="border-border border-b pb-5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("selectedMeta", {
            region: getRegionDisplay(player.region, t),
            tier: getTierLabel(player.maxTierReached, t),
          })}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl leading-tight font-semibold tracking-tight">
            {player.battletag ?? player.faceitNickname}
          </h2>
          <div className="text-right">
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {formatter.number(player.rating)}
            </div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              {t("rating")}
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
        <SectionLabel>{t("matchRecord")}</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <RecordCell label={t("wins")} value={formatter.number(record.wins)} />
          <RecordCell
            label={t("losses")}
            value={formatter.number(record.losses)}
          />
          <RecordCell
            label={t("winRate")}
            value={
              totalMatches > 0
                ? formatter.number(record.winRate, {
                    style: "percent",
                    maximumFractionDigits: 0,
                  })
                : "—"
            }
          />
          <RecordCell
            label={t("lastNDays", { days: 365 })}
            value={t("recordSummary", {
              wins: record.recentWins,
              losses: record.recentLosses,
            })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t("tierBreakdown")}</SectionLabel>
        <ul className="divide-border divide-y">
          {tierMix.map((row) => {
            return (
              <li
                key={row.tier}
                className="grid grid-cols-[5rem_minmax(0,1fr)_4rem_5rem] items-center gap-3 py-2 text-sm"
              >
                <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                  {getTierLabel(row.tier, t)}
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
                  {formatter.number(row.matches)}
                </span>
                <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
                  {t("recordSummary", {
                    wins: row.wins,
                    losses: row.losses,
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <SectionLabel>{t("contributingFactors")}</SectionLabel>
        <FactorsRadar
          factors={localizedFactors}
          radarName={t("factorRadarName")}
        />
        <ul className="grid grid-cols-1 gap-x-10 gap-y-2.5 text-sm sm:grid-cols-2">
          {localizedFactors.map((f) => (
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
          {t("factorDescription", { days: RECENCY_HALF_LIFE_DAYS })}
        </p>
      </section>

      {topSwings.length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>{t("topSwings")}</SectionLabel>
          <ul className="divide-border divide-y">
            {topSwings.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
                highlight="impact"
                formatter={formatter}
                t={t}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {recentMatches.length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>{t("recentMatches")}</SectionLabel>
          <ul className="divide-border divide-y">
            {recentMatches.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
                highlight="date"
                formatter={formatter}
                t={t}
              />
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
  formatter,
  t,
}: {
  match: TsrBreakdownMatch;
  highlight: "impact" | "date";
  formatter: ReturnType<typeof useFormatter>;
  t: DetailMessages;
}) {
  const impact = match.impactScore;
  const impactPct = formatter.number(impact, {
    signDisplay: "always",
    style: "percent",
    maximumFractionDigits: 0,
  });
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem_4rem] items-center gap-3 py-2 text-sm">
      <span
        className={cn(
          "font-mono text-[11px] tracking-wider uppercase",
          match.won ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {match.won ? t("won") : t("lost")}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm">{match.championshipName}</div>
        <div className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
          {getTierLabel(match.tier, t)}
        </div>
      </div>
      <span className="text-right font-mono text-sm tabular-nums">
        {t("score", {
          first: match.score[0],
          second: match.score[1],
        })}
      </span>
      <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
        {highlight === "impact"
          ? impactPct
          : formatter.dateTime(match.finishedAt, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
      </span>
    </li>
  );
}

function EmptyState({ t }: { t: DetailMessages }) {
  return (
    <div className="border-border bg-muted/20 flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed p-8">
      <div className="max-w-xs text-center">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
          {t("emptyTitle")}
        </p>
        <p className="text-foreground mt-3 text-sm leading-relaxed">
          {t("emptyDescription")}
        </p>
      </div>
    </div>
  );
}

function getRegionDisplay(value: TsrRegion, t: DetailMessages) {
  switch (value) {
    case TsrRegion.NA:
      return t("regions.na");
    case TsrRegion.EMEA:
      return t("regions.emea");
    case TsrRegion.OTHER:
      return "—";
  }
}

function getTierLabel(value: FaceitTier, t: DetailMessages) {
  switch (value) {
    case FaceitTier.UNCLASSIFIED:
      return "—";
    case FaceitTier.OPEN:
      return t("tiers.open");
    case FaceitTier.CAH:
      return t("tiers.cah");
    case FaceitTier.ADVANCED:
      return t("tiers.advanced");
    case FaceitTier.EXPERT:
      return t("tiers.expert");
    case FaceitTier.MASTERS:
      return t("tiers.masters");
    case FaceitTier.OWCS:
      return t("tiers.owcs");
  }
}

function getFactorLabel(key: TsrBreakdownFactor["key"], t: DetailMessages) {
  switch (key) {
    case "winRate":
      return t("factors.winRate");
    case "recentActivity":
      return t("factors.recentActivity");
    case "tierStrength":
      return t("factors.tierStrength");
    case "marginOfVictory":
      return t("factors.marginOfVictory");
    case "matchVolume":
      return t("factors.matchVolume");
  }
}

function getAverageTierLabel(rank: number, t: DetailMessages) {
  if (rank >= 4.5) return t("tiers.owcs");
  if (rank >= 3.5) return t("tiers.masters");
  if (rank >= 2.5) return t("tiers.expert");
  if (rank >= 1.5) return t("tiers.advanced");
  if (rank > 0) return t("tiers.open");
  return "—";
}

function getFactorRawLabel(
  factor: TsrBreakdownFactor,
  {
    formatter,
    playerRecentMatches,
    t,
    totalMatches,
  }: {
    formatter: ReturnType<typeof useFormatter>;
    playerRecentMatches: number;
    t: DetailMessages;
    totalMatches: number;
  }
) {
  switch (factor.key) {
    case "winRate":
      return formatter.number(factor.value, {
        style: "percent",
        maximumFractionDigits: 0,
      });
    case "recentActivity":
      return t("factorRaw.recentActivity", {
        count: playerRecentMatches,
        days: 365,
      });
    case "tierStrength":
      return t("factorRaw.averageTier", {
        tier: getAverageTierLabel(factor.value * TIER_RANK.OWCS, t),
      });
    case "marginOfVictory":
      return factor.value > 0
        ? t("factorRaw.averageMultiplier", {
            value: formatter.number(0.875 + factor.value * 0.625, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            }),
          })
        : "—";
    case "matchVolume":
      return t("factorRaw.matches", { count: totalMatches });
  }
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
