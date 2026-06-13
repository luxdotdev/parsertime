// src/components/map/fight-initiation-inspector.tsx
"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { ConfidenceDot } from "@/components/scouting/confidence-indicator";
import { cn, toTimestamp } from "@/lib/utils";
import type {
  FightInitiationLabel,
  InitiationConfidence,
  MapInitiationResult,
} from "@/lib/fight-initiation";
import { useTranslations } from "next-intl";

const CONFIDENCE_LABEL_KEY: Record<InitiationConfidence, string> = {
  high: "confidenceHigh",
  medium: "confidenceMedium",
  low: "confidenceLow",
};

export function FightInitiationInspector({
  result,
}: {
  result: MapInitiationResult;
}) {
  const t = useTranslations("mapPage.fightInitiation");

  if (!result.available || !result.summary) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("unavailable")}</p>
      </section>
    );
  }

  const { summary, labels } = result;
  const [teamA, teamB] = summary.teams;

  const cells = [teamA, teamB].map((team) => ({
    label: t("summaryWinrate", { team }),
    value: `${summary.byTeam[team].initiationWinrate.toFixed(0)}%`,
    sub: `${t("summaryFrequency", { team })}: ${summary.byTeam[team].initiations}`,
    emphasis: true,
  }));

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("coverage", {
          labeled: summary.labeledFights,
          total: summary.totalFights,
          contested: summary.contestedFights,
        })}
      />
      <StatRibbon cells={cells} columns={4} />
      <ul className="divide-y divide-[var(--border)] border-y">
        {labels.map((label) => (
          <FightRow key={label.fightIndex} label={label} />
        ))}
      </ul>
    </section>
  );
}

function FightRow({ label }: { label: FightInitiationLabel }) {
  const t = useTranslations("mapPage.fightInitiation");

  const headline = label.contested
    ? t("contested")
    : label.initiator
      ? t("initiatedBy", { team: label.initiator })
      : t("contested");

  const lostOpener =
    !label.contested &&
    label.initiator !== null &&
    label.firstBloodTeam !== null &&
    label.firstBloodTeam !== label.initiator;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-3 text-sm">
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {t("fightLabel", { number: label.fightIndex + 1 })}
      </span>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {toTimestamp(label.start)}
      </span>
      <span className="font-medium">{headline}</span>
      {label.initiatorWon !== null && (
        <span
          className={cn(
            "font-mono text-xs",
            label.initiatorWon ? "text-primary" : "text-muted-foreground"
          )}
        >
          {label.initiatorWon ? t("won") : t("lost")}
        </span>
      )}
      {lostOpener && (
        <span className="text-muted-foreground text-xs italic">
          {t("lostOpener")}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {label.evidence.usedUlt && (
          <span className="text-muted-foreground text-xs">{t("evidenceUlt")}</span>
        )}
        {!label.evidence.fallback && label.evidence.players.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {t("evidencePlayers", { count: label.evidence.players.length })}
          </span>
        )}
        <ConfidenceDot
          confidence={{
            level: label.confidence,
            label: t(CONFIDENCE_LABEL_KEY[label.confidence]),
            // ConfidenceMetadata requires these fields; ConfidenceDot does not render them
            sampleSize: 0,
            minimumRequired: 0,
          }}
        />
      </span>
    </li>
  );
}
