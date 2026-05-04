import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlayerTsrSnapshot } from "@/lib/tsr/lookup";
import { cn, toHero } from "@/lib/utils";
import type { FaceitTier } from "@prisma/client";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

type Props = {
  peakCsr: {
    rating: number;
    hero: string | null;
    mapsPlayed: number;
  };
  tsr: PlayerTsrSnapshot | null;
};

const TIER_LABEL: Record<FaceitTier, string> = {
  UNCLASSIFIED: "Unranked",
  OPEN: "Open",
  CAH: "CAH",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
  MASTERS: "Masters",
  OWCS: "OWCS",
};

function ratingToneClass(rating: number): string {
  if (rating >= 4000) return "text-violet-500";
  if (rating >= 3500) return "text-indigo-400";
  if (rating >= 3000) return "text-emerald-500";
  if (rating >= 2500) return "text-sky-400";
  if (rating >= 2000) return "text-amber-400";
  return "text-foreground";
}

export async function SkillRatingDetail({ peakCsr, tsr }: Props) {
  const t = await getTranslations("heroes");
  const peakHeroLabel =
    peakCsr.hero && peakCsr.rating > 0 ? t(toHero(peakCsr.hero)) : null;

  return (
    <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2">
      <div className="bg-card flex flex-col gap-2 px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            Peak CSR
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground/70 text-xs underline-offset-2 hover:underline">
                What is this?
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Highest hero rating across all heroes the player has logged enough
              maps on. Computed from per-hero Z-scores against peers on the same
              hero.
            </TooltipContent>
          </Tooltip>
        </div>
        {peakCsr.rating > 0 && peakCsr.hero ? (
          <div className="mt-1 flex items-center gap-3">
            <Image
              src={`/heroes/${toHero(peakCsr.hero)}.png`}
              alt={peakCsr.hero}
              width={256}
              height={256}
              className="ring-foreground/10 size-12 shrink-0 rounded-md object-cover ring-1"
            />
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-mono text-2xl font-semibold tabular-nums",
                  ratingToneClass(peakCsr.rating)
                )}
              >
                {peakCsr.rating}
              </span>
              <span className="text-muted-foreground text-xs">
                on {peakHeroLabel} · {peakCsr.mapsPlayed} maps
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-muted-foreground font-mono text-2xl font-semibold tabular-nums">
              —
            </span>
            <span className="text-muted-foreground text-xs">
              No placed heroes yet
            </span>
          </div>
        )}
      </div>

      <div className="bg-card flex flex-col gap-2 px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            TSR
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground/70 text-xs underline-offset-2 hover:underline">
                What is this?
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Tournament Skill Rating, an Elo-style rating from FACEIT-hosted
              Overwatch 2 tournament results, recency-weighted. Answers what
              level of competition this player can handle.
            </TooltipContent>
          </Tooltip>
        </div>
        {tsr ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-2xl font-semibold tabular-nums",
                  ratingToneClass(tsr.rating)
                )}
              >
                {tsr.rating}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {tsr.region}
              </Badge>
            </div>
            <span className="text-muted-foreground text-xs">
              Peak tier {TIER_LABEL[tsr.maxTierReached]} · {tsr.matchCount}{" "}
              matches ({tsr.recentMatchCount365d} last 365d)
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-muted-foreground font-mono text-2xl font-semibold tabular-nums">
              —
            </span>
            <span className="text-muted-foreground text-xs">
              No tracked FACEIT tournaments
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
