"use client";

import { BalanceModal } from "@/components/chat/balance-modal";
import { Button } from "@/components/ui/button";
import { useCreditBalance } from "@/hooks/use-credits";
import { MIN_BALANCE_TO_CHAT_CENTS, formatCents } from "@/lib/chat-pricing";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CoinsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function BalanceChip() {
  const t = useTranslations("analyst.balanceChip");
  const [open, setOpen] = useState(false);
  const { data: balance, isLoading } = useCreditBalance();

  const blocked =
    balance !== undefined && balance.balanceCents < MIN_BALANCE_TO_CHAT_CENTS;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "gap-1.5 font-mono font-medium tabular-nums",
          blocked &&
            "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        )}
        aria-label={blocked ? t("addCreditsLabel") : t("balanceLabel")}
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
