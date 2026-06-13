"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerRoleUsage } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";

type Props = {
  usage: PlayerRoleUsage[];
};

export function PlayerRoleUsage({ usage }: Props) {
  const t = useTranslations("faceitPlayerPage");

  return (
    <div className="space-y-4">
      <SectionHeader eyebrow={t("roles.eyebrow")} title={t("roles.title")} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("roles.role")}</TableHead>
            <TableHead className="text-right">{t("roles.maps")}</TableHead>
            <TableHead className="text-right">{t("roles.share")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usage.map((row) => (
            <TableRow key={row.role}>
              <TableCell className="font-mono text-sm">{row.role}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {row.mapCount}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {Math.round(row.share * 100)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
