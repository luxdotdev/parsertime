"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MapDetailedResult } from "@/lib/ranked-stats";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

type MapTierListCardProps = {
  result: MapDetailedResult;
};

const TIER_CONFIG = {
  S: {
    label: "S",
    description: "Dominant",
    className: "bg-primary/15 text-primary border-primary/30",
    headerClassName: "text-primary",
  },
  A: {
    label: "A",
    description: "Strong",
    className: "bg-primary/10 text-primary/90 border-primary/20",
    headerClassName: "text-primary/90",
  },
  B: {
    label: "B",
    description: "Solid",
    className: "bg-muted text-foreground border-border",
    headerClassName: "text-foreground",
  },
  C: {
    label: "C",
    description: "Neutral",
    className: "bg-muted/50 text-muted-foreground border-border",
    headerClassName: "text-muted-foreground",
  },
  D: {
    label: "D",
    description: "Struggling",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    headerClassName: "text-destructive",
  },
} as const;

const TIERS = ["S", "A", "B", "C", "D"] as const;

export function MapTierListCard({ result }: MapTierListCardProps) {
  const t = useTranslations("ranked.charts.mapTierList");
  const { data } = result;

  const tierGroups = TIERS.reduce<
    Record<string, typeof data>
  >((acc, tier) => {
    acc[tier] = data.filter((d) => d.tier === tier && d.total > 0);
    return acc;
  }, {});

  const totalMaps = data.filter((d) => d.total > 0).length;

  const description =
    totalMaps > 0
      ? t("description", { count: totalMaps })
      : t("descriptionEmpty");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <TooltipProvider>
          <div className="space-y-2" role="list" aria-label={t("listLabel")}>
            {TIERS.map((tier) => {
              const maps = tierGroups[tier] ?? [];
              const config = TIER_CONFIG[tier];

              return (
                <div
                  key={tier}
                  className="flex items-start gap-3 min-h-[40px]"
                  role="listitem"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-bold"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    aria-label={t("tierLabel", {
                      tier,
                      description: t(`tierDescription.${tier}`),
                    })}
                  >
                    <span className={config.headerClassName}>{tier}</span>
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5 py-1.5">
                    {maps.length === 0 ? (
                      <span className="text-muted-foreground/50 text-xs italic">
                        —
                      </span>
                    ) : (
                      maps.map((map) => (
                        <Tooltip key={map.name}>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex cursor-default items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${config.className}`}
                            >
                              {map.name}
                              {!map.hasEnoughData && (
                                <AlertTriangle
                                  className="size-2.5 text-primary"
                                  aria-label={t("lowSampleLabel")}
                                />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold">{map.name}</p>
                              <p className="text-muted-foreground">
                                {map.mapType}
                              </p>
                              <p>
                                {map.draws > 0
                                  ? t("winrateLineWithDraws", {
                                      winrate: map.winrate,
                                      wins: map.wins,
                                      losses: map.losses,
                                      draws: map.draws,
                                    })
                                  : t("winrateLine", {
                                      winrate: map.winrate,
                                      wins: map.wins,
                                      losses: map.losses,
                                    })}
                              </p>
                              {!map.hasEnoughData && (
                                <p className="text-primary">
                                  {t("lowConfidence", { count: map.total })}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
    </section>
  );
}
