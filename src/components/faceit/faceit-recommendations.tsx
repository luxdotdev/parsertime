"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FaceitRecommendation } from "@/data/faceit/types";
import { useTranslations } from "next-intl";

type FaceitRecommendationsProps = {
  recommendations: FaceitRecommendation[];
};

const KIND_ORDER = ["map_pick", "map_avoid", "ban_hero", "do_not_ban_hero"] as const;

type KindKey = (typeof KIND_ORDER)[number];

export function FaceitRecommendations({ recommendations }: FaceitRecommendationsProps) {
  const t = useTranslations("faceitScoutingPage");

  if (recommendations.length === 0) {
    return (
      <div className="pt-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">{t("recommendations.none")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kindTitleMap: Record<KindKey, string> = {
    map_pick: t("recommendations.pickMaps"),
    map_avoid: t("recommendations.avoidMaps"),
    ban_hero: t("recommendations.banHeroes"),
    do_not_ban_hero: t("recommendations.dontBan"),
  };

  const grouped = KIND_ORDER.reduce<Record<KindKey, FaceitRecommendation[]>>(
    (acc, kind) => {
      acc[kind] = recommendations.filter((r) => r.kind === kind);
      return acc;
    },
    { map_pick: [], map_avoid: [], ban_hero: [], do_not_ban_hero: [] }
  );

  return (
    <div className="space-y-4 pt-4">
      {KIND_ORDER.filter((kind) => grouped[kind].length > 0).map((kind) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle>{kindTitleMap[kind]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {grouped[kind].map((rec, i) => (
                <li key={`${rec.kind}-${rec.subject}`} className="flex items-start gap-3">
                  <span className="text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{rec.subject}</p>
                    <p className="text-muted-foreground text-xs">
                      {rec.kind === "map_pick" || rec.kind === "map_avoid"
                        ? t("recommendations.mapReason", {
                            winRate: Math.round(rec.winRate ?? 0),
                            played: rec.played ?? 0,
                          })
                        : t("recommendations.heroReason", {
                            withoutBan: Math.round(rec.notBannedWinRate ?? 0),
                            withBan: Math.round(rec.bannedWinRate ?? 0),
                            bannedSample: rec.bannedSample ?? 0,
                            notBannedSample: rec.notBannedSample ?? 0,
                          })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
