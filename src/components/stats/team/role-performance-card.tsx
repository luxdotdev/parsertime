"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { RolePerformanceStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type RolePerformanceCardProps = {
  roleStats: RolePerformanceStats;
};

type RoleKey = "Tank" | "Damage" | "Support";

const ROLES: RoleKey[] = ["Tank", "Damage", "Support"];

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatPer10Min(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function kdClass(kd: number, hasData: boolean): string {
  if (!hasData) return "text-muted-foreground";
  return kd >= 1 ? "text-primary" : "text-destructive";
}

function deathsClass(deathsPer10Min: number, hasData: boolean): string {
  if (!hasData) return "text-muted-foreground";
  if (deathsPer10Min < 5) return "text-primary";
  if (deathsPer10Min > 10) return "text-destructive";
  return "text-foreground";
}

export function RolePerformanceCard({ roleStats }: RolePerformanceCardProps) {
  const t = useTranslations("teamStatsPage.rolePerformanceCard");

  const hasData = ROLES.some((role) => roleStats[role].totalPlaytime > 0);

  if (!hasData) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Performance · Roles" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noDataAvailable")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Performance · Roles" title={t("title")} />
      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="px-4 py-2 text-left font-medium">Stat</th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="px-4 py-2 text-right font-medium"
                  scope="col"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("playtime")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? formatTime(stats.totalPlaytime) : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("maps")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? stats.mapCount : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("kd")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                      kdClass(stats.kd, has)
                    )}
                  >
                    {has ? stats.kd.toFixed(2) : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("damagePerMin")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? formatPer10Min(stats.damagePer10Min) : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("healingPerMin")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                if (role !== "Support") {
                  return (
                    <td
                      key={role}
                      className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums"
                    >
                      —
                    </td>
                  );
                }
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? formatPer10Min(stats.healingPer10Min) : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("deathsPerMin")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      deathsClass(stats.deathsPer10Min, has)
                    )}
                  >
                    {has ? formatPer10Min(stats.deathsPer10Min) : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("ultEfficiency")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? stats.ultEfficiency.toFixed(1) : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("elims")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? stats.eliminations : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("deaths")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? stats.deaths : "—"}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left font-normal"
              >
                {t("assists")}
              </th>
              {ROLES.map((role) => {
                const stats = roleStats[role];
                const has = stats.totalPlaytime > 0;
                return (
                  <td
                    key={role}
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      has ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {has ? stats.assists : "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
