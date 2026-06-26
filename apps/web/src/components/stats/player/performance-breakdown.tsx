"use client";

import { PlayerStatsRadarChart } from "@/components/charts/leaderboard/player-stats-radar-chart";
import { SRDistributionChart } from "@/components/charts/leaderboard/sr-distribution-chart";
import { useHeroNames, toHero } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  role: string;
  percentile: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
};

type RadarResponse = {
  player: LeaderboardPlayer | null;
  leaderboard: LeaderboardPlayer[];
};

export function PerformanceBreakdown({
  playerName,
  selectedHeroes,
}: {
  playerName: string;
  selectedHeroes: HeroName[];
}) {
  const t = useTranslations("statsPage.playerStats.performanceBreakdown");
  const heroNames = useHeroNames();

  const hero = selectedHeroes.length === 1 ? selectedHeroes[0] : null;

  const { data, isLoading, isError } = useQuery<RadarResponse>({
    queryKey: ["csr-radar", playerName, hero],
    queryFn: async () => {
      const params = new URLSearchParams({
        player: playerName,
        hero: hero ?? "",
      });
      const res = await fetch(`/api/player/csr-radar?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return (await res.json()) as RadarResponse;
    },
    enabled: hero !== null,
  });

  if (!hero) {
    return <EmptyHint message={t("selectOne")} />;
  }

  if (isLoading) {
    return <EmptyHint message={t("loading")} />;
  }

  if (isError || !data) {
    return <EmptyHint message={t("error")} />;
  }

  const heroLabel = heroNames.get(toHero(hero)) ?? hero;

  if (!data.player || data.leaderboard.length < 3) {
    return <EmptyHint message={t("notRanked", { hero: heroLabel })} />;
  }

  return (
    <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
      <div className="bg-card flex flex-col px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            {t("distributionLabel", { hero: heroLabel })}
          </h3>
          <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
            {data.player.role}
          </span>
        </div>
        <div className="mt-2 min-w-0">
          <SRDistributionChart
            leaderboardData={data.leaderboard}
            selectedPlayer={data.player}
            showOtherPlayers={false}
            showPlayerAsLine={true}
          />
        </div>
      </div>
      <div className="bg-card flex flex-col px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            {t("vsLabel", { hero: heroLabel })}
          </h3>
          <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
            #{data.player.rank}
          </span>
        </div>
        <div className="mt-4 min-w-0">
          <PlayerStatsRadarChart
            player={data.player}
            leaderboardData={data.leaderboard}
          />
        </div>
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
          {t("explainer")}
        </p>
      </div>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="bg-card text-muted-foreground flex h-48 items-center justify-center px-6 text-center text-sm">
      {message}
    </div>
  );
}
