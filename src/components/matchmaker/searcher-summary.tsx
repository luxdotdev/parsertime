import { getTierBucket } from "@/lib/tsr/tier-bucket";
import { Badge } from "@/components/ui/badge";
import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import type { SearcherSummary as Summary } from "@/lib/matchmaker/candidates";
import { FaceitTier } from "@/generated/prisma/browser";
import { useFormatter, useTranslations } from "next-intl";

type Props = { summary: Summary };

export function SearcherSummary({ summary }: Props) {
  const t = useTranslations("matchmaker");
  const formatter = useFormatter();
  const bucket = getTierBucket(summary.rating);
  return (
    <header className="border-border bg-card/40 rounded-xl border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.rich("searchingAs", {
              team: () => (
                <span className="text-foreground font-medium">
                  {summary.teamName}
                </span>
              ),
            })}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-semibold tabular-nums">
            {formatter.number(summary.rating)}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center justify-end gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            <Badge variant="outline" className="font-mono">
              {getBracketLabel(bucket.band, bucket.tier, t)}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {summary.region}
            </Badge>
            <span>
              {t("requests-remaining", { count: summary.requestsRemaining })}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <TierLadder
          rating={summary.rating}
          maxTierReached={bucket.tier}
          compact
        />
      </div>
    </header>
  );
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
