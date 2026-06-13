"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { FaceitRecommendation } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  recommendations: FaceitRecommendation[];
};

const KIND_ORDER = [
  "map_pick",
  "ban_hero",
  "map_avoid",
  "do_not_ban_hero",
] as const;

type KindKey = (typeof KIND_ORDER)[number];

const TONE: Record<KindKey, "exploit" | "threat" | "neutral"> = {
  map_pick: "exploit",
  ban_hero: "exploit",
  map_avoid: "threat",
  do_not_ban_hero: "neutral",
};

export function FaceitGamePlan({ recommendations }: Props) {
  const t = useTranslations("faceitScoutingPage");

  const titleMap: Record<KindKey, string> = {
    map_pick: t("gamePlan.forceMaps"),
    ban_hero: t("gamePlan.banHeroes"),
    map_avoid: t("gamePlan.avoidMaps"),
    do_not_ban_hero: t("gamePlan.dontBan"),
  };

  const grouped = KIND_ORDER.reduce<Record<KindKey, FaceitRecommendation[]>>(
    (acc, kind) => {
      acc[kind] = recommendations.filter((r) => r.kind === kind);
      return acc;
    },
    { map_pick: [], ban_hero: [], map_avoid: [], do_not_ban_hero: [] }
  );

  const populated = KIND_ORDER.filter((k) => grouped[k].length > 0);

  if (populated.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("gamePlan.eyebrow")} title={t("gamePlan.title")} />
        <p className="text-muted-foreground text-sm">{t("gamePlan.none")}</p>
      </section>
    );
  }

  function detail(rec: FaceitRecommendation): string {
    if (rec.kind === "map_pick" || rec.kind === "map_avoid") {
      return t("recommendations.mapReason", {
        winRate: Math.round(rec.winRate ?? 0),
        played: rec.played ?? 0,
      });
    }
    return t("recommendations.heroReason", {
      withoutBan: Math.round(rec.notBannedWinRate ?? 0),
      withBan: Math.round(rec.bannedWinRate ?? 0),
      bannedSample: rec.bannedSample ?? 0,
      notBannedSample: rec.notBannedSample ?? 0,
    });
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("gamePlan.eyebrow")}
        title={t("gamePlan.title")}
        description={t("gamePlan.subtitle")}
      />
      <div className="border-border grid gap-x-10 gap-y-7 border-y py-6 sm:grid-cols-2">
        {populated.map((kind) => {
          const tone = TONE[kind];
          return (
            <div key={kind} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    tone === "exploit"
                      ? "bg-primary"
                      : tone === "threat"
                        ? "bg-destructive"
                        : "bg-muted-foreground/50"
                  )}
                  aria-hidden="true"
                />
                <h3
                  className={cn(
                    "font-mono text-[11px] tracking-[0.16em] uppercase",
                    tone === "exploit"
                      ? "text-primary"
                      : tone === "threat"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                >
                  {titleMap[kind]}
                </h3>
              </div>
              <ul className="space-y-2.5">
                {grouped[kind].map((rec) => (
                  <li
                    key={`${rec.kind}-${rec.subject}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                  >
                    <span className="text-foreground font-medium">
                      {rec.subject}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {detail(rec)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
