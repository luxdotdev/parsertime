"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { PlayerTeamEntry } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import Link from "next/link";

type Props = {
  teams: PlayerTeamEntry[];
};

export function PlayerTeams({ teams }: Props) {
  const t = useTranslations("faceitPlayerPage");

  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <SectionHeader eyebrow="Teams" title={t("teams.title")} />
      <ul className="space-y-2">
        {teams.map((team) => {
          const href = `/faceit/team/${encodeURIComponent(team.faceitTeamId)}` as Route;
          return (
            <li key={team.faceitTeamId} className="flex items-center gap-2 text-sm">
              <Link
                href={href}
                className="hover:text-primary font-medium underline underline-offset-2"
              >
                {team.name}
              </Link>
              <span className="text-muted-foreground">
                {t("teams.appearances", { count: team.appearances })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
