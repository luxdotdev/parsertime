import { ImpersonateUserForm } from "@/components/admin/impersonate-user";
import { NoAuthCard } from "@/components/auth/no-auth";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AdminSettingsPage() {
  const t = await getTranslations("settingsPage.admin");

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
