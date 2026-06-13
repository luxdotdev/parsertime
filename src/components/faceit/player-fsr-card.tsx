"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PlayerFsrRole } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";

type Props = {
  roles: PlayerFsrRole[];
};

export function PlayerFsrCard({ roles }: Props) {
  const t = useTranslations("faceitPlayerPage");

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("fsr.title")} title={t("fsr.byTier")} />
      {roles.map((role) => {
        const cells = [
          {
            label: t("fsr.headline"),
            value: role.fsr.toFixed(1),
            emphasis: true,
          },
          {
            label: t("fsr.maps"),
            value: String(role.mapCount),
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fsr.tier")}</TableHead>
                    <TableHead className="text-right">{t("fsr.rating")}</TableHead>
                    <TableHead className="text-right">{t("fsr.maps")}</TableHead>
                    <TableHead className="text-right">{t("fsr.percentile")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {role.tiers.map((tier) => (
                    <TableRow key={tier.tier}>
                      <TableCell className="font-mono text-sm">{tier.tier}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {tier.fsr.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {tier.mapCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {Math.round(tier.percentile)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
