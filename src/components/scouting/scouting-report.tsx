"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { Insight, InsightCategory, InsightReport } from "@/lib/insights";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  report: InsightReport;
  hasUserTeamLink: boolean;
};

type Tone = "exploit" | "threat" | "neutral";

/** Your edge vs. their threat — carried by tone, never asserted by color alone. */
function toneFor(insight: Insight): Tone {
  const c: InsightCategory = insight.category;
  if (
    c === "map_advantage" ||
    c === "ban_exploitation" ||
    c === "player_highlight"
  )
    return "exploit";
  if (
    c === "map_vulnerability" ||
    c === "ban_defense" ||
    c === "player_vulnerability"
  )
    return "threat";
  // trend_alert: opponent improving is a threat, declining is an opening.
  if (insight.id.includes("improving")) return "threat";
  if (insight.id.includes("declining")) return "exploit";
  return "neutral";
}

const DOT: Record<Tone, string> = {
  exploit: "bg-primary",
  threat: "bg-destructive",
  neutral: "bg-muted-foreground/50",
};

const CONFIDENCE_TONE: Record<string, string> = {
  high: "text-primary",
  medium: "text-foreground",
  low: "text-muted-foreground",
  insufficient: "text-muted-foreground",
};

export function ScoutingReport({ report, hasUserTeamLink }: Props) {
  const t = useTranslations("scoutingPage.team.report");
  const [expanded, setExpanded] = useState(false);

  const hasInsights = report.primary.length > 0;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
        rightSlot={
          hasInsights ? (
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase tabular-nums">
              {t("confidenceLabel", {
                level: t(`confidence.${report.overallConfidence.level}`),
              })}
            </span>
          ) : null
        }
      />

      {!hasInsights ? (
        <div className="border-border rounded-md border border-dashed px-4 py-6">
          <p className="text-muted-foreground text-sm">
            {hasUserTeamLink ? t("emptyLinked") : t("emptyUnlinked")}
          </p>
        </div>
      ) : (
        <>
          <ol className="border-border divide-border divide-y border-y">
            {report.primary.map((insight) => (
              <InsightRow key={insight.id} insight={insight} t={t} />
            ))}
          </ol>

          {report.secondary.length > 0 ? (
            <>
              {expanded ? (
                <ol className="border-border divide-border divide-y border-b">
                  {report.secondary.map((insight) => (
                    <InsightRow key={insight.id} insight={insight} t={t} />
                  ))}
                </ol>
              ) : null}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
              >
                {expanded
                  ? t("showFewer")
                  : t("showMore", { count: report.secondary.length })}
              </button>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function InsightRow({
  insight,
  t,
}: {
  insight: Insight;
  t: ReturnType<typeof useTranslations>;
}) {
  const tone = toneFor(insight);
  return (
    <li className="flex gap-3 py-4">
      <span
        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", DOT[tone])}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-foreground font-medium leading-snug text-pretty">
          {insight.headline}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {insight.detail}
        </p>
        {insight.actionItems.length > 0 ? (
          <ul className="space-y-1 pt-0.5">
            {insight.actionItems.map((action) => (
              <li
                key={action}
                className="text-foreground/90 flex items-baseline gap-1.5 text-sm"
              >
                <ArrowRight
                  className="text-muted-foreground size-3 shrink-0 translate-y-0.5"
                  aria-hidden="true"
                />
                <span className="text-pretty">{action}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.14em] uppercase tabular-nums",
              CONFIDENCE_TONE[insight.confidence.level]
            )}
          >
            {t(`confidence.${insight.confidence.level}`)} ·{" "}
            {t("sampleMaps", { count: insight.confidence.sampleSize })}
          </span>
          <span className="border-border text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase">
            {t(`source.${insight.dataSource}`)}
          </span>
        </div>
      </div>
    </li>
  );
}
