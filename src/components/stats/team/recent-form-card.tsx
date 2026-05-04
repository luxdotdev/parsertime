"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecentForm } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

type RecentFormCardProps = {
  recentForm: RecentForm;
};

export function RecentFormCard({ recentForm }: RecentFormCardProps) {
  const t = useTranslations("teamStatsPage.recentFormCard");
  const [view, setView] = useState<"5" | "10" | "20">("5");

  const matches =
    view === "5"
      ? recentForm.last5
      : view === "10"
        ? recentForm.last10
        : recentForm.last20;
  const winrate =
    view === "5"
      ? recentForm.last5Winrate
      : view === "10"
        ? recentForm.last10Winrate
        : recentForm.last20Winrate;

  const viewSelect = (
    <Select value={view} onValueChange={(v) => setView(v as "5" | "10" | "20")}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="5">{t("last5")}</SelectItem>
        <SelectItem value="10">{t("last10")}</SelectItem>
        <SelectItem value="20">{t("last20")}</SelectItem>
      </SelectContent>
    </Select>
  );

  if (matches.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Trends · Recent form"
          title={t("title")}
          rightSlot={viewSelect}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;

  const formLabel =
    winrate >= 60
      ? t("strongRecentPerformance")
      : winrate <= 40
        ? t("strugglingRecently")
        : t("averagePerformance");

  const formTagClass =
    winrate >= 60
      ? "bg-primary/15 text-primary"
      : winrate <= 40
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Trends · Recent form"
        title={t("title")}
        description={t("winsLosses", {
          wins,
          losses,
          winrate: winrate.toFixed(1),
        })}
        rightSlot={viewSelect}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={cn(
            "rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
            formTagClass
          )}
        >
          {formLabel}
        </span>
        <span className="text-foreground font-mono text-sm font-semibold tabular-nums">
          {winrate.toFixed(1)}%
        </span>
      </div>

      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="w-20 px-4 py-2 text-left font-medium">Result</th>
              <th className="px-4 py-2 text-left font-medium">Scrim</th>
              <th className="px-4 py-2 text-left font-medium">Map</th>
              <th className="w-28 px-4 py-2 text-right font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {matches.map((match) => (
              <tr
                key={`${match.scrimId}-${match.mapName}`}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase tabular-nums",
                      match.result === "win"
                        ? "bg-primary/15 text-primary"
                        : "bg-destructive/15 text-destructive"
                    )}
                  >
                    {match.result === "win" ? t("win") : t("loss")}
                  </span>
                </td>
                <td className="text-foreground px-4 py-3 font-medium">
                  {match.scrimName}
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {match.mapName}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono text-xs tabular-nums">
                  {match.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-border flex items-center gap-1 rounded-md border px-3 py-2.5">
        {matches.map((match) => (
          <span
            key={`indicator-${match.scrimId}-${match.mapName}`}
            className={cn(
              "h-2 flex-1 rounded-sm",
              match.result === "win" ? "bg-primary/70" : "bg-destructive/70"
            )}
            title={`${match.scrimName} - ${match.result === "win" ? t("win") : t("loss")}`}
          />
        ))}
      </div>
    </section>
  );
}
