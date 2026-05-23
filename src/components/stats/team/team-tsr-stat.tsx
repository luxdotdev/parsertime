"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type {
  TeamTsrConfidence,
  TeamTsrMember,
  TeamTsrResult,
  TeamTsrSource,
} from "@/lib/tsr/team";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

function displayName(member: TeamTsrMember): string {
  const handle = member.battletag ?? member.name;
  return handle.split("#")[0] || handle;
}

function formatPlaytime(
  seconds: number,
  formatter: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations>
): string {
  if (seconds <= 0) return "—";
  const hours = seconds / 3600;
  if (hours >= 1)
    return t("playtimeHours", {
      hours: formatter.number(hours, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }),
    });
  const minutes = Math.round(seconds / 60);
  return t("playtimeMinutes", { minutes });
}

type Props = {
  result: TeamTsrResult;
};

export function TeamTsrStat({ result }: Props) {
  const t = useTranslations("teamTsr");
  const formatter = useFormatter();
  const noData = result.value === null;
  const ratingLabel =
    result.source === "csr_fallback" ? t("ratingShort") : t("tsrShort");

  return (
    <HoverCard openDelay={150} closeDelay={75}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted/40 -mx-2 flex flex-col rounded-sm px-2 py-0.5 text-left transition-colors"
        >
          <span className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
            {ratingLabel}
          </span>
          <span
            className={cn(
              "text-lg font-medium tabular-nums",
              noData ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {noData ? "—" : formatter.number(result.value!)}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {getSourceLabel(result.source, t)} ·{" "}
                {getConfidenceLabel(result.confidence, t)}
              </p>
              <p className="text-base font-semibold">{t("title")}</p>
            </div>
            <span className="text-foreground font-mono text-2xl font-semibold tabular-nums">
              {noData ? "—" : formatter.number(result.value!)}
            </span>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {getSourceCopy(result.source, t)}
          </p>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.16em] uppercase">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("rated")}</dt>
              <dd className="tabular-nums">
                {result.ratedCount}/{result.rosterSize}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("backed")}</dt>
              <dd className="tabular-nums">
                {formatter.number(result.playtimeBackedShare, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })}
              </dd>
            </div>
            {result.offsetStdev !== null ? (
              <div className="col-span-2 flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("offsetSigma")}</dt>
                <dd className="tabular-nums">
                  {formatter.number(Math.round(result.offsetStdev))}
                </dd>
              </div>
            ) : null}
          </dl>

          {result.members.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t("empty")}</p>
          ) : (
            <ul className="divide-border divide-y border-t border-[var(--border)]">
              {result.members.slice(0, 6).map((m) => (
                <li
                  key={m.userId}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-1.5 text-xs",
                    m.playtimeSeconds <= 0 && "opacity-60"
                  )}
                >
                  <span className="truncate font-medium">{displayName(m)}</span>
                  <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                    {formatPlaytime(m.playtimeSeconds, formatter, t)}
                  </span>
                  <span className="font-mono tabular-nums">
                    {m.contribution === null ? (
                      <span className="text-muted-foreground">
                        {getContributionLabel(m.contributionType, t)}
                      </span>
                    ) : (
                      <>
                        {formatter.number(m.contribution)}
                        <span className="text-muted-foreground ml-1.5 text-[9px] tracking-[0.16em] uppercase">
                          {getContributionLabel(m.contributionType, t)}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function getSourceLabel(
  source: TeamTsrSource,
  t: ReturnType<typeof useTranslations>
) {
  switch (source) {
    case "tsr":
      return t("sources.tsr");
    case "predicted":
      return t("sources.predicted");
    case "csr_fallback":
      return t("sources.csrFallback");
  }
}

function getSourceCopy(
  source: TeamTsrSource,
  t: ReturnType<typeof useTranslations>
) {
  switch (source) {
    case "tsr":
      return t("sourceCopy.tsr");
    case "predicted":
      return t("sourceCopy.predicted");
    case "csr_fallback":
      return t("sourceCopy.csrFallback");
  }
}

function getConfidenceLabel(
  confidence: TeamTsrConfidence,
  t: ReturnType<typeof useTranslations>
) {
  switch (confidence) {
    case "high":
      return t("confidence.high");
    case "medium":
      return t("confidence.medium");
    case "low":
      return t("confidence.low");
  }
}

function getContributionLabel(
  contributionType: TeamTsrMember["contributionType"],
  t: ReturnType<typeof useTranslations>
) {
  switch (contributionType) {
    case "tsr":
      return t("contribution.tsr");
    case "predicted":
      return t("contribution.predictedShort");
    case "csr":
      return t("contribution.csr");
    case "none":
      return t("contribution.none");
  }
}
