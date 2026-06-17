"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { MeterBar } from "@/components/faceit/viz";
import { FsrExplainer } from "@/components/faceit/fsr-explainer";
import type { FaceitTeamLink } from "@/data/scouting/types";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import Link from "next/link";

type Props = {
  link: FaceitTeamLink;
};

/** FSR ceiling — keep in sync with the FACEIT scouting surfaces. */
const FSR_CEILING = 5000;

export function ScoutingFaceitLink({ link }: Props) {
  const t = useTranslations("scoutingPage.team.faceitLink");

  const href = `/faceit/team/${encodeURIComponent(link.faceitTeamId)}` as Route;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title", { name: link.faceitTeamName })}
        description={t("subtitle")}
        rightSlot={<FsrExplainer />}
      />

      <div className="border-border grid gap-x-10 gap-y-6 border-y py-6 lg:grid-cols-12">
        <div className="space-y-1.5 lg:col-span-4">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("aggregateFsr")}
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {link.aggregateFsr != null ? (
              <span className="text-primary">{link.aggregateFsr}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
          <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {t("coverage", {
              covered: link.fsrCovered,
              shared: link.sharedPlayers.length,
            })}
          </p>
          <Link
            href={href}
            className="text-foreground hover:text-primary inline-flex items-center gap-1 pt-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("viewProfile")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-3 lg:col-span-8">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("matchedPlayers")}
          </p>
          <ul className="space-y-2.5">
            {link.sharedPlayers.map((p) => (
              <li
                key={p.owcsName}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr_3rem]"
              >
                <span className="min-w-0 truncate text-sm">
                  <span className="text-foreground font-medium">
                    {p.owcsName}
                  </span>
                  {p.faceitNickname.toLowerCase() !==
                  p.owcsName.toLowerCase() ? (
                    <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                      {p.faceitNickname}
                    </span>
                  ) : null}
                </span>
                <div className="col-span-2 sm:col-span-1 sm:px-2">
                  <MeterBar
                    value={p.fsr ?? 0}
                    max={FSR_CEILING}
                    tone={p.fsr != null ? "primary" : "muted"}
                  />
                </div>
                <span className="text-right font-mono text-sm font-semibold tabular-nums">
                  {p.fsr ?? <span className="text-muted-foreground">—</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-muted-foreground/80 text-xs">{t("disclaimer")}</p>
    </section>
  );
}
