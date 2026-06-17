"use client";

import type { FeatureAdoptionRow } from "@/lib/usage/queries";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function FeatureAdoptionChart({ data }: { data: FeatureAdoptionRow[] }) {
  const t = useTranslations("settingsPage.admin.analytics.usage");
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid horizontal={false} strokeOpacity={0.2} />
        <XAxis
          type="number"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fillOpacity: 0.1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as FeatureAdoptionRow;
            return (
              <div className="bg-popover text-popover-foreground rounded-md border p-2 text-sm shadow-md">
                <div className="font-medium">{row.name}</div>
                <div>
                  {t("uniqueUsers")}: {row.uniqueUsers}
                </div>
                <div>
                  {t("totalEvents")}: {row.totalEvents}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="uniqueUsers" fill="var(--chart-1)" radius={4} />
      </BarChart>
    </ResponsiveContainer>
  );
}
