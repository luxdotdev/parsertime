"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import Image from "next/image";

type HeroSRDisplayProps = {
  sr: number;
};

function RatingTooltip({ children }: { children: React.ReactNode }) {
  const t = useTranslations("mapPage.compare.playerCard.specificHero");

  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>
        <p className="max-w-prose">{t("ratingTooltip")}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function HeroSRDisplay({ sr }: HeroSRDisplayProps) {
  if (sr === 0) {
    return (
      <RatingTooltip>
        <div className="inline-flex items-center gap-1 pl-4">
          <span className="text-muted-foreground text-lg">Unplaced</span>
        </div>
      </RatingTooltip>
    );
  }

  switch (true) {
    case sr < 1500:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/bronze.png"
              alt="Bronze"
              width={20}
              height={20}
            />
            <span className="text-lg text-amber-900 dark:text-amber-700">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 2000:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/silver.png"
              alt="Silver"
              width={20}
              height={20}
            />
            <span className="text-lg text-gray-500 dark:text-gray-400">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 2500:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image src="/ranks/gold.png" alt="Gold" width={20} height={20} />
            <span className="text-lg text-amber-500 dark:text-amber-400">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 3000:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/platinum.png"
              alt="Platinum"
              width={20}
              height={20}
            />
            <span className="text-lg text-gray-600 dark:text-gray-300">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 3500:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/diamond.png"
              alt="Diamond"
              width={20}
              height={20}
            />
            <span className="text-lg text-sky-400 dark:text-sky-300">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 4000:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/masters.png"
              alt="Master"
              width={20}
              height={20}
            />
            <span className="text-lg text-emerald-500 dark:text-emerald-400">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 4500:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/grandmaster.png"
              alt="Grandmaster"
              width={20}
              height={20}
            />
            <span className="text-lg text-indigo-500 dark:text-indigo-400">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    case sr < 5000:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <Image
              src="/ranks/champion.png"
              alt="Champion"
              width={20}
              height={20}
            />
            <span className="text-lg text-violet-500 dark:text-violet-400">
              {sr} SR
            </span>
          </div>
        </RatingTooltip>
      );
    default:
      return (
        <RatingTooltip>
          <div className="inline-flex items-center gap-1 pl-4">
            <span className="text-muted-foreground text-lg">Unplaced</span>
          </div>
        </RatingTooltip>
      );
  }
}
