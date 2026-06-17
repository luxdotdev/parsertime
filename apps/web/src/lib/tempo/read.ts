import type { TempoMetricKey } from "@/lib/tempo/aggregate";
import type { TempoBaselineStat } from "@/lib/tempo/classify";
import prisma from "@/lib/prisma";

export type TempoBaselines = Partial<Record<TempoMetricKey, TempoBaselineStat>>;

/**
 * Read the cached global tempo baselines (≤ 3 rows). Returns a map keyed by
 * metric; metrics with no baseline row are simply absent, which downstream
 * classification treats as "no read".
 */
export async function getTempoBaselines(): Promise<TempoBaselines> {
  const rows = await prisma.tempoBaseline.findMany();
  const out: TempoBaselines = {};
  for (const row of rows) {
    out[row.metric as TempoMetricKey] = {
      mean: row.mean,
      stdDev: row.stdDev,
      sampleN: row.sampleN,
    };
  }
  return out;
}
