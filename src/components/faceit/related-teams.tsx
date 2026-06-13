"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RelatedTeam } from "@/data/faceit/types";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import Link from "next/link";

type RelatedTeamsProps = {
  related: RelatedTeam[];
  teamId: string;
  combined: boolean;
};

export function RelatedTeams({ related, teamId, combined }: RelatedTeamsProps) {
  const t = useTranslations("faceitScoutingPage");

  if (related.length === 0) return null;

  const toggleHref = (
    combined
      ? `/faceit/team/${encodeURIComponent(teamId)}`
      : `/faceit/team/${encodeURIComponent(teamId)}?combined=1`
  ) as Route;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("related.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="flex flex-wrap gap-3">
          {related.map((r) => (
            <li key={r.faceitTeamId}>
              <Link
                href={`/faceit/team/${encodeURIComponent(r.faceitTeamId)}` as Route}
                className="text-sm font-medium hover:underline"
              >
                {r.name}
              </Link>
              <span className="text-muted-foreground ml-1 text-xs">
                ({t("related.shared", { n: r.sharedCorePlayers })})
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={toggleHref}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          {combined ? t("related.separate") : t("related.combine")}
        </Link>
      </CardContent>
    </Card>
  );
}
