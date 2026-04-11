import { DiscordLoginButton } from "@/components/settings/discord-login-button";
import { NotificationConfig } from "@/components/settings/notification-config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
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

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

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

  const teams = await prisma.team.findMany({
    where: { users: { some: { id: user.id } } },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 lg:max-w-2xl">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>{t("discord.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {discordAccount ? (
            <p>{t("discord.linked")}</p>
          ) : (
            <DiscordLoginButton />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("bot.title")}</CardTitle>
          <CardDescription>{t("bot.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a
              href="https://discord.com/oauth2/authorize?client_id=1172094422440214529"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("bot.invite")}
            </a>
          </Button>
        </CardContent>
      </Card>
      <NotificationConfig teams={teams} />
    </div>
  );
}
