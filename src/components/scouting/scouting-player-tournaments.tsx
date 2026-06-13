"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

type TournamentMatchEntry = {
  date: Date;
  opponent: string;
  opponentFullName: string;
  teamScore: number | null;
  opponentScore: number | null;
  result: "win" | "loss";
  heroesPlayed: string[];
};

type TournamentRecord = {
  tournamentTitle: string;
  teamName: string;
  role: string;
  wins: number;
  losses: number;
  winRate: number;
  matches: TournamentMatchEntry[];
};

type Props = {
  tournamentRecords: TournamentRecord[];
};

const MAX_HERO_CHIPS = 4;

export function ScoutingPlayerTournaments({ tournamentRecords }: Props) {
  const t = useTranslations("scoutingPage.player.profile");
  const format = useFormatter();
  const [openIndices, setOpenIndices] = useState<Set<number>>(
    () => new Set([0])
  );

  function toggle(index: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow={t("historyEyebrow")}
        title={t("tournamentHistory")}
      />

      {tournamentRecords.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noTournamentData")}</p>
      ) : (
        <div className="space-y-3">
          {tournamentRecords.map((record, index) => {
            const open = openIndices.has(index);
            const strongRate = record.winRate >= 50;
            const matches = [...record.matches].sort(
              (a, b) => b.date.getTime() - a.date.getTime()
            );

            return (
              <div
                key={`${record.tournamentTitle}-${record.teamName}-${record.role}`}
                className="border-border overflow-hidden rounded-md border"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={open}
                  className="hover:bg-muted/30 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-foreground truncate font-medium">
                        {record.tournamentTitle}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {record.teamName}
                      </span>
                    </span>
                    <span className="text-muted-foreground mt-1 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
                      <span className="bg-muted/50 text-muted-foreground rounded-sm px-1.5 py-0.5">
                        {record.role}
                      </span>
                      <span className="tabular-nums">
                        {t("recordValue", {
                          wins: record.wins,
                          losses: record.losses,
                        })}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          strongRate ? "text-primary" : "text-destructive"
                        )}
                      >
                        {format.number(record.winRate / 100, {
                          style: "percent",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>

                {open ? (
                  <div className="border-border overflow-x-auto border-t">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                          <th className="px-4 py-2 text-left font-medium">
                            {t("date")}
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            {t("opponent")}
                          </th>
                          <th className="px-4 py-2 text-center font-medium">
                            {t("result")}
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            {t("score")}
                          </th>
                          <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                            {t("heroes")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {matches.map((m) => {
                          const won = m.result === "win";
                          const heroes = m.heroesPlayed.slice(0, MAX_HERO_CHIPS);
                          const overflow =
                            m.heroesPlayed.length - heroes.length;

                          return (
                            <tr
                              key={`${m.date.toISOString()}-${m.opponent}-${m.teamScore}-${m.opponentScore}`}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="text-muted-foreground px-4 py-3 font-mono text-xs whitespace-nowrap tabular-nums">
                                {format.dateTime(m.date, {
                                  year: "2-digit",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-foreground font-medium">
                                  {m.opponent}
                                </span>
                                <span className="text-muted-foreground ml-1.5 hidden text-xs sm:inline">
                                  {m.opponentFullName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={cn(
                                    "font-mono text-xs font-semibold",
                                    won ? "text-primary" : "text-destructive"
                                  )}
                                >
                                  {won ? t("win") : t("loss")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">
                                {m.teamScore != null &&
                                m.opponentScore != null ? (
                                  <span>
                                    <span
                                      className={
                                        won
                                          ? "text-foreground"
                                          : "text-muted-foreground"
                                      }
                                    >
                                      {m.teamScore}
                                    </span>
                                    <span className="text-muted-foreground/60">
                                      –
                                    </span>
                                    <span
                                      className={
                                        !won
                                          ? "text-foreground"
                                          : "text-muted-foreground"
                                      }
                                    >
                                      {m.opponentScore}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="hidden px-4 py-3 md:table-cell">
                                {heroes.length > 0 ? (
                                  <span className="flex flex-wrap items-center gap-1">
                                    {heroes.map((hero) => (
                                      <span
                                        key={hero}
                                        className="bg-muted/50 text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em]"
                                      >
                                        {hero}
                                      </span>
                                    ))}
                                    {overflow > 0 ? (
                                      <span className="text-muted-foreground/60 font-mono text-[10px] tabular-nums">
                                        +{overflow}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
