"use client";

import { BalanceModal } from "@/components/chat/balance-modal";
import { Button } from "@/components/ui/button";
import { useCreditBalance } from "@/hooks/use-credits";
import { formatCents } from "@/lib/chat-pricing";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CoinsIcon } from "lucide-react";
import { useState } from "react";

export function BalanceChip() {
  const [open, setOpen] = useState(false);
  const { data: balance, isLoading } = useCreditBalance();

  const blocked = balance !== undefined && balance.balanceCents <= 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "gap-1.5 font-medium tabular-nums",
          blocked &&
            "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
        )}
        aria-label={blocked ? "Add credits to continue" : "AI chat balance"}
      >
        {blocked ? (
          <AlertTriangleIcon className="size-3.5" aria-hidden />
        ) : (
          <CoinsIcon className="size-3.5" aria-hidden />
        )}
        {isLoading
          ? "—"
          : balance
            ? formatCents(Math.max(0, balance.balanceCents))
            : "—"}
      </Button>
      <BalanceModal open={open} onOpenChange={setOpen} />
    </>
  );
}
