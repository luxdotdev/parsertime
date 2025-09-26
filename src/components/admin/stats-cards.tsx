import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ImageIcon, ShieldAlert, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

// Mock data for scaffolding
const data = {
  totalUsers: {
    value: 12345,
    delta: 180,
  },
  lowTrustUsers: {
    value: 243,
    delta: 12,
  },
  pendingReports: {
    value: 57,
    delta: -3,
  },
  imagesPendingReview: {
    value: 29,
    delta: 5,
  },
};

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : delta;
}

export async function StatsCards() {
  const t = await getTranslations("settingsPage.admin.dashboard.stats-cards");

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total-users.title")}
          </CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalUsers.value}</div>
          <p className="text-muted-foreground text-xs">
            {t("total-users.delta", {
              delta: formatDelta(data.totalUsers.delta),
            })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("low-trust-users.title")}
          </CardTitle>
          <ShieldAlert className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.lowTrustUsers.value}</div>
          <p className="text-muted-foreground text-xs">
            {t("low-trust-users.delta", {
              delta: formatDelta(data.lowTrustUsers.delta),
            })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("pending-reports.title")}
          </CardTitle>
          <AlertTriangle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pendingReports.value}</div>
          <p className="text-muted-foreground text-xs">
            {t("pending-reports.delta", {
              delta: formatDelta(data.pendingReports.delta),
            })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("images-pending-review.title")}
          </CardTitle>
          <ImageIcon className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.imagesPendingReview.value}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("images-pending-review.delta", {
              delta: formatDelta(data.imagesPendingReview.delta),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
