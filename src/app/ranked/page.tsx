import { MatchForm } from "@/components/ranked/match-form";
import { DashboardContent } from "@/components/ranked/dashboard-content";
import { Button } from "@/components/ui/button";
import { RankedService } from "@/data/ranked";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/ranked">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "ranked.metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function RankedPage() {
  const [session, t] = await Promise.all([auth(), getTranslations("ranked")]);
  const email = session?.user?.email;
  if (!email) redirect("/sign-in");

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(email)))
  );
  if (!user) redirect("/sign-in");

  const matches = await AppRuntime.runPromise(
    RankedService.pipe(Effect.flatMap((svc) => svc.getMatchesForUser(user.id)))
  );

  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <MatchForm trigger={<Button>{t("addMatch")}</Button>} />
      </div>
      {matches.length === 0 ? (
        <p className="text-muted-foreground">{t("emptyDescription")}</p>
      ) : (
        <DashboardContent matches={matches} />
      )}
    </div>
  );
}
