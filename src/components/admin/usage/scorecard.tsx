import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Scorecard } from "@/lib/usage/queries";
import { getTranslations } from "next-intl/server";

export async function UsageScorecard({ data }: { data: Scorecard }) {
  const t = await getTranslations(
    "settingsPage.admin.analytics.usage.scorecard"
  );
  const items = [
    { label: t("dau"), value: data.dau.toLocaleString() },
    { label: t("wau"), value: data.wau.toLocaleString() },
    { label: t("mau"), value: data.mau.toLocaleString() },
    { label: t("stickiness"), value: `${Math.round(data.stickiness * 100)}%` },
    { label: t("events30d"), value: data.events30d.toLocaleString() },
    { label: t("activeFeatures"), value: data.activeFeatures.toLocaleString() },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
