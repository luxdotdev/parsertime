"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { PlayerFsrRole } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";

type Props = {
  role: PlayerFsrRole;
};

export function PlayerStrengthsWeaknesses({ role }: Props) {
  const t = useTranslations("faceitPlayerPage");

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow={role.role}
        title={`${t("insights.strengths")} & ${t("insights.weaknesses")}`}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("insights.strengths")}
          </p>
          {role.strengths.length > 0 ? (
            <ul className="space-y-1">
              {role.strengths.map((item) => (
                <li
                  key={item.stat}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{t(`stat.${item.stat}`)}</span>
                  <span className="text-primary font-mono tabular-nums">
                    +{item.z.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t("insights.none")}</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("insights.weaknesses")}
          </p>
          {role.weaknesses.length > 0 ? (
            <ul className="space-y-1">
              {role.weaknesses.map((item) => (
                <li
                  key={item.stat}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{t(`stat.${item.stat}`)}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {item.z.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t("insights.none")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
