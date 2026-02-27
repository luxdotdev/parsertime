"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ScoutingHeroPerformance } from "@/data/player-scouting-analytics-dto";
import { cn, toHero } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

type PlayerHeroZScoresProps = {
  heroes: ScoutingHeroPerformance[];
};

const STAT_LABELS: Record<string, string> = {
  eliminations: "Eliminations",
  deaths: "Deaths",
  hero_damage_dealt: "Hero Damage",
  healing_dealt: "Healing",
  damage_blocked: "Dmg Blocked",
};

export function PlayerHeroZScores({ heroes }: PlayerHeroZScoresProps) {
  const t = useTranslations("scoutingPage.player.analytics.heroZScores");

  if (heroes.length === 0) {
    return null;
  }

  const primarySecondaryDelta =
    heroes.length >= 2
      ? heroes[0].compositeZScore - heroes[1].compositeZScore
      : null;

  return (
    <section aria-labelledby="hero-zscores-heading">
      <Card>
        <CardHeader>
          <CardTitle id="hero-zscores-heading">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {heroes.map((hero, i) => (
            <HeroZScoreRow key={hero.hero} hero={hero} isPrimary={i === 0} />
          ))}

          {primarySecondaryDelta !== null && (
            <div className="border-t pt-3">
              <p className="text-muted-foreground text-xs tabular-nums">
                {t("delta")}: {primarySecondaryDelta > 0 ? "−" : "+"}
                {Math.abs(primarySecondaryDelta).toFixed(1)}σ
                {primarySecondaryDelta > 1.5 && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    {t("significantDropOff")}
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">{t("methodology")}</p>
        </CardFooter>
      </Card>
    </section>
  );
}

function HeroZScoreRow({
  hero,
  isPrimary,
}: {
  hero: ScoutingHeroPerformance;
  isPrimary: boolean;
}) {
  const t = useTranslations("scoutingPage.player.analytics.heroZScores");

  return (
    <Collapsible>
      <div
        className={cn(
          "rounded-lg border p-3 transition-colors",
          hero.compositeZScore < 0 && "border-red-500/20 bg-red-500/5"
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex min-h-[44px] w-full items-center gap-3">
            <Image
              src={`/heroes/${toHero(hero.hero)}.png`}
              alt={hero.hero}
              width={32}
              height={32}
              className="rounded"
            />
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm font-medium">{hero.hero}</span>
              {isPrimary && (
                <Badge variant="outline" className="px-1 py-0 text-[9px]">
                  {t("primary")}
                </Badge>
              )}
              <span className="text-muted-foreground text-xs tabular-nums">
                {t("maps", { count: hero.mapsPlayed })}
              </span>
            </div>
            <ZScoreBar zScore={hero.compositeZScore} isPrimary={isPrimary} />
            <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums">
              {hero.compositeZScore >= 0 ? "+" : ""}
              {hero.compositeZScore.toFixed(1)}σ
            </span>
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-2 border-t pt-3">
            {hero.stats.map((stat) => (
              <div key={stat.stat} className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground w-24 shrink-0">
                  {STAT_LABELS[stat.stat] ?? stat.stat}
                </span>
                <span className="w-16 shrink-0 tabular-nums">
                  {stat.per10.toFixed(0)}/10
                </span>
                <div className="bg-muted relative h-3 flex-1 overflow-hidden rounded-sm">
                  {stat.zScore !== null && (
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-sm",
                        stat.zScore >= 0 ? "bg-emerald-500/60" : "bg-red-500/60"
                      )}
                      style={{
                        width: `${Math.min(Math.max((stat.zScore + 3) / 6, 0), 1) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums">
                  {stat.zScore !== null
                    ? `${stat.zScore >= 0 ? "+" : ""}${stat.zScore.toFixed(1)}σ`
                    : "—"}
                </span>
                <span className="text-muted-foreground w-20 shrink-0 text-right tabular-nums">
                  avg {stat.heroAvgPer10.toFixed(0)}/10
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ZScoreBar({
  zScore,
  isPrimary,
}: {
  zScore: number;
  isPrimary: boolean;
}) {
  const maxZScore = 3;
  const normalizedWidth = Math.min(
    Math.max((zScore + maxZScore) / (2 * maxZScore), 0),
    1
  );

  return (
    <div className="bg-muted relative hidden h-4 w-24 overflow-hidden rounded-sm sm:block">
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-sm transition-all",
          "motion-safe:animate-in motion-safe:slide-in-from-left-0",
          isPrimary ? "bg-chart-1" : "bg-chart-2"
        )}
        style={{ width: `${normalizedWidth * 100}%` }}
      />
    </div>
  );
}
