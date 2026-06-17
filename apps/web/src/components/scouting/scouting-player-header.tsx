"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import type { PlayerProfile } from "@/data/player/types";
import { ArrowUpRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

type Props = {
  profile: PlayerProfile;
};

export function ScoutingPlayerHeader({ profile }: Props) {
  const t = useTranslations("scoutingPage.player.profile");
  const format = useFormatter();

  const winnings = format.number(profile.winnings, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const cells = [
    {
      label: t("careerWinnings"),
      value: winnings,
      emphasis: profile.winnings > 0,
    },
    {
      label: t("tournamentsLabel"),
      value: String(profile.totalTournaments),
    },
    {
      label: t("competitiveMaps"),
      value: String(profile.competitiveMapCount),
    },
    {
      label: t("role"),
      value: profile.role,
    },
  ];

  return (
    <header className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={profile.name}
        rightSlot={
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                {profile.team} · {profile.role}
              </span>
            </div>
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {profile.region} · {profile.country}
            </span>
            <a
              href={profile.playerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors"
            >
              {t("liquipediaProfile")}
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          </div>
        }
      />
      <StatRibbon cells={cells} columns={4} />
    </header>
  );
}
