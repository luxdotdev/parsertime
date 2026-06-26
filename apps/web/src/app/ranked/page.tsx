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
import { getOverwatchPatches } from "@/data/overwatch/patches-service";
import { RankedService } from "@/data/ranked";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { Effect } from "effect";
import { Crosshair, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("ranked.metadata");
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

  const [matches, patches] = await Promise.all([
    AppRuntime.runPromise(
      RankedService.pipe(
        Effect.flatMap((svc) => svc.getMatchesForUser(user.id))
      )
    ),
    getOverwatchPatches(),
  ]);

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          Personal analytics
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
      </header>
      {matches.length === 0 ? (
        <div className="mt-8 space-y-6">
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
        <div className="mt-6">
          <DashboardContent matches={matches} patches={patches} />
        </div>
      )}
    </div>
  );
}
