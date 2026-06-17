"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PageHeatRow } from "@/lib/usage/queries";
import { useTranslations } from "next-intl";

const UNDERUSED_UNIQUE_USERS = 3; // pages seen by fewer than N distinct users

export function HotColdTable({ data }: { data: PageHeatRow[] }) {
  const t = useTranslations("settingsPage.admin.analytics.usage");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("page")}</TableHead>
          <TableHead className="text-right">{t("views")}</TableHead>
          <TableHead className="text-right">{t("uniqueUsers")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.path}
            className={
              row.uniqueUsers < UNDERUSED_UNIQUE_USERS
                ? "text-muted-foreground"
                : ""
            }
          >
            <TableCell className="font-mono text-xs">
              {row.path}
              {row.uniqueUsers < UNDERUSED_UNIQUE_USERS ? (
                <span className="bg-muted ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase">
                  {t("underused")}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="text-right">
              {row.views.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {row.uniqueUsers.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
