import { ImpersonateUserForm } from "@/components/admin/impersonate-user";
import { NoAuthCard } from "@/components/auth/no-auth";
import { Separator } from "@/components/ui/separator";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { $Enums } from "@/generated/prisma/browser";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SettingsAdminImpersonateUserSkeleton } from "./loading-skeleton";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<SettingsAdminImpersonateUserSkeleton />}>
      <AdminSettingsPageContent />
    </Suspense>
  );
}

async function AdminSettingsPageContent() {
  const t = await getTranslations("settingsPage.admin.impersonateUser");

  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

  if (!user) {
    redirect("/sign-up");
  }

  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      <ImpersonateUserForm />
    </div>
  );
}
