"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Inline disclosure for the OWCS team Strength Rating — an Elo-style score
 * centered at 1500, distinct from the FACEIT FSR skill rating. Rendered as a
 * click popover so it works on touch and from the keyboard. Mirrors
 * {@link FsrExplainer}.
 */
export function ScoutingStrengthExplainer() {
  const t = useTranslations("scoutingPage.team.strengthExplainer");

  const points = ["elo", "quality", "weighted", "provisional"] as const;

  return (
    <Popover>
      <PopoverTrigger
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label={t("trigger")}
      >
        <Info className="size-3" aria-hidden="true" />
        {t("trigger")}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <p className="text-sm font-semibold">{t("title")}</p>
        <p className="text-muted-foreground mt-1 text-xs">{t("intro")}</p>
        <ul className="mt-3 space-y-2.5">
          {points.map((key) => (
            <li key={key} className="flex gap-2.5">
              <span
                className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <span className="text-sm leading-snug">
                <span className="font-medium">{t(`${key}.label`)}</span>{" "}
                <span className="text-muted-foreground">
                  {t(`${key}.body`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
