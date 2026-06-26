// src/components/map/fight-initiation-inspector.tsx
"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { ConfidenceDot } from "@/components/scouting/confidence-indicator";
import { Switch } from "@/components/ui/switch";
import { cn, toTimestamp } from "@/lib/utils";
import type {
  FightInitiationLabel,
  InitiationConfidence,
  MapInitiationResult,
  RoundBoundaryMarker,
} from "@/lib/fight-initiation";
import { useTranslations } from "next-intl";

const CONFIDENCE_LABEL_KEY: Record<InitiationConfidence, string> = {
  high: "confidenceHigh",
  medium: "confidenceMedium",
  low: "confidenceLow",
};

type TimelineItem =
  | { kind: "fight"; time: number; label: FightInitiationLabel }
  | { kind: "round"; time: number; marker: RoundBoundaryMarker };

export function FightInitiationInspector({
  result,
}: {
  result: MapInitiationResult;
}) {
  const t = useTranslations("mapPage.fightInitiation");
  const [showRounds, setShowRounds] = useState(true);

  if (!result.available || !result.summary) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("unavailable")}</p>
      </section>
    );
  }

  const { summary, labels, rounds } = result;
  const [teamA, teamB] = summary.teams;

  const cells = [teamA, teamB].map((team) => ({
    label: t("summaryWinrate", { team }),
    value: `${summary.byTeam[team].initiationWinrate.toFixed(0)}%`,
    sub: `${t("summaryFrequency", { team })}: ${summary.byTeam[team].initiations}`,
    emphasis: true,
  }));

  const timeline: TimelineItem[] = [
    ...labels.map(
      (label): TimelineItem => ({ kind: "fight", time: label.start, label })
    ),
    ...(showRounds
      ? rounds.map(
          (marker): TimelineItem => ({
            kind: "round",
            time: marker.match_time,
            marker,
          })
        )
      : []),
  ].sort((a, b) => a.time - b.time);

  const toggleId = "fight-initiation-rounds-toggle";

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
        rightSlot={
          <label
            htmlFor={toggleId}
            className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs select-none"
          >
            {t("toggleRounds")}
            <Switch
              id={toggleId}
              checked={showRounds}
              onCheckedChange={setShowRounds}
            />
          </label>
        }
      />
      <StatRibbon cells={cells} columns={4} />
      <ul className="divide-y divide-[var(--border)] border-y">
        {timeline.map((item) =>
          item.kind === "fight" ? (
            <FightRow key={`f-${item.label.fightIndex}`} label={item.label} />
          ) : (
            <li
              key={`r-${item.marker.kind}-${item.marker.match_time}`}
              className="flex items-center gap-2 px-1 py-2 text-xs"
            >
              <span className="text-muted-foreground/60" aria-hidden="true">
                —
              </span>
              <span className="text-muted-foreground">
                {item.marker.kind === "first"
                  ? t("roundStarted", { round: item.marker.round_number })
                  : item.marker.kind === "last"
                    ? t("roundEnded", { round: item.marker.round_number })
                    : t("roundChange", {
                        previous:
                          item.marker.previous_round ??
                          item.marker.round_number,
                        round: item.marker.round_number,
                      })}
              </span>
              <span className="text-muted-foreground/70 ml-auto font-mono tabular-nums">
                {toTimestamp(item.marker.match_time)}
              </span>
            </li>
          )
        )}
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
      : t("undetermined");

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
        {label.responseGap != null && (
          <span className="text-muted-foreground text-xs">
            {t("responseGap", { seconds: label.responseGap.toFixed(1) })}
          </span>
        )}
        {label.evidence.usedUlt && (
          <span className="text-muted-foreground text-xs">
            {t("evidenceUlt")}
          </span>
        )}
        {label.evidence.abilityCommit && (
          <span className="text-muted-foreground text-xs">
            {t("evidenceAbility")}
          </span>
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
