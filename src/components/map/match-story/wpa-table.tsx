"use client";

import type { PlayerWpa } from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";

export function WpaTable({
  wpa,
  teams,
  team1Color,
  team2Color,
}: {
  wpa: PlayerWpa[];
  teams: { team1: string; team2: string };
  team1Color: string;
  team2Color: string;
}) {
  const t = useTranslations("mapPage.matchStory.wpa");
  const maxWpa = Math.max(0.001, ...wpa.map((p) => Math.abs(p.wpa)));

  return (
    <div className="border-border border">
      <div className="text-muted-foreground border-border grid grid-cols-[8rem_1fr_4.5rem] gap-3 border-b px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] uppercase">
        <span>{t("player")}</span>
        <span aria-hidden className="text-center">
          − / +
        </span>
        <span className="text-right">{t("total")}</span>
      </div>
      {wpa.map((p) => {
        const teamColor =
          p.team === teams.team1
            ? team1Color
            : p.team === teams.team2
              ? team2Color
              : "var(--muted-foreground)";
        const half = Math.min(1, Math.abs(p.wpa) / maxWpa) * 50;
        return (
          <details
            key={`${p.team}-${p.player}`}
            className="border-border group border-b last:border-b-0"
          >
            <summary className="hover:bg-muted/60 grid cursor-pointer grid-cols-[8rem_1fr_4.5rem] items-center gap-3 px-3 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: teamColor }}
                />
                <span className="truncate">{p.player}</span>
              </span>
              <span aria-hidden className="bg-muted relative block h-2">
                <span className="bg-border absolute inset-y-0 left-1/2 w-px" />
                <span
                  className="absolute inset-y-0"
                  style={{
                    backgroundColor: teamColor,
                    left: p.wpa >= 0 ? "50%" : `${50 - half}%`,
                    width: `${half}%`,
                  }}
                />
              </span>
              <span className="text-right font-mono text-sm tabular-nums">
                {p.wpa >= 0 ? "+" : "−"}
                {Math.abs(p.wpa * 100).toFixed(1)}%
              </span>
            </summary>
            <ul className="text-muted-foreground grid grid-cols-2 gap-x-6 px-3 pb-2 pl-7 text-xs sm:grid-cols-3">
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
        );
      })}
    </div>
  );
}
