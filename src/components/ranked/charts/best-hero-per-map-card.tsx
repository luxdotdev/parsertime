"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HERO_MAP_MIN_GAMES } from "@/lib/ranked-stats";
import type { HeroMapSynergyResult } from "@/lib/ranked-stats";
import { heroImageUrl, mapImageUrl } from "@/lib/utils";
import { Info } from "lucide-react";
import Image from "next/image";

type BestHeroPerMapCardProps = {
  result: HeroMapSynergyResult;
};

type BestHeroEntry = HeroMapSynergyResult["bestHeroPerMap"][number];

function MapBestHeroCard({ entry }: { entry: BestHeroEntry }) {
  const ciWidth = entry.confidenceHigh - entry.confidenceLow;
  const isNarrow = ciWidth <= 20;
  const winrateColor =
    entry.winrate >= 50 ? "text-primary" : "text-muted-foreground";

  return (
    <div className="border-border bg-card/40 overflow-hidden rounded-md border">
      <div className="relative h-16">
        <Image
          src={mapImageUrl(entry.map)}
          alt={entry.map}
          fill
          sizes="(min-width: 1280px) 18vw, (min-width: 640px) 33vw, 90vw"
          className="object-cover"
        />
        <div className="from-background/95 via-background/40 absolute inset-0 bg-gradient-to-t to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
          <span className="truncate text-sm font-semibold tracking-tight">
            {entry.map}
          </span>
          <span className="text-muted-foreground shrink-0 font-mono text-[10px] tracking-[0.12em] uppercase">
            {entry.mapType}
          </span>
        </div>
      </div>

      <div className="space-y-2.5 p-2.5">
        <div className="flex items-center gap-2">
          <Image
            src={heroImageUrl(entry.hero)}
            alt={entry.hero}
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-sm object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.hero}</p>
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.12em] uppercase">
              {entry.role}
            </p>
          </div>
          <p
            className={`font-mono text-xl leading-none font-semibold tabular-nums ${winrateColor}`}
          >
            {entry.winrate}%
          </p>
        </div>

        <div>
          <div
            className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
            role="img"
            aria-label={`Winrate ${entry.winrate}%, 95% confidence interval ${entry.confidenceLow}% to ${entry.confidenceHigh}%`}
          >
            <div
              className={`absolute h-full ${
                isNarrow ? "bg-primary/40" : "bg-muted-foreground/30"
              }`}
              style={{
                left: `${entry.confidenceLow}%`,
                width: `${Math.max(ciWidth, 1)}%`,
              }}
            />
            <div
              className="bg-foreground absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2"
              style={{ left: `${entry.winrate}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-1 flex items-center justify-between font-mono text-[10px] tabular-nums">
            <span className={isNarrow ? "" : "text-primary"}>
              {entry.confidenceLow}%–{entry.confidenceHigh}% CI
            </span>
            <span>{entry.total} games</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BestHeroPerMapCard({ result }: BestHeroPerMapCardProps) {
  const { bestHeroPerMap } = result;

  if (bestHeroPerMap.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Hero × map"
          title="Best Hero per Map"
          description={`Play at least ${HERO_MAP_MIN_GAMES} games with a hero on a map to see your best picks`}
        />
        <p className="text-muted-foreground py-8 text-center text-sm">
          No qualifying data yet
        </p>
      </section>
    );
  }

  const description = `Your highest-winrate hero on each map (min ${HERO_MAP_MIN_GAMES} games). The bar shows the 95% confidence interval; the tick marks the winrate.`;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Hero × map"
        title="Best Hero per Map"
        description={description}
        rightSlot={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="About confidence intervals"
                >
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-56">
                <p className="text-xs">
                  Wilson score intervals account for sample size. A wide bar
                  (highlighted) means the estimate is unreliable — play more
                  games to narrow it.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bestHeroPerMap.map((entry) => (
          <MapBestHeroCard key={entry.map} entry={entry} />
        ))}
      </div>
    </section>
  );
}
