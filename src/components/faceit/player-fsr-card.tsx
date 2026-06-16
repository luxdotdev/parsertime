"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { FsrExplainer } from "@/components/faceit/fsr-explainer";
import { MeterBar } from "@/components/faceit/viz";
import { Badge } from "@/components/ui/badge";
import type { PlayerFsrRole } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";

type Props = {
  roles: PlayerFsrRole[];
};

const FSR_CEILING = 5000;

export function PlayerFsrCard({ roles }: Props) {
  const t = useTranslations("faceitPlayerPage");

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow={t("fsr.title")}
        title={t("fsr.byTier")}
        rightSlot={<FsrExplainer />}
      />
      {roles.map((role) => {
        const cells = [
          {
            label: t("fsr.headline"),
            value: String(role.fsr),
            emphasis: true,
          },
          { label: t("fsr.maps"), value: String(role.mapCount) },
          {
            label: t("fsr.recent"),
            value: String(role.recentMapCount365d),
          },
        ];

        return (
          <div key={role.role} className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold tracking-wide uppercase">
                {role.role}
              </p>
              {role.primary ? (
                <Badge variant="secondary">{t("fsr.primary")}</Badge>
              ) : null}
            </div>
            <StatRibbon cells={cells} columns={3} />
            {role.tiers.length > 0 ? (
              <div className="border-border overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                      <th className="px-4 py-2 text-left font-medium">
                        {t("fsr.tier")}
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        {t("fsr.rating")}
                      </th>
                      <th className="hidden w-40 px-4 py-2 text-left font-medium sm:table-cell">
                        {t("fsr.ratingScale")}
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        {t("fsr.maps")}
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        {t("fsr.percentile")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {role.tiers.map((tier) => (
                      <tr
                        key={tier.tier}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono">{tier.tier}</td>
                        <td className="text-foreground px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          {tier.fsr}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <MeterBar value={tier.fsr} max={FSR_CEILING} />
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                          {tier.mapCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {Math.round(tier.percentile)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
