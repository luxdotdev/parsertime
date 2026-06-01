import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { FaceitTier, TsrRegion } from "@prisma/client";
import { useTranslations } from "next-intl";
import type { TierBand } from "@/lib/tsr/tier-bucket";

export type HubTeam = {
  id: number;
  name: string;
  hasSnapshot: boolean;
  bracketLabel: string | null;
  bracketBand: TierBand | null;
  region: TsrRegion | null;
  rating: number | null;
  bracketTier: FaceitTier | null;
};

type Props = {
  teams: HubTeam[];
};

export function MatchmakerHub({ teams }: Props) {
  const t = useTranslations("matchmaker.hub");

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
          {t("description")}
        </p>
      </header>

      <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("mechanicsEyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {t("mechanicsTitle")}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {t("mechanicsDescription")}
          </p>
        </div>

        <div className="space-y-6">
          <BulletGroup
            label={t("ranking.label")}
            items={[
              t("ranking.sameRegion"),
              t("ranking.closestDistance"),
              t("ranking.sameBracket"),
              t("ranking.availabilityBonus"),
              t("ranking.cooldownPenalty"),
            ]}
          />
          <BulletGroup
            label={t("sent.label")}
            items={[t("sent.message"), t("sent.roster"), t("sent.delivery")]}
          />
          <BulletGroup
            label={t("rateLimits.label")}
            items={[t("rateLimits.perPair"), t("rateLimits.daily")]}
          />
        </div>
      </section>

      <section className="border-border border-t pt-10 sm:pt-12">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("teamPickerEyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t("teamPickerTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {t("teamPickerDescription")}
            </p>
          </div>

          <div>
            {teams.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
                {teams.map((t) => (
                  <TeamRow key={t.id} team={t} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TeamRow({ team }: { team: HubTeam }) {
  const t = useTranslations("matchmaker.hub");
  const eligible = team.hasSnapshot;
  const href = `/matchmaker/${team.id}` as Route;
  const bracketLabel =
    team.bracketTier !== null
      ? getBracketLabel(team.bracketBand, team.bracketTier, t)
      : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium tracking-tight">
            {team.name}
          </span>
          {bracketLabel ? (
            <Badge variant="outline" className="font-mono">
              {bracketLabel}
            </Badge>
          ) : null}
          {team.region ? (
            <Badge variant="outline" className="font-mono">
              {team.region}
            </Badge>
          ) : null}
        </div>
        {team.rating !== null ? (
          <div className="text-muted-foreground mt-1 font-mono text-[11px] tracking-[0.08em] uppercase tabular-nums">
            {t("teamTsr", { rating: team.rating })}
          </div>
        ) : (
          <div className="text-muted-foreground mt-1 font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("noTeamTsr")}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {eligible ? (
          <Button asChild size="sm" className="h-9 rounded-md px-3 text-sm">
            <Link href={href}>
              {t("searchAs", { teamName: team.name })}
              <ArrowRightIcon className="ml-1.5 size-3.5" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-9 rounded-md px-3 text-sm"
            title={t("ineligibleTitle")}
          >
            {t("notEligible")}
          </Button>
        )}
        <Link
          href={`/${team.id}/ops` as Route}
          className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase hover:underline"
        >
          {t("manageBlacklist")}
        </Link>
      </div>
    </li>
  );
}

function EmptyState() {
  const t = useTranslations("matchmaker.hub");

  return (
    <div className="border-border bg-card rounded-xl border p-8 text-center">
      <h3 className="text-base font-semibold tracking-tight">
        {t("emptyTitle")}
      </h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        {t("emptyDescription")}
      </p>
      <Link
        href={"/team" as Route}
        className="text-primary mt-5 inline-block font-mono text-[11px] tracking-[0.16em] uppercase hover:underline"
      >
        {t("manageTeams")}
      </Link>
    </div>
  );
}

function getBracketLabel(
  band: TierBand | null,
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
    case "UNCLASSIFIED":
      return t("tiers.unclassified");
    case "OPEN":
      return t("tiers.open");
    case "CAH":
      return t("tiers.cah");
    case "ADVANCED":
      return t("tiers.advanced");
    case "EXPERT":
      return t("tiers.expert");
    case "MASTERS":
      return t("tiers.masters");
    case "OWCS":
      return t("tiers.owcs");
  }
}

function getBandLabel(band: TierBand, t: ReturnType<typeof useTranslations>) {
  switch (band) {
    case "Low":
      return t("bands.low");
    case "Mid":
      return t("bands.mid");
    case "High":
      return t("bands.high");
  }
}

function BulletGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-foreground text-sm leading-relaxed">
            <span
              aria-hidden
              className="text-muted-foreground/70 mr-2 font-mono text-xs"
            >
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
