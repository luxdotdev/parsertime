"use server";

import { getTsrBreakdown, type TsrBreakdown } from "@/lib/tsr/breakdown";

export async function loadTsrBreakdown(
  faceitPlayerId: string
): Promise<TsrBreakdown | null> {
  return getTsrBreakdown(faceitPlayerId);
}
