import { AuditLog } from "@/components/admin/audit-log";
import { StatsCards } from "@/components/admin/stats-cards";
import { UserSearch } from "@/components/admin/user-search";
import { NoAuthCard } from "@/components/auth/no-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);
  if (!user) {
    redirect("/sign-up");
  }
  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  const t = await getTranslations("settingsPage.admin.dashboard");

  return (
    <div className="max-w-full space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <StatsCards />

      <Tabs defaultValue="user-search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="user-search">
            {t("user-search.title")}
          </TabsTrigger>
          <TabsTrigger value="audit-log">{t("audit-log.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="user-search" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("user-search.title")}</CardTitle>
              <CardDescription>{t("user-search.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSearch />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit-log" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("audit-log.title")}</CardTitle>
              <CardDescription>{t("audit-log.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLog />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
