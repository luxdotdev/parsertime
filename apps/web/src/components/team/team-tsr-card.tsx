import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  TeamTsrConfidence,
  TeamTsrMember,
  TeamTsrResult,
  TeamTsrSource,
} from "@/lib/tsr/team";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Route } from "next";
import { FaceitTier } from "@/generated/prisma/browser";
import { useFormatter, useTranslations } from "next-intl";

function ratingToneClass(rating: number, source: TeamTsrSource): string {
  if (source === "csr_fallback") return "text-foreground";
  if (rating >= 4000) return "text-violet-500";
  if (rating >= 3500) return "text-indigo-400";
  if (rating >= 3000) return "text-emerald-500";
  if (rating >= 2500) return "text-sky-400";
  if (rating >= 2000) return "text-amber-400";
  return "text-muted-foreground";
}

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
  teamId: number;
};

export function TeamTsrCard({ result, teamId }: Props) {
  const t = useTranslations("teamTsr");
  const formatter = useFormatter();
  const ratingLabel =
    result.source === "csr_fallback" ? t("teamCsr") : t("teamTsr");
  const noData = result.value === null;

  return (
    <Card>
      <CardHeader className="border-border border-b">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("meta", {
                ratingLabel,
                rated: result.ratedCount,
                rosterSize: result.rosterSize,
                playtimeShare: result.playtimeBackedShare,
              })}
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">
              {t("title")}
            </h3>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "font-mono text-3xl font-semibold tabular-nums",
                noData
                  ? "text-muted-foreground"
                  : ratingToneClass(result.value!, result.source)
              )}
            >
              {noData ? "—" : formatter.number(result.value!)}
            </div>
            <div className="text-muted-foreground mt-0.5 flex items-center justify-end gap-2 font-mono text-[10px] tracking-wider uppercase">
              <span>{getSourceLabel(result.source, t)}</span>
              <span aria-hidden>·</span>
              <span>{getConfidenceLabel(result.confidence, t)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground/60 normal-case">
                    ⓘ
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {getSourceCopy(result.source, t)}
                  {result.offsetStdev !== null
                    ? ` ${t("offsetSpread", {
                        value: Math.round(result.offsetStdev),
                      })}`
                    : ""}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!noData && result.source !== "csr_fallback" && (
          <ScrimBracket rating={result.value!} teamId={teamId} />
        )}
        {result.members.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="divide-border divide-y">
            {result.members.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScrimBracket({ rating, teamId }: { rating: number; teamId: number }) {
  const t = useTranslations("teamTsr");
  const bucket = getTierBucket(rating);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("scrimBracket")}
        </span>
        <div className="flex flex-wrap items-baseline gap-3">
          <Link
            href={`/matchmaker/${teamId}` as Route}
            className="text-primary font-mono text-[11px] tracking-[0.16em] uppercase hover:underline"
          >
            {t("findScrims")}
          </Link>
          <span className="font-mono text-sm font-semibold tracking-[0.08em] uppercase">
            {getBracketLabel(bucket.band, bucket.tier, t)}
          </span>
        </div>
      </div>
      <TierLadder rating={rating} maxTierReached={bucket.tier} compact />
    </div>
  );
}

function MemberRow({ member }: { member: TeamTsrMember }) {
  const t = useTranslations("teamTsr");
  const formatter = useFormatter();
  const noPlaytime = member.playtimeSeconds <= 0;
  const noContribution = member.contribution === null;
  const weightPct = member.playtimeWeight;
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5rem_4rem] items-center gap-4 py-2 text-sm",
        noPlaytime && "opacity-60"
      )}
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{displayName(member)}</div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
          {member.tsr !== null ? (
            <span>{t("playerTsr", { rating: member.tsr })}</span>
          ) : (
            <span>{t("noTsr")}</span>
          )}
          {member.compositeCsr !== null ? (
            <span>{t("playerCsr", { rating: member.compositeCsr })}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary/70 h-full"
            style={{ width: `${Math.round(weightPct * 100)}%` }}
          />
        </div>
        <span className="text-muted-foreground w-14 text-right font-mono text-[10px] tabular-nums">
          {noPlaytime
            ? "—"
            : t("playtimeSummary", {
                percent: weightPct,
                playtime: formatPlaytime(member.playtimeSeconds, formatter, t),
              })}
        </span>
      </div>
      <div
        className={cn(
          "text-right font-mono text-base tabular-nums",
          noContribution && "text-muted-foreground"
        )}
      >
        {noContribution ? "—" : formatter.number(member.contribution!)}
      </div>
      <div className="text-muted-foreground text-right font-mono text-[10px] tracking-wider uppercase">
        {getContributionLabel(member.contributionType, t)}
      </div>
    </li>
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
      return t("contribution.predicted");
    case "csr":
      return t("contribution.csr");
    case "none":
      return t("contribution.none");
  }
}

function getBracketLabel(
  band: string | null,
  tier: FaceitTier,
  t: ReturnType<typeof useTranslations>
) {
  const tierLabel = getTierLabel(tier, t);
  if (!band) return tierLabel;
  return t("bracketWithBand", {
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
