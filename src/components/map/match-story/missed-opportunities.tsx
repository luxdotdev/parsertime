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

function ultText(t: Translate, u: FightUlt): string {
  const name =
    getHeroUltimate(u.hero) ??
    t("missed.ult.heroFallback", { hero: u.hero });
  return t(`missed.ult.${u.value}`, { ult: name, kills: u.kills });
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
  return (
    <button
      type="button"
      onClick={() => onFocusFight(m.fightIndex)}
      className={`flex w-full flex-col gap-1 border-l-2 px-3 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none ${
        active
          ? "border-amber-500 bg-muted/50"
          : "border-transparent hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {t("missed.fight", { fight: m.fightIndex + 1 })}
        </span>
        {m.zoneName !== null && (
          <span className="text-muted-foreground">· {m.zoneName}</span>
        )}
        <span className="ml-auto tabular-nums text-muted-foreground">
          {t("missed.wp", {
            before: Math.round(m.wpBefore * 100),
            after: Math.round(m.wpAfter * 100),
          })}
        </span>
      </div>
      {m.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {m.reasons.map((r) => (
            <span
              key={r.key === "primaryDriver" ? `primaryDriver-${r.group}` : r.key}
              className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400"
            >
              {reasonText(t, r)}
            </span>
          ))}
        </div>
      )}
      {m.ults.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {m.ults.map((u) => (
            <span
              key={`${u.hero}-${u.value}`}
              className={`text-xs ${
                u.value === "none" || u.value === "died"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {ultText(t, u)}
            </span>
          ))}
        </div>
      )}
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
      <div className="border-border overflow-hidden rounded-md border">
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
          <div className="px-3 py-1 text-xs text-muted-foreground">
            {t("missed.showing", { shown: data.items.length, total: data.total })}
          </div>
        )}
      </div>
    </div>
  );
}
