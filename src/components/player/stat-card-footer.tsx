"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StatCardComparison } from "@/lib/stat-card-helpers";
import { useTranslations } from "next-intl";
import Image from "next/image";

type StatCardFooterProps = {
  baseText: string;
  comparison?: StatCardComparison | null;
  stat: string;
  hero: string;
};

type HeroRatingLabels = {
  unplaced: string;
  sr: string;
  maxScore: string;
  ranks: {
    bronze: string;
    silver: string;
    gold: string;
    platinum: string;
    diamond: string;
    master: string;
    grandmaster: string;
    champion: string;
  };
};

function displayHeroRating(heroRating: number, labels: HeroRatingLabels) {
  if (heroRating === 0) {
    return (
      <div className="items-center gap-1 pt-2">
        <p className="text-muted-foreground text-xs">{labels.unplaced}</p>
      </div>
    );
  }

  switch (true) {
    case heroRating < 1500:
      // Bronze
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/bronze.png"
            alt={labels.ranks.bronze}
            width={16}
            height={16}
          />
          <span className="text-xs text-amber-900">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 2000:
      // Silver
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/silver.png"
            alt={labels.ranks.silver}
            width={16}
            height={16}
          />
          <span className="text-xs text-gray-400">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 2500:
      // Gold
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/gold.png"
            alt={labels.ranks.gold}
            width={16}
            height={16}
          />
          <span className="text-xs text-amber-400">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 3000:
      // Platinum
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/platinum.png"
            alt={labels.ranks.platinum}
            width={16}
            height={16}
          />
          <span className="text-xs text-gray-500 dark:text-gray-300">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 3500:
      // Diamond
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/diamond.png"
            alt={labels.ranks.diamond}
            width={16}
            height={16}
          />
          <span className="text-xs text-sky-300">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 4000:
      // Master
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/masters.png"
            alt={labels.ranks.master}
            width={16}
            height={16}
          />
          <span className="text-xs text-emerald-500">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 4500:
      // Grandmaster
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/grandmaster.png"
            alt={labels.ranks.grandmaster}
            width={16}
            height={16}
          />
          <span className="text-xs text-indigo-400">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    case heroRating < 5000:
      // Champion
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/champion.png"
            alt={labels.ranks.champion}
            width={16}
            height={16}
          />
          <span className="text-xs text-violet-500">
            {heroRating} {labels.sr}
          </span>
        </div>
      );
    default:
      // Champion
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/champion.png"
            alt={labels.ranks.champion}
            width={16}
            height={16}
          />
          <span className="text-xs text-violet-500">
            {heroRating} {labels.sr} ({labels.maxScore})
          </span>
        </div>
      );
  }
}

export function StatCardFooter({
  baseText,
  comparison,
  stat,
  hero,
}: StatCardFooterProps) {
  const t = useTranslations("mapPage.compare.playerCard");
  const heroRatingLabels: HeroRatingLabels = {
    unplaced: t("unplaced"),
    sr: t("sr"),
    maxScore: t("maxScore"),
    ranks: {
      bronze: t("ranks.bronze"),
      silver: t("ranks.silver"),
      gold: t("ranks.gold"),
      platinum: t("ranks.platinum"),
      diamond: t("ranks.diamond"),
      master: t("ranks.master"),
      grandmaster: t("ranks.grandmaster"),
      champion: t("ranks.champion"),
    },
  };

  if (!comparison) {
    return <div className="text-muted-foreground text-sm">{baseText}</div>;
  }

  return (
    <div className="text-muted-foreground space-y-2 text-xs">
      <div className="text-sm">{baseText}</div>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1.5">
            <span className="tabular-nums">
              {t("vsAverage", {
                average: comparison.heroAverage.toLocaleString(),
              })}
            </span>
            <span className="text-muted-foreground/40" aria-hidden="true">
              ·
            </span>
            <span className="text-foreground tabular-nums">
              {t("percentile", {
                percentile: comparison.percentile.toFixed(0),
              })}
            </span>
            <span className="tabular-nums">
              ({comparison.zScore > 0 ? "+" : ""}
              {comparison.zScore.toFixed(2)}σ)
            </span>
          </div>
          <span>
            {displayHeroRating(comparison.estimatedSR, heroRatingLabels)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {t("percentileExplanation", {
              stat,
              percent: (100 - comparison.percentile).toFixed(0),
              hero,
            })}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
