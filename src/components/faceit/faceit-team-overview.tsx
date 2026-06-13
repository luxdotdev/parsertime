"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FaceitTeamOverview, RosterStrength } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type FaceitTeamOverviewProps = {
  overview: FaceitTeamOverview;
  strength: RosterStrength;
};

export function FaceitTeamOverview({ overview, strength }: FaceitTeamOverviewProps) {
  const t = useTranslations("faceitScoutingPage");

  return (
    <div className="space-y-4 pt-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("overview.record")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {overview.wins}–{overview.losses}
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {overview.totalMatches} matches
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("overview.winRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {overview.winRate.toFixed(0)}%
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {t("overview.weightedWinRate")} {overview.weightedWinRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("overview.strength")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm tabular-nums">
                <span className="font-medium">{t("strengthFsr")}</span>{" "}
                {strength.fsr ?? "—"}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({t("coverage", { covered: strength.fsrCovered, size: strength.rosterSize })})
                </span>
              </p>
              <p className="text-sm tabular-nums">
                <span className="font-medium">{t("strengthTsr")}</span>{" "}
                {strength.tsr ?? "—"}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({t("coverage", { covered: strength.tsrCovered, size: strength.rosterSize })})
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("overview.tierDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(overview.tierCounts).map(([tier, count]) => (
                <div key={tier} className="text-xs tabular-nums">
                  <span className="text-muted-foreground">{tier}:</span>{" "}
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("overview.form")}</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentForm.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" role="list" aria-label={t("overview.form")}>
              {stableFormKeys(overview.recentForm).map(({ key, result }) => (
                <span
                  key={key}
                  role="listitem"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold",
                    result === "win"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-600 dark:text-red-400"
                  )}
                >
                  {result === "win" ? "W" : "L"}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No matches recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function stableFormKeys(form: ("win" | "loss")[]) {
  const counts = new Map<string, number>();
  return form.map((result) => {
    const n = (counts.get(result) ?? 0) + 1;
    counts.set(result, n);
    return { key: `${result}-${n}`, result };
  });
}
