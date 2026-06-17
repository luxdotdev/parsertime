"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { MeterBar } from "@/components/faceit/viz";
import type { PlayerRoleUsage } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";

type Props = {
  usage: PlayerRoleUsage[];
};

export function PlayerRoleUsage({ usage }: Props) {
  const t = useTranslations("faceitPlayerPage");

  if (usage.length === 0) return null;

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={t("roles.eyebrow")} title={t("roles.title")} />
      <ul className="space-y-3">
        {usage.map((row) => (
          <li
            key={row.role}
            className="grid grid-cols-[5.5rem_1fr_5.5rem] items-center gap-4 text-sm"
          >
            <span className="font-mono uppercase">{row.role}</span>
            <MeterBar value={row.share * 100} max={100} />
            <span className="text-right font-mono tabular-nums">
              {Math.round(row.share * 100)}%
              <span className="text-muted-foreground ml-1.5 text-xs">
                {row.mapCount}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
