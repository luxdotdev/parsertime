"use client";

import { SRDistributionChart } from "@/components/charts/leaderboard/sr-distribution-chart";
import { Link } from "@/components/ui/link";
import type { TalentLeaderboardPlayer } from "@/lib/hero-talent-leaderboard";
import { cn, toHero } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";

export type TalentPlayer = TalentLeaderboardPlayer;

export function TalentPanel({
  hero,
  leaderboard,
  topLimit = 8,
}: {
  hero: HeroName;
  leaderboard: TalentPlayer[];
  topLimit?: number;
}) {
  const t = useTranslations("statsPage.heroStats.talent");

  if (leaderboard.length < 3) {
    return (
      <div className="bg-card text-muted-foreground flex h-48 items-center justify-center px-6 text-center text-sm">
        {t("notRanked")}
      </div>
    );
  }

  const topPlayers = leaderboard.slice(0, topLimit);

  return (
    <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-[1.4fr_1fr]">
      <div className="bg-card flex flex-col px-5 py-5">
        <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {t("distribution")}
        </h3>
        <div className="mt-2 min-w-0">
          <SRDistributionChart leaderboardData={leaderboard} />
        </div>
      </div>
      <div className="bg-card flex flex-col px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            {t("topPlayers")}
          </h3>
          <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
            {t("topCount", { count: topLimit })}
          </span>
        </div>
        <ol className="mt-4 flex flex-col gap-2.5">
          {topPlayers.map((player, idx) => (
            <li key={player.player_name} className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex w-6 justify-end font-mono text-xs tabular-nums",
                  idx === 0
                    ? "text-primary font-semibold"
                    : "text-muted-foreground/80"
                )}
              >
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <Image
                src={`/heroes/${toHero(hero)}.png`}
                alt=""
                width={256}
                height={256}
                className="ring-foreground/10 size-8 shrink-0 rounded-md object-cover ring-1"
              />
              <Link
                href={
                  `/stats/${encodeURIComponent(player.player_name)}` as Route
                }
                className="min-w-0 flex-1 truncate text-sm font-medium no-underline"
              >
                {player.player_name}
              </Link>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {player.composite_sr}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground/70 mt-4 text-xs leading-relaxed">
          {t("explainer")}
        </p>
      </div>
    </div>
  );
}
