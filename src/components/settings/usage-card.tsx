"use client";

import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import {
  SCRIM_CREATION_LIMIT,
  TEAM_CREATION_LIMIT,
  TEAM_MEMBER_LIMIT,
} from "@/lib/usage";
import type { $Enums } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

const chartConfig = {
  capacity: {
    label: "Capacity",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function UsageCard({
  manageSubscriptionUrl,
  billingPlan,
  teamCount,
  scrimCount,
  teamMemberCount,
}: {
  manageSubscriptionUrl: Route;
  billingPlan: $Enums.BillingPlan;
  teamCount: number;
  scrimCount: number;
  teamMemberCount: number;
}) {
  const t = useTranslations("settingsPage.billing");

  const data = [
    {
      name: t("teamCount"),
      capacity: (teamCount / TEAM_CREATION_LIMIT[billingPlan]) * 100,
      current: teamCount,
      allowed: TEAM_CREATION_LIMIT[billingPlan],
      fill: "var(--chart-1)",
    },
    {
      name: t("teamMemberCount"),
      capacity: (teamMemberCount / TEAM_MEMBER_LIMIT[billingPlan]) * 100,
      current: teamMemberCount,
      allowed: TEAM_MEMBER_LIMIT[billingPlan],
      fill: "var(--chart-3)",
    },
    {
      name: t("scrimCount"),
      capacity: (scrimCount / SCRIM_CREATION_LIMIT[billingPlan]) * 100,
      current: scrimCount,
      allowed: SCRIM_CREATION_LIMIT[billingPlan],
      fill: "var(--chart-2)",
    },
  ];

  return (
    <div className="flex w-full items-center justify-center p-10">
      <div className="w-full">
        <h2 className="text-foreground text-xl font-medium">Plan overview</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          {t.rich("planDescription", {
            plan: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
            billingPlan: t(`billingPlan.${billingPlan}`),
          })}{" "}
          <Link
            href={manageSubscriptionUrl}
            className="text-primary inline-flex items-center gap-1 hover:underline hover:underline-offset-4"
          >
            {t("viewOtherPlans")}
            <ExternalLink className="size-4" aria-hidden={true} />
          </Link>
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((item) => (
            <Card key={item.name} className="p-4">
              <CardContent className="flex items-center space-x-4 p-0">
                <div className="relative flex items-center justify-center">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[80px] w-[80px]"
                  >
                    <RadialBarChart
                      data={[item]}
                      innerRadius={30}
                      outerRadius={60}
                      barSize={6}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                        axisLine={false}
                      />
                      <RadialBar
                        dataKey="capacity"
                        background
                        cornerRadius={10}
                        fill="var(--primary)"
                        angleAxisId={0}
                      />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground text-base font-medium">
                      {item.capacity}%
                    </span>
                  </div>
                </div>
                <div>
                  <dt className="text-foreground text-sm font-medium">
                    {item.name}
                  </dt>
                  <dd className="text-muted-foreground text-sm">
                    {t("usage", {
                      current: item.current,
                      allowed: item.allowed,
                    })}
                  </dd>
                </div>
              </CardContent>
            </Card>
          ))}
        </dl>
      </div>
    </div>
  );
}
