"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import type { FaceitPlayerProfile } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";

type Props = {
  player: FaceitPlayerProfile["player"];
};

export function PlayerProfileHeader({ player }: Props) {
  const t = useTranslations("faceitPlayerPage");

  const cells = [
    { label: t("header.region"), value: player.region },
    {
      label: t("header.level"),
      value: player.ow2SkillLevel != null ? String(player.ow2SkillLevel) : "—",
    },
    {
      label: t("header.verified"),
      value: player.verified ? "Yes" : "No",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Player"
        title={player.nickname}
        description={player.battletag ?? undefined}
      />
      <StatRibbon cells={cells} columns={3} />
    </div>
  );
}
