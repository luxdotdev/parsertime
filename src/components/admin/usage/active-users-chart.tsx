"use client";

import type { DailyActivePoint } from "@/lib/usage/queries";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ActiveUsersChart({ data }: { data: DailyActivePoint[] }) {
  const t = useTranslations("settingsPage.admin.analytics.usage");
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.2} />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickFormatter={(d: string) => d.slice(5)}
          minTickGap={24}
        />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="bg-popover text-popover-foreground rounded-md border p-2 text-sm shadow-md">
                <div className="font-medium">{label}</div>
                <div>{t("dau")}: {payload[0]?.value}</div>
              </div>
            ) : null
          }
        />
        <Line type="monotone" dataKey="dau" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
