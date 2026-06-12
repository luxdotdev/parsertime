import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import { FaceitTier } from "@/generated/prisma/browser";
import { useFormatter, useTranslations } from "next-intl";

type Props = {
  fromRating: number;
  toRating: number;
};

export function SkillDeviation({ fromRating, toRating }: Props) {
  const t = useTranslations("matchmaker");
  const formatter = useFormatter();
  const delta = fromRating - toRating;
  const absDelta = Math.abs(delta);
  const fromBucket = getTierBucket(fromRating);
  const toBucket = getTierBucket(toRating);

  return (
    <section className="border-border bg-card rounded-xl border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("skill-deviation")}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">
            {t("bracket-comparison", {
              from: getBracketLabel(fromBucket.band, fromBucket.tier, t),
              to: getBracketLabel(toBucket.band, toBucket.tier, t),
            })}
          </h2>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold tabular-nums">
            {formatter.number(absDelta)}
          </div>
          <div className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            ΔTSR
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("your-team")}
          </p>
          <div className="mt-2">
            <TierLadder
              rating={fromRating}
              maxTierReached={fromBucket.tier}
              compact
            />
          </div>
        </div>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("their-team")}
          </p>
          <div className="mt-2">
            <TierLadder
              rating={toRating}
              maxTierReached={toBucket.tier}
              compact
            />
          </div>
        </div>
      </div>
    </section>
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
