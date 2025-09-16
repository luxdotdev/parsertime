import { DiscordLoginButton } from "@/components/settings/discord-login-button";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function LinkedAccountSettingsPage() {
  const t = await getTranslations("settingsPage.linkedAccounts");

  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect("/sign-up");
  }

  const accounts = await prisma.account.findMany({
    where: {
      userId: user.id,
    },
  });

  const discordAccount = accounts.find(
    (account) => account.provider === "discord"
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      {discordAccount ? <p>{t("discord.linked")}</p> : <DiscordLoginButton />}
    </div>
  );
}
