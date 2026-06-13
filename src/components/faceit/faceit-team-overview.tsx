"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { MeterBar, SegmentStrip } from "@/components/faceit/viz";
import type {
  AttackDefenseSplit,
  FaceitTeamOverview as Overview,
} from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  overview: Overview;
  attackDefense: AttackDefenseSplit;
};

const TIER_TONE: Record<string, "primary" | "destructive" | "muted"> = {
  OWCS: "primary",
  MASTERS: "primary",
  EXPERT: "muted",
  ADVANCED: "muted",
  OPEN: "destructive",
};

/** Canonical low-to-high ordering so the distribution strip reads as a ramp. */
const TIER_RANK: Record<string, number> = {
  OPEN: 0,
  ADVANCED: 1,
  EXPERT: 2,
  MASTERS: 3,
  OWCS: 4,
};

export function FaceitTeamOverview({ overview, attackDefense }: Props) {
  const t = useTranslations("faceitScoutingPage");

  const form = stableFormKeys(overview.recentForm);
  const tierSegments = Object.entries(overview.tierCounts)
    .filter(([, count]) => count > 0)
    .sort(
      ([a], [b]) => (TIER_RANK[a] ?? 99) - (TIER_RANK[b] ?? 99) || a.localeCompare(b)
    )
    .map(([tier, count]) => ({
      key: tier,
      value: count,
      title: `${tier}: ${count}`,
      tone: TIER_TONE[tier] ?? "muted",
    }));

  const ad = attackDefense;
  const hasAd = ad.attackPlayed > 0 || ad.defensePlayed > 0;

  return (
    <section className="space-y-5">
      <SectionHeader eyebrow={t("overview.eyebrow")} title={t("overview.title")} />
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("overview.form")}
          </p>
          {form.length > 0 ? (
            <>
              <div
                className="flex flex-wrap gap-1.5"
                role="list"
                aria-label={t("overview.form")}
              >
                {form.map(({ key, result }) => (
                  <span
                    key={key}
                    role="listitem"
                    className={cn(
                      "flex size-7 items-center justify-center rounded-sm font-mono text-xs font-semibold",
                      result === "win"
                        ? "bg-primary/15 text-primary"
                        : "bg-destructive/15 text-destructive"
                    )}
                  >
                    {result === "win" ? t("overview.win") : t("overview.loss")}
                  </span>
                ))}
              </div>
              <div className="border-border flex items-center gap-1 rounded-md border px-3 py-2.5">
                {form.map(({ key, result }) => (
                  <span
                    key={`bar-${key}`}
                    className={cn(
                      "h-2 flex-1 rounded-sm",
                      result === "win" ? "bg-primary/70" : "bg-destructive/70"
                    )}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("overview.noForm")}</p>
          )}
        </div>

        <div className="space-y-4 lg:col-span-5">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("maps.attackDefense")}
          </p>
          {hasAd ? (
            <div className="space-y-3.5">
              <AdRow
                label={t("maps.attacking")}
                winRate={ad.attackWinRate}
                won={ad.attackWon}
                played={ad.attackPlayed}
                ofLabel={t("maps.mapsWon", {
                  won: ad.attackWon,
                  played: ad.attackPlayed,
                })}
              />
              <AdRow
                label={t("maps.defending")}
                winRate={ad.defenseWinRate}
                won={ad.defenseWon}
                played={ad.defensePlayed}
                ofLabel={t("maps.mapsWon", {
                  won: ad.defenseWon,
                  played: ad.defensePlayed,
                })}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("maps.empty")}</p>
          )}
        </div>
      </div>

      {tierSegments.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("overview.tierDistribution")}
          </p>
          <SegmentStrip segments={tierSegments} />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {tierSegments.map((seg) => (
              <span
                key={seg.key}
                className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase tabular-nums"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    seg.tone === "primary"
                      ? "bg-primary"
                      : seg.tone === "destructive"
                        ? "bg-destructive"
                        : "bg-muted-foreground/50"
                  )}
                />
                {seg.key} {seg.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdRow({
  label,
  winRate,
  ofLabel,
}: {
  label: string;
  winRate: number;
  won: number;
  played: number;
  ofLabel: string;
}) {
  const above = Math.round(winRate) >= 50;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span
          className={cn(
            "font-mono font-semibold tabular-nums",
            above ? "text-primary" : "text-destructive"
          )}
        >
          {Math.round(winRate)}%
        </span>
      </div>
      <MeterBar
        value={winRate}
        max={100}
        referenceAt={0.5}
        tone={above ? "primary" : "destructive"}
      />
      <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
        {ofLabel}
      </p>
    </div>
  );
}

function stableFormKeys(form: ("win" | "loss")[]) {
  const counts = new Map<string, number>();
  return form.map((result) => {
    const n = (counts.get(result) ?? 0) + 1;
    counts.set(result, n);
    return { key: `${result}-${n}`, result };
  });
}
