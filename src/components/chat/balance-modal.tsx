"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreditBalance } from "@/hooks/use-credits";
import {
  CHAT_MODEL_PRICING,
  TOPUP_MIN_CENTS,
  TOPUP_PRESETS_CENTS,
  formatCents,
} from "@/lib/chat-pricing";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BalanceModal({ open, onOpenChange }: Props) {
  const t = useTranslations("credits");
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { data: balance } = useCreditBalance({ enabled: open });

  const [customAmount, setCustomAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [autoRefillSaving, setAutoRefillSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitTopup(amountCents: number) {
    if (amountCents < TOPUP_MIN_CENTS) {
      setErrorMessage(
        t("minimumTopup", { amount: formatCents(TOPUP_MIN_CENTS) })
      );
      return;
    }
    setErrorMessage(null);
    setTopupLoading(true);
    try {
      const res = await fetch("/api/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErrorMessage(data.error ?? t("checkoutError"));
        return;
      }
      window.location.href = data.url;
    } finally {
      setTopupLoading(false);
    }
  }

  async function updateAutoRefill(patch: {
    enabled?: boolean;
    thresholdCents?: number;
    amountCents?: number;
  }) {
    setAutoRefillSaving(true);
    try {
      const res = await fetch("/api/credits/auto-refill", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErrorMessage(data.error ?? t("autoRefillUpdateError"));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["credits", "balance"] });
    } finally {
      setAutoRefillSaving(false);
    }
  }

  const effectiveInputPerM = Math.round(
    CHAT_MODEL_PRICING.inputPerMillionCents *
      (1 + CHAT_MODEL_PRICING.markupBps / 10_000)
  );
  const effectiveOutputPerM = Math.round(
    CHAT_MODEL_PRICING.outputPerMillionCents *
      (1 + CHAT_MODEL_PRICING.markupBps / 10_000)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { minimum: formatCents(TOPUP_MIN_CENTS) })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-sm">
            {t("currentBalance")}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {balance ? formatCents(balance.balanceCents) : "—"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("addCredits")}</p>
          <div className="grid grid-cols-4 gap-2">
            {TOPUP_PRESETS_CENTS.map((cents) => (
              <Button
                key={cents}
                variant="outline"
                size="sm"
                disabled={topupLoading}
                onClick={() => submitTopup(cents)}
              >
                {formatCents(cents)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="custom-amount" className="text-xs">
              {t("custom")}
            </Label>
            <Input
              id="custom-amount"
              type="number"
              min={5}
              step={1}
              placeholder="25"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="h-8 w-24"
            />
            <Button
              size="sm"
              disabled={topupLoading || !customAmount}
              onClick={() => {
                const parsed = Number(customAmount);
                if (!Number.isFinite(parsed)) {
                  setErrorMessage(t("invalidDollarAmount"));
                  return;
                }
                void submitTopup(Math.round(parsed * 100));
              }}
            >
              {t("topUp")}
            </Button>
          </div>
          {errorMessage && (
            <p className="text-destructive text-xs">{errorMessage}</p>
          )}
        </div>

        <div className="border-border space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="auto-refill-toggle" className="text-sm">
                {t("autoRefill")}
              </Label>
              <p className="text-muted-foreground text-xs">
                {t("autoRefillDescription")}
              </p>
            </div>
            <Switch
              id="auto-refill-toggle"
              checked={balance?.autoRefillEnabled ?? false}
              disabled={autoRefillSaving || !balance?.hasPaymentMethod}
              onCheckedChange={(checked) =>
                updateAutoRefill({ enabled: checked })
              }
            />
          </div>
          {!balance?.hasPaymentMethod && (
            <p className="text-muted-foreground text-xs">
              {t("savePaymentMethodHint")}
            </p>
          )}
          {balance?.hasPaymentMethod && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="auto-refill-threshold">
                  {t("refillWhenBelow")}
                </Label>
                <Input
                  id="auto-refill-threshold"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={(
                    balance.autoRefillThresholdCents / 100
                  ).toFixed(0)}
                  onBlur={(e) =>
                    updateAutoRefill({
                      thresholdCents: Math.round(Number(e.target.value) * 100),
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="auto-refill-amount">
                  {t("refillAmount")}
                </Label>
                <Input
                  id="auto-refill-amount"
                  type="number"
                  min={5}
                  step={1}
                  defaultValue={(balance.autoRefillAmountCents / 100).toFixed(
                    0
                  )}
                  onBlur={(e) =>
                    updateAutoRefill({
                      amountCents: Math.round(Number(e.target.value) * 100),
                    })
                  }
                  className="h-8"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-border space-y-1 rounded-md border p-3 text-xs">
          <p className="font-medium">{t("pricing")}</p>
          <p className="text-muted-foreground">
            {t("pricingDescription", {
              input: formatCents(effectiveInputPerM),
              output: formatCents(effectiveOutputPerM),
              fee: formatter.number(CHAT_MODEL_PRICING.markupBps / 10_000, {
                style: "percent",
                maximumFractionDigits: 0,
              }),
            })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
