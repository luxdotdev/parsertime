"use client";

import { PlayerStatsRadarChart } from "@/components/charts/leaderboard/player-stats-radar-chart";
import { SRDistributionChart } from "@/components/charts/leaderboard/sr-distribution-chart";
import { useFormatter, useTranslations } from "next-intl";

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
  solo_per10?: number;
  ults_per10?: number;
  maps: number;
  minutes_played: number;
};

type Props = {
  player: LeaderboardPlayer | null;
  leaderboardData: LeaderboardPlayer[];
};

function getPercentileDescription(
  pct: number,
  t: ReturnType<typeof useTranslations>
): string {
  if (pct >= 99) return t("percentile.top1");
  if (pct >= 95) return t("percentile.top5");
  if (pct >= 90) return t("percentile.top10");
  if (pct >= 75) return t("percentile.top25");
  if (pct >= 50) return t("percentile.aboveAverage");
  if (pct >= 25) return t("percentile.average");
  return t("percentile.belowAverage");
}

const PER_10_FIELDS: {
  key: keyof Pick<
    LeaderboardPlayer,
    | "elims_per10"
    | "fb_per10"
    | "solo_per10"
    | "deaths_per10"
    | "damage_per10"
    | "healing_per10"
    | "blocked_per10"
    | "ults_per10"
  >;
  labelKey:
    | "eliminations"
    | "finalBlows"
    | "soloKills"
    | "deaths"
    | "damage"
    | "healing"
    | "blocked"
    | "ultimates";
  format: (v: number, formatter: ReturnType<typeof useFormatter>) => string;
  rolesOnly?: ("Tank" | "Damage" | "Support")[];
}[] = [
  {
    key: "elims_per10",
    labelKey: "eliminations",
    format: formatDecimal,
  },
  { key: "fb_per10", labelKey: "finalBlows", format: formatDecimal },
  { key: "solo_per10", labelKey: "soloKills", format: formatDecimal },
  { key: "deaths_per10", labelKey: "deaths", format: formatDecimal },
  {
    key: "damage_per10",
    labelKey: "damage",
    format: formatRounded,
  },
  {
    key: "healing_per10",
    labelKey: "healing",
    format: formatRounded,
    rolesOnly: ["Support"],
  },
  {
    key: "blocked_per10",
    labelKey: "blocked",
    format: formatRounded,
    rolesOnly: ["Tank"],
  },
  { key: "ults_per10", labelKey: "ultimates", format: formatDecimal },
];

export function PlayerStatsColumn({ player, leaderboardData }: Props) {
  const t = useTranslations("leaderboardPage.csr.stats");
  const formatter = useFormatter();

  if (!player) {
    return <EmptyState t={t} />;
  }

  const percentile = parseFloat(player.percentile);
  const role = player.role as "Tank" | "Damage" | "Support";

  return (
    <div className="space-y-8">
      <header className="border-border border-b pb-5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("selectedMeta", {
            rank: player.rank,
            role: getRoleLabel(player.role, t),
          })}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl leading-tight font-semibold tracking-tight">
            {player.player_name}
          </h2>
          <div className="text-right">
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {formatter.number(player.composite_sr)}
            </div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              SR
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {player.hero}
        </p>
      </header>

      <section className="space-y-3">
        <SectionLabel>{t("snapshot")}</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <RecordCell
            label={t("percentileLabel")}
            value={formatter.number(percentile / 100, {
              style: "percent",
              maximumFractionDigits: 1,
            })}
            sub={getPercentileDescription(percentile, t)}
          />
          <RecordCell label={t("maps")} value={formatter.number(player.maps)} />
          <RecordCell
            label={t("time")}
            value={t("minutes", { count: Math.round(player.minutes_played) })}
          />
          <RecordCell label={t("hero")} value={player.hero} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t("srDistribution")}</SectionLabel>
        <SRDistributionChart
          leaderboardData={leaderboardData}
          selectedPlayer={player}
        />
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          {t("distributionDescription", { playerName: player.player_name })}
        </p>
      </section>

      <section className="space-y-4">
        <SectionLabel>{t("performanceBreakdown")}</SectionLabel>
        <PlayerStatsRadarChart
          player={player}
          leaderboardData={leaderboardData}
        />
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          {t("performanceDescription")}
        </p>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t("per10Minutes")}</SectionLabel>
        <ul className="grid grid-cols-1 gap-x-10 gap-y-2.5 text-sm sm:grid-cols-2">
          {PER_10_FIELDS.map((field) => {
            if (field.rolesOnly && !field.rolesOnly.includes(role)) return null;
            const raw = player[field.key];
            if (raw === undefined || raw === null) return null;
            return (
              <li
                key={field.key}
                className="border-border/60 flex items-baseline justify-between gap-6 border-b py-1.5 last:border-b-0"
              >
                <span className="text-muted-foreground">
                  {t(`per10.${field.labelKey}`)}
                </span>
                <span className="text-foreground font-mono tabular-nums">
                  {field.format(raw, formatter)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
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
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="font-mono text-xl font-medium tabular-nums">{value}</p>
      {sub ? (
        <p className="text-muted-foreground mt-0.5 text-[11px]">{sub}</p>
      ) : null}
    </div>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof useTranslations> }) {
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

function formatDecimal(
  value: number,
  formatter: ReturnType<typeof useFormatter>
) {
  return formatter.number(value, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function formatRounded(
  value: number,
  formatter: ReturnType<typeof useFormatter>
) {
  return formatter.number(Math.round(value));
}

function getRoleLabel(role: string, t: ReturnType<typeof useTranslations>) {
  switch (role) {
    case "Tank":
      return t("roles.tank");
    case "Damage":
      return t("roles.damage");
    case "Support":
      return t("roles.support");
    default:
      return role;
  }
}
