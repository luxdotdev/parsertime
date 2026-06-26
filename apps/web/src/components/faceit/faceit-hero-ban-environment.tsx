"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { DivergingBar } from "@/components/faceit/viz";
import { Button } from "@/components/ui/button";
import type { HeroBanEnvironmentEntry } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  entries: HeroBanEnvironmentEntry[];
};

const DELTA_MAGNITUDE = 45;
const BAN_TARGET_COUNT = 3;

export function FaceitHeroBanEnvironment({ entries }: Props) {
  const t = useTranslations("faceitScoutingPage");
  const [showUnrated, setShowUnrated] = useState(false);

  const rated = entries.filter((e) => e.rated);
  const unrated = entries.filter((e) => !e.rated);
  const visible = (showUnrated ? entries : rated).slice().sort((a, b) => {
    if (a.rated !== b.rated) return a.rated ? -1 : 1;
    return b.delta - a.delta;
  });

  const topBanTargets = new Set(
    rated
      .filter((e) => e.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, BAN_TARGET_COUNT)
      .map((e) => e.hero)
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("bans.eyebrow")}
        title={t("bans.title")}
        description={t("bans.caveat")}
      />
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("bans.empty")}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="px-4 py-2 text-left font-medium">
                  {t("bans.hero")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("bans.withoutBan")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("bans.withBan")}
                </th>
                <th
                  className="hidden w-36 px-4 py-2 text-left font-medium sm:table-cell"
                  aria-hidden="true"
                />
                <th className="px-4 py-2 text-right font-medium">
                  {t("bans.delta")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("bans.sample")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map((entry) => {
                const banTarget = topBanTargets.has(entry.hero);
                return (
                  <tr
                    key={entry.hero}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      !entry.rated && "text-muted-foreground"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-foreground font-medium">
                        {entry.hero}
                      </span>
                      {banTarget ? (
                        <span className="bg-primary/15 text-primary ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase">
                          {t("bans.banTarget")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {Math.round(entry.notBannedWinRate)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {Math.round(entry.bannedWinRate)}%
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <DivergingBar
                        value={entry.delta}
                        magnitude={DELTA_MAGNITUDE}
                        positiveTone="primary"
                        negativeTone="muted"
                      />
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                        entry.delta > 0 && "text-primary",
                        entry.delta < 0 && "text-muted-foreground"
                      )}
                    >
                      {entry.delta > 0 ? "+" : ""}
                      {Math.round(entry.delta)}%
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {entry.notBannedPlayed}/{entry.bannedPlayed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {unrated.length > 0 ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUnrated((v) => !v)}
        >
          {showUnrated ? t("bans.hideUnrated") : t("bans.showUnrated")}
          <span className="text-muted-foreground ml-1.5 font-mono tabular-nums">
            {unrated.length}
          </span>
        </Button>
      ) : null}
    </section>
  );
}
