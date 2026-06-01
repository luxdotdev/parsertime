"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Verdict = "GOOD" | "NEUTRAL" | "BLACKLISTED" | "DISMISSED";

export function ScrimFeedbackBanner({
  scrimId,
  opponentName,
}: {
  scrimId: number;
  opponentName: string;
}) {
  const t = useTranslations("teamOps.feedback");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  function send(verdict: Verdict) {
    startTransition(async () => {
      const res = await fetch("/api/team-ops/scrim-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrimId,
          verdict,
          reason: verdict === "BLACKLISTED" ? reason.trim() || null : null,
        }),
      });
      if (!res.ok) {
        toast.error(t("error"));
        return;
      }
      router.refresh();
    });
  }

  function handlePoorClick() {
    if (!showReason) {
      setShowReason(true);
    } else {
      send("BLACKLISTED");
    }
  }

  return (
    <div className="bg-muted/40 border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">
          {t("prompt", { name: opponentName })}
        </p>
        <button
          type="button"
          onClick={() => send("DISMISSED")}
          disabled={pending}
          aria-label={t("skip")}
          className="text-muted-foreground hover:text-foreground shrink-0 -mt-0.5 h-6 w-6 inline-flex items-center justify-center rounded transition-colors disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ✕
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => send("GOOD")}
        >
          {t("good")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => send("NEUTRAL")}
        >
          {t("okay")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={handlePoorClick}
          className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          {showReason ? t("confirmBlacklist") : t("poor")}
        </Button>
      </div>

      {showReason && (
        <div className="flex items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            disabled={pending}
            className="h-8 text-sm max-w-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePoorClick();
            }}
          />
        </div>
      )}
    </div>
  );
}
