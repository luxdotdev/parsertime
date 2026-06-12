import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AvailabilityOverlapBar } from "./availability-overlap-bar";
import type { MatchmakerCandidate } from "@/lib/matchmaker/candidates";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { FaceitTier } from "@/generated/prisma/client";
import { useFormatter, useTranslations } from "next-intl";

type Props = {
  searcherTeamId: number;
  candidate: MatchmakerCandidate;
};

function deltaTone(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 100) return "text-emerald-500";
  if (abs <= 300) return "text-primary";
  return "text-muted-foreground";
}

export function CandidateRow({ searcherTeamId, candidate }: Props) {
  const t = useTranslations("matchmaker");
  const formatter = useFormatter();
  const href = `/matchmaker/${searcherTeamId}/vs/${candidate.teamId}` as Route;
  const sentAt = candidate.cooledUntil
    ? new Date(candidate.cooledUntil.getTime() - 24 * 3_600_000)
    : null;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between gap-6 px-5 py-4 transition-colors",
        "hover:bg-muted/40",
        candidate.cooldownActive && "opacity-70"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium tracking-tight">
            {candidate.teamName}
          </span>
          <Badge variant="outline" className="font-mono">
            {getBracketLabel(candidate.bracketBand, candidate.bracketTier, t)}
          </Badge>
          <Badge variant="outline" className="font-mono">
            {candidate.region}
          </Badge>
          {candidate.cooldownActive && sentAt && (
            <Badge variant="secondary" className="font-mono">
              {t("sent-relative", {
                when: formatRelativePast(sentAt, t),
              })}
            </Badge>
          )}
        </div>
        <AvailabilityOverlapBar hours={candidate.overlapHours} />
      </div>
      <div className="text-right">
        <div className="font-mono text-xl font-semibold tabular-nums">
          {formatter.number(candidate.rating)}
        </div>
        <div
          className={cn(
            "mt-0.5 font-mono text-xs font-medium tabular-nums",
            deltaTone(candidate.delta)
          )}
        >
          {formatDelta(candidate.delta, formatter, t)}
        </div>
      </div>
    </Link>
  );
}

function formatDelta(
  delta: number,
  formatter: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations>
) {
  const value = formatter.number(Math.abs(delta));
  if (delta > 0) return t("delta-positive", { value });
  if (delta < 0) return t("delta-negative", { value });
  return t("delta-zero");
}

function formatRelativePast(date: Date, t: ReturnType<typeof useTranslations>) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return t("relative.justNow");
  if (minutes < 60) return t("relative.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relative.hoursAgo", { count: hours });
  return t("relative.daysAgo", { count: Math.floor(hours / 24) });
}

function getBracketLabel(
  band: string | null,
  tier: FaceitTier,
  t: ReturnType<typeof useTranslations>
) {
  const tierLabel = getTierLabel(tier, t);
  if (!band) return tierLabel;
  return t("bracket-with-band", {
    band: getBandLabel(band, t),
    tier: tierLabel,
  });
}

function getTierLabel(tier: FaceitTier, t: ReturnType<typeof useTranslations>) {
  switch (tier) {
    case FaceitTier.UNCLASSIFIED:
      return t("tiers.unclassified");
    case FaceitTier.OPEN:
      return t("tiers.open");
    case FaceitTier.CAH:
      return t("tiers.cah");
    case FaceitTier.ADVANCED:
      return t("tiers.advanced");
    case FaceitTier.EXPERT:
      return t("tiers.expert");
    case FaceitTier.MASTERS:
      return t("tiers.masters");
    case FaceitTier.OWCS:
      return t("tiers.owcs");
  }
}

function getBandLabel(band: string, t: ReturnType<typeof useTranslations>) {
  switch (band) {
    case "Low":
      return t("bands.low");
    case "Mid":
      return t("bands.mid");
    case "High":
      return t("bands.high");
    default:
      return band;
  }
}
