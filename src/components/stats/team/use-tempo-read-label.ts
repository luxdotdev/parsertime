import {
  classifyTempo,
  formatDelta,
  type TempoBaselineStat,
} from "@/lib/tempo/classify";
import { useTranslations } from "next-intl";

/**
 * Returns a formatter that turns a tempo value + global baseline into the
 * localized read line ("Slower than average (+2.3s vs avg)"), or null when
 * there is no trustworthy baseline (or no value). Callers decide how to render
 * the null case (em dash vs hidden line).
 */
export function useTempoReadLabel() {
  const tr = useTranslations("teamStatsPage.tempoRead");
  return (
    value: number | null,
    baseline: TempoBaselineStat | null | undefined
  ): string | null => {
    if (value === null) return null;
    const read = classifyTempo(value, baseline);
    if (read === null) return null;
    return `${tr(read.bucket)} ${tr("delta", {
      delta: formatDelta(read.deltaVsAvg),
    })}`;
  };
}
