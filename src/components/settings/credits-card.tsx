"use client";

import { BalanceModal } from "@/components/chat/balance-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreditBalance } from "@/hooks/use-credits";
import { formatCents } from "@/lib/chat-pricing";
import type { CreditTransactionType } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type Transaction = {
  id: number;
  type: CreditTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  createdAt: string;
};

async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch("/api/credits/transactions?limit=10", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`transactions fetch failed: ${res.status}`);
  const data = (await res.json()) as { transactions: Transaction[] };
  return data.transactions;
}

export function CreditsCard() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: balance } = useCreditBalance();
  const { data: transactions } = useQuery({
    queryKey: ["credits", "transactions"],
    queryFn: fetchTransactions,
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>AI chat credits</CardTitle>
            <CardDescription>
              Pay-as-you-go balance for the AI analyst.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Manage
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-sm">Balance</span>
            <span className="text-2xl font-semibold tabular-nums">
              {balance ? formatCents(Math.max(0, balance.balanceCents)) : "—"}
            </span>
            {balance?.autoRefillEnabled && (
              <span className="text-muted-foreground text-xs">
                · Auto-refill {formatCents(balance.autoRefillAmountCents)} at{" "}
                {formatCents(balance.autoRefillThresholdCents)}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Recent activity</p>
            {transactions && transactions.length > 0 ? (
              <ul className="text-sm">
                {transactions.map((t) => (
                  <li
                    key={t.id}
                    className="border-border/60 flex items-center justify-between border-b py-1.5 last:border-b-0"
                  >
                    <span className="text-muted-foreground truncate pr-2">
                      {t.description}
                    </span>
                    <span
                      className={
                        t.amountCents > 0
                          ? "text-emerald-600 tabular-nums dark:text-emerald-400"
                          : "tabular-nums"
                      }
                    >
                      {t.amountCents > 0 ? "+" : ""}
                      {formatCents(t.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                No transactions yet. Top up from the AI chat page or click
                Manage.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <BalanceModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
