"use client";

import { useQuery } from "@tanstack/react-query";

export type CreditBalance = {
  balanceCents: number;
  autoRefillEnabled: boolean;
  autoRefillThresholdCents: number;
  autoRefillAmountCents: number;
  hasPaymentMethod: boolean;
};

async function fetchBalance(): Promise<CreditBalance> {
  const res = await fetch("/api/credits/balance", { cache: "no-store" });
  if (!res.ok) throw new Error(`balance fetch failed: ${res.status}`);
  return (await res.json()) as CreditBalance;
}

export function useCreditBalance(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["credits", "balance"],
    queryFn: fetchBalance,
    enabled: options?.enabled ?? true,
    staleTime: 5_000,
  });
}
