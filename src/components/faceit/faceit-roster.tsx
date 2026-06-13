"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { MeterBar } from "@/components/faceit/viz";
import { FsrExplainer } from "@/components/faceit/fsr-explainer";
import type { FaceitRosterPlayer } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  roster: FaceitRosterPlayer[];
};

const FSR_CEILING = 5000;

export function FaceitRoster({ roster }: Props) {
  const t = useTranslations("faceitScoutingPage");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("roster.eyebrow")}
        title={t("roster.title")}
        rightSlot={<FsrExplainer />}
      />
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="px-4 py-2 text-left font-medium">
                {t("roster.player")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("roster.role")}
              </th>
              <th className="w-32 px-4 py-2 text-left font-medium">
                {t("roster.share")}
              </th>
              <th className="w-32 px-4 py-2 text-left font-medium">
                {t("roster.fsr")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("roster.tsr")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {roster.map((player) => (
              <tr
                key={player.faceitPlayerId}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">
                      {player.nickname}
                    </span>
                    <span
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase",
                        player.starter
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {player.starter ? t("roster.starter") : t("roster.sub")}
                    </span>
                  </div>
                  {player.battletag ? (
                    <span className="text-muted-foreground font-mono text-xs">
                      {player.battletag}
                    </span>
                  ) : null}
                </td>
                <td className="text-muted-foreground px-4 py-3 font-mono">
                  {player.role ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MeterBar
                      value={player.appearanceShare * 100}
                      max={100}
                      className="w-16"
                    />
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {Math.round(player.appearanceShare * 100)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {player.fsr != null ? (
                    <div className="flex items-center gap-2">
                      <MeterBar
                        value={player.fsr}
                        max={FSR_CEILING}
                        className="w-16"
                      />
                      <span className="text-foreground font-mono text-xs font-semibold tabular-nums">
                        {player.fsr}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground font-mono text-xs">
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {player.tsr ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
