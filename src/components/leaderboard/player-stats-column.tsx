"use client";

import { PlayerStatsRadarChart } from "@/components/charts/leaderboard/player-stats-radar-chart";
import { SRDistributionChart } from "@/components/charts/leaderboard/sr-distribution-chart";

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

function getPercentileDescription(pct: number): string {
  if (pct >= 99) return "Top 1% · Elite";
  if (pct >= 95) return "Top 5% · Exceptional";
  if (pct >= 90) return "Top 10% · Excellent";
  if (pct >= 75) return "Top 25% · Very good";
  if (pct >= 50) return "Above average";
  if (pct >= 25) return "Average";
  return "Below average";
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
  label: string;
  format: (v: number) => string;
  rolesOnly?: ("Tank" | "Damage" | "Support")[];
}[] = [
  { key: "elims_per10", label: "Eliminations", format: (v) => v.toFixed(2) },
  { key: "fb_per10", label: "Final blows", format: (v) => v.toFixed(2) },
  { key: "solo_per10", label: "Solo kills", format: (v) => v.toFixed(2) },
  { key: "deaths_per10", label: "Deaths", format: (v) => v.toFixed(2) },
  {
    key: "damage_per10",
    label: "Damage",
    format: (v) => Math.round(v).toLocaleString(),
  },
  {
    key: "healing_per10",
    label: "Healing",
    format: (v) => Math.round(v).toLocaleString(),
    rolesOnly: ["Support"],
  },
  {
    key: "blocked_per10",
    label: "Blocked",
    format: (v) => Math.round(v).toLocaleString(),
    rolesOnly: ["Tank"],
  },
  { key: "ults_per10", label: "Ultimates", format: (v) => v.toFixed(2) },
];

export function PlayerStatsColumn({ player, leaderboardData }: Props) {
  if (!player) {
    return <EmptyState />;
  }

  const percentile = parseFloat(player.percentile);
  const role = player.role as "Tank" | "Damage" | "Support";

  return (
    <div className="space-y-8">
      <header className="border-border border-b pb-5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          Selected · Rank {player.rank} · {player.role}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl leading-tight font-semibold tracking-tight">
            {player.player_name}
          </h2>
          <div className="text-right">
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {player.composite_sr.toLocaleString()}
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
        <SectionLabel>Snapshot</SectionLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <RecordCell
            label="Percentile"
            value={`${percentile.toFixed(1)}%`}
            sub={getPercentileDescription(percentile)}
          />
          <RecordCell label="Maps" value={player.maps} />
          <RecordCell
            label="Time"
            value={`${Math.round(player.minutes_played)}m`}
          />
          <RecordCell label="Hero" value={player.hero} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>SR distribution</SectionLabel>
        <SRDistributionChart
          leaderboardData={leaderboardData}
          selectedPlayer={player}
        />
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          Where {player.player_name} sits in the bell curve for this hero.
        </p>
      </section>

      <section className="space-y-4">
        <SectionLabel>Performance breakdown</SectionLabel>
        <PlayerStatsRadarChart
          player={player}
          leaderboardData={leaderboardData}
        />
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          Z-scores against the leaderboard average. 0 is the average; positive
          is above, negative is below. Most players fall between -2 and +2.
        </p>
      </section>

      <section className="space-y-3">
        <SectionLabel>Per 10 minutes</SectionLabel>
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
                <span className="text-muted-foreground">{field.label}</span>
                <span className="text-foreground font-mono tabular-nums">
                  {field.format(raw)}
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

function EmptyState() {
  return (
    <div className="border-border bg-muted/20 flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed p-8">
      <div className="max-w-xs text-center">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
          Detail panel
        </p>
        <p className="text-foreground mt-3 text-sm leading-relaxed">
          Pick a player to see their SR distribution, performance breakdown, and
          per-10 stats against the leaderboard average.
        </p>
      </div>
    </div>
  );
}
