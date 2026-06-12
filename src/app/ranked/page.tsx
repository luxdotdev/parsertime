import { DashboardContent } from "@/components/ranked/dashboard-content";
import { ImportCard } from "@/components/ranked/import-card";
import { MatchForm } from "@/components/ranked/match-form";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RankedService } from "@/data/ranked";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { Crosshair, Plus } from "lucide-react";
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
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
      {matches.length === 0 ? (
        <div className="space-y-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Crosshair />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <MatchForm
                trigger={
                  <Button className="active:scale-[0.97]">
                    <Plus className="mr-1.5 size-4" />
                    {t("trackFirst")}
                  </Button>
                }
              />
            </EmptyContent>
          </Empty>
          <div className="mx-auto w-full max-w-md">
            <ImportCard />
          </div>
        </div>
      ) : (
        <DashboardContent matches={matches} />
      )}
    </div>
  );
}
