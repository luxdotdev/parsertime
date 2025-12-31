"use client";

import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { TEAM_MEMBER_LIMIT } from "@/lib/usage";
import type { $Enums } from "@prisma/client";
import { useTranslations } from "next-intl";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

const chartConfig = {
  capacity: {
    label: "Capacity",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function TeamMemberUsage({
  teamMemberCount,
  billingPlan,
}: {
  teamMemberCount: number;
  billingPlan: $Enums.BillingPlan;
}) {
  const t = useTranslations("teamPage.teamMemberUsage");

  const data = [
    {
      name: t("teamMemberCount"),
      capacity: (teamMemberCount / TEAM_MEMBER_LIMIT[billingPlan]) * 100,
      current: teamMemberCount,
      allowed: TEAM_MEMBER_LIMIT[billingPlan],
      fill: "var(--chart-3)",
    },
  ];

  return (
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
  );
}
