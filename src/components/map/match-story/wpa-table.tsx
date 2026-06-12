"use client";

import type { PlayerWpa } from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";

export function WpaTable({ wpa }: { wpa: PlayerWpa[] }) {
  const t = useTranslations("mapPage.matchStory.wpa");
  return (
    <div className="border-border border">
      <div className="text-muted-foreground border-border grid grid-cols-3 gap-2 border-b px-3 py-1.5 font-mono text-[10px] uppercase">
        <span>{t("player")}</span>
        <span>{t("team")}</span>
        <span className="text-right">{t("total")}</span>
      </div>
      {wpa.map((p) => (
        <details
          key={`${p.team}-${p.player}`}
          className="border-border border-b last:border-b-0"
        >
          <summary className="grid cursor-pointer grid-cols-3 gap-2 px-3 py-1.5 text-sm">
            <span>{p.player}</span>
            <span className="text-muted-foreground">{p.team}</span>
            <span
              className={`text-right font-mono tabular-nums ${p.wpa >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {p.wpa >= 0 ? "+" : ""}
              {(p.wpa * 100).toFixed(1)}%
            </span>
          </summary>
          <ul className="text-muted-foreground px-3 pb-2 text-xs">
            {p.byFight.map((share) => (
              <li key={share.fightIndex} className="font-mono tabular-nums">
                {t("fightShare", {
                  fight: share.fightIndex + 1,
                  share: (share.share * 100).toFixed(1),
                })}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
