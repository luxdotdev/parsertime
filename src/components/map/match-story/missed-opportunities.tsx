"use client";

import { SectionHeader } from "@/components/section-header";
import type {
  FightUlt,
  MissedOpportunities as MissedData,
  MissedOpportunity,
  ReasonTag,
} from "@/lib/win-probability/timeline";
import { getHeroUltimate } from "@/types/heroes";
import { useTranslations } from "next-intl";

type Translate = ReturnType<typeof useTranslations<"mapPage.matchStory">>;

function reasonText(t: Translate, r: ReasonTag): string {
  switch (r.key) {
    case "primaryDriver":
      return t(`missed.reason.${r.group}`);
    case "earlyFirstDeath":
      return t("missed.reason.earlyFirstDeath", { player: r.player });
    case "stagger":
      return t("missed.reason.stagger", { cost: r.cost });
    case "ultDeficit":
      return t("missed.reason.ultDeficit", { cost: r.cost });
  }
}

function ultName(t: Translate, u: FightUlt): string {
  return (
    getHeroUltimate(u.hero) ?? t("missed.ult.heroFallback", { hero: u.hero })
  );
}

/**
 * Win-probability swing on a shared 0–100 scale. The dumbbell makes fights
 * directly comparable: how far right play started (favored) and how far it
 * fell, with the 50% reference marking the crossover into losing.
 */
function SwingRail({ before, after }: { before: number; after: number }) {
  const lo = Math.min(before, after);
  const span = Math.abs(before - after);
  return (
    <div className="relative h-3 w-full" aria-hidden="true">
      <div className="bg-muted absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full" />
      <div className="bg-border absolute top-1/2 left-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2" />
      <div
        className="bg-destructive/30 absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{ left: `${lo}%`, width: `${span}%` }}
      />
      <span
        className="border-muted-foreground bg-background absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ left: `${before}%` }}
      />
      <span
        className="bg-destructive absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${after}%` }}
      />
    </div>
  );
}

function UltLine({ t, u }: { t: Translate; u: FightUlt }) {
  const wasted = u.value === "none" || u.value === "died";
  const outcome =
    u.value === "value"
      ? t("missed.ult.value", { kills: u.kills })
      : t(`missed.ult.${u.value}`);
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span
        className={`size-1.5 shrink-0 translate-y-px rounded-full ${
          wasted
            ? "bg-destructive"
            : u.value === "unknown"
              ? "bg-muted-foreground/30"
              : "bg-muted-foreground/60"
        }`}
      />
      <span className="text-foreground min-w-0 flex-1 truncate">
        {ultName(t, u)}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          wasted ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {outcome}
      </span>
    </div>
  );
}

function Row({
  t,
  m,
  focusFight,
  onFocusFight,
}: {
  t: Translate;
  m: MissedOpportunity;
  focusFight: number | null;
  onFocusFight: (i: number) => void;
}) {
  const active = focusFight === m.fightIndex;
  const before = Math.round(m.wpBefore * 100);
  const after = Math.round(m.wpAfter * 100);
  const delta = before - after;
  const converted = m.ults.filter((u) => u.value === "value").length;

  return (
    <button
      type="button"
      onClick={() => onFocusFight(m.fightIndex)}
      className={`flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors duration-150 motion-reduce:transition-none sm:flex-row sm:items-center sm:gap-5 ${
        active ? "bg-primary/[0.07]" : "hover:bg-muted/40"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:w-[22rem] sm:shrink-0">
        <div className="flex items-baseline gap-2 text-sm">
          <span className={`font-medium ${active ? "text-primary" : ""}`}>
            {t("missed.fight", { fight: m.fightIndex + 1 })}
          </span>
          {m.zoneName !== null && (
            <span className="text-muted-foreground truncate">{m.zoneName}</span>
          )}
        </div>

        {m.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.reasons.map((r) => (
              <span
                key={
                  r.key === "primaryDriver" ? `primaryDriver-${r.group}` : r.key
                }
                className="bg-muted/70 text-foreground rounded px-1.5 py-0.5 text-xs"
              >
                {reasonText(t, r)}
              </span>
            ))}
          </div>
        )}

        {m.ults.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.08em] uppercase">
              {t("missed.ult.summary", { converted, total: m.ults.length })}
            </span>
            {m.ults.map((u) => (
              <UltLine key={`${u.hero}-${u.value}`} t={t} u={u} />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-destructive text-xl leading-none font-semibold tabular-nums">
              −{delta}
            </span>
            <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.08em] uppercase">
              {t("missed.wpLost")}
            </span>
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("missed.wp", { before, after })}
          </span>
        </div>
        <SwingRail before={before} after={after} />
      </div>
    </button>
  );
}

export function MissedOpportunities({
  data,
  focusFight,
  onFocusFight,
}: {
  data: MissedData;
  focusFight: number | null;
  onFocusFight: (i: number) => void;
}) {
  const t = useTranslations("mapPage.matchStory");
  if (data.total === 0) return null;
  return (
    <div>
      <SectionHeader id="missed-opportunities" title={t("missed.title")} />
      <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
        {data.items.map((m) => (
          <Row
            key={m.fightIndex}
            t={t}
            m={m}
            focusFight={focusFight}
            onFocusFight={onFocusFight}
          />
        ))}
        {data.total > data.items.length && (
          <div className="text-muted-foreground px-4 py-2 font-mono text-[0.625rem] tracking-[0.08em] uppercase">
            {t("missed.showing", {
              shown: data.items.length,
              total: data.total,
            })}
          </div>
        )}
      </div>
    </div>
  );
}
