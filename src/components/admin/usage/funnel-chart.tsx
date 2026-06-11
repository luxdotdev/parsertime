"use client";

import type { FunnelResult } from "@/lib/usage/queries";
import { useTranslations } from "next-intl";

export function FunnelChart({ funnel }: { funnel: FunnelResult }) {
  const t = useTranslations("settingsPage.admin.analytics.usage.funnels");
  const max = Math.max(1, ...funnel.steps.map((s) => s.users));
  return (
    <div className="space-y-3">
      {funnel.steps.map((step, i) => (
        <div key={step.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-mono">{step.name}</span>
            <span className="text-muted-foreground">
              {step.users} {t("users")}
              {i > 0 ? ` · ${Math.round(step.conversion * 100)}%` : ""}
            </span>
          </div>
          <div className="bg-muted h-3 w-full overflow-hidden rounded">
            <div
              className="bg-[var(--chart-1)] h-full rounded"
              style={{ width: `${(step.users / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
