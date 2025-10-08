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

function displayHeroRating(heroRating: number) {
  if (heroRating === 0) {
    return (
      <div className="items-center gap-1 pt-2">
        <p className="text-muted-foreground text-xs">Unplaced</p>
      </div>
    );
  }

  switch (true) {
    case heroRating < 1500:
      // Bronze
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image src="/ranks/bronze.png" alt="Bronze" width={16} height={16} />
          <span className="text-xs text-amber-900">{heroRating} SR</span>
        </div>
      );
    case heroRating < 2000:
      // Silver
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image src="/ranks/silver.png" alt="Silver" width={16} height={16} />
          <span className="text-xs text-gray-400">{heroRating} SR</span>
        </div>
      );
    case heroRating < 2500:
      // Gold
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image src="/ranks/gold.png" alt="Gold" width={16} height={16} />
          <span className="text-xs text-amber-400">{heroRating} SR</span>
        </div>
      );
    case heroRating < 3000:
      // Platinum
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/platinum.png"
            alt="Platinum"
            width={16}
            height={16}
          />
          <span className="text-xs text-gray-500 dark:text-gray-300">
            {heroRating} SR
          </span>
        </div>
      );
    case heroRating < 3500:
      // Diamond
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/diamond.png"
            alt="Diamond"
            width={16}
            height={16}
          />
          <span className="text-xs text-sky-300">{heroRating} SR</span>
        </div>
      );
    case heroRating < 4000:
      // Master
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image src="/ranks/masters.png" alt="Master" width={16} height={16} />
          <span className="text-xs text-emerald-500">{heroRating} SR</span>
        </div>
      );
    case heroRating < 4500:
      // Grandmaster
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/grandmaster.png"
            alt="Grandmaster"
            width={16}
            height={16}
          />
          <span className="text-xs text-indigo-400">{heroRating} SR</span>
        </div>
      );
    case heroRating < 5000:
      // Champion
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/champion.png"
            alt="Champion"
            width={16}
            height={16}
          />
          <span className="text-xs text-violet-500">{heroRating} SR</span>
        </div>
      );
    default:
      // Champion
      return (
        <div className="flex items-center gap-1 pt-2">
          <Image
            src="/ranks/champion.png"
            alt="Champion"
            width={16}
            height={16}
          />
          <span className="text-xs text-violet-500">
            {heroRating} SR (Max score!)
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

  if (!comparison) {
    return <div className="text-muted-foreground text-sm">{baseText}</div>;
  }

  return (
    <div className="text-muted-foreground space-y-2 text-xs">
      <div className="text-sm">{baseText}</div>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1">
            <span>
              {t("vsAverage", {
                average: comparison.heroAverage,
              })}
            </span>
            <span>&mdash;</span>
            <span className="text-foreground">
              {t("percentile", {
                percentile: comparison.percentile.toFixed(0),
              })}
            </span>
            <span>
              ({comparison.zScore > 0 ? "+" : ""}
              {comparison.zScore.toFixed(2)}σ)
            </span>
          </div>
          <span>{displayHeroRating(comparison.estimatedSR)}</span>
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
