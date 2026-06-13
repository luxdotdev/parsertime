"use client";

import { MeterBar } from "@/components/faceit/viz";
import { SectionHeader } from "@/components/stats/team/section-header";
import { useTranslations } from "next-intl";

type InsightItem = {
  category: "hero" | "stat" | "map" | "combat";
  label: string;
  detail: string;
  value: number;
};

type HeroFrequency = {
  hero: string;
  mapCount: number;
};

type Props = {
  strengths: InsightItem[];
  weaknesses: InsightItem[];
  signatureHeroes: string[];
  heroFrequencies: HeroFrequency[];
};

const MAX_INSIGHTS = 4;
const MAX_OBSERVED = 8;

/**
 * Resolution-first scouting read for an OWCS player: the "what to know" hook
 * (ranked strengths vs. weaknesses) plus their hero pool (signature heroes from
 * Liquipedia and heroes observed in competition). Flat FACEIT design language —
 * signal travels via tone dots, mono chrome, and numbers alongside the bars.
 */
export function ScoutingPlayerRead({
  strengths,
  weaknesses,
  signatureHeroes,
  heroFrequencies,
}: Props) {
  const t = useTranslations(
    "scoutingPage.player.analytics.strengthsWeaknesses"
  );
  const tProfile = useTranslations("scoutingPage.player.profile");

  const topStrengths = strengths.slice(0, MAX_INSIGHTS);
  const topWeaknesses = weaknesses.slice(0, MAX_INSIGHTS);

  const observed = [...heroFrequencies]
    .sort((a, b) => b.mapCount - a.mapCount)
    .slice(0, MAX_OBSERVED);
  const maxMapCount = observed.reduce(
    (max, h) => (h.mapCount > max ? h.mapCount : max),
    0
  );

  return (
    <section className="space-y-8">
      <SectionHeader eyebrow={t("eyebrow")} title={t("readTitle")} />

      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        <InsightGroup
          label={t("strengths")}
          items={topStrengths}
          tone="primary"
          emptyLabel={t("noStrengths")}
        />
        <InsightGroup
          label={t("weaknesses")}
          items={topWeaknesses}
          tone="destructive"
          emptyLabel={t("noWeaknesses")}
        />
      </div>

      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {tProfile("signatureHeroes")}
            </span>
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {tProfile("knownFor")}
            </span>
          </div>
          {signatureHeroes.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {signatureHeroes.map((hero) => (
                <li
                  key={hero}
                  className="border-border rounded-sm border px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {hero}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              {tProfile("noHeroData")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {tProfile("observedInCompetition")}
          </span>
          {observed.length > 0 ? (
            <ul className="space-y-2.5">
              {observed.map((hero) => (
                <li key={hero.hero} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground text-sm leading-tight font-medium">
                      {hero.hero}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase tabular-nums">
                      {tProfile("heroMaps", { count: hero.mapCount })}
                    </span>
                  </div>
                  <MeterBar
                    value={hero.mapCount}
                    max={maxMapCount}
                    tone="primary"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              {tProfile("noHeroData")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function InsightGroup({
  label,
  items,
  tone,
  emptyLabel,
}: {
  label: string;
  items: InsightItem[];
  tone: "primary" | "destructive";
  emptyLabel: string;
}) {
  const dot = tone === "primary" ? "bg-primary" : "bg-destructive";
  return (
    <div className="space-y-3">
      <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
        {label}
      </span>
      {items.length > 0 ? (
        <ul className="border-border divide-border divide-y border-y">
          {items.map((item) => (
            <li key={`${item.category}-${item.label}`} className="flex gap-3 py-3">
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-foreground leading-snug font-medium text-pretty">
                  {item.label}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      )}
    </div>
  );
}
