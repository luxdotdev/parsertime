/* oxlint-disable react/no-array-index-key */
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOverwatchPatches } from "@/data/overwatch/patches-service";
import { RankedService } from "@/data/ranked";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import { Effect } from "effect";
import { Crosshair, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("ranked.metadata");
  return { title: t("title"), description: t("description") };
}

// Static shell: the page frame and header prerender (default-locale title via
// the cookie-free translator), and the auth-derived content streams into ONE
// boundary whose fallback mirrors the dashboard's own pending layout.
export default function RankedPage() {
  const t = getStaticTranslations("ranked");

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
      <Suspense fallback={<RankedDashboardSkeleton />}>
        <RankedContent />
      </Suspense>
    </div>
  );
}

async function RankedContent() {
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

  if (matches.length === 0) {
    return (
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
    );
  }

  return (
    <div className="mt-6">
      <DashboardContent matches={matches} patches={patches} />
    </div>
  );
}

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

const TAB_KEYS = [
  "overview",
  "heroes",
  "maps",
  "time",
  "patches",
  "groups",
  "roles",
];

// Mirrors DashboardContent's pending layout (controls row, 4-cell stat
// ribbon, tab bar, overview sections) so the streamed content replaces this
// in place with no jump.
function RankedDashboardSkeleton() {
  const t = getStaticTranslations("ranked.tabs");

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="border-border h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {TAB_KEYS.map((key) => (
            <TabsTrigger key={key} value={key} className={tabTriggerClass}>
              {t(key)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <SkeletonSection bodyHeight={350} />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonSection bodyHeight={250} />
            <SkeletonSection bodyHeight={250} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonSection({ bodyHeight }: { bodyHeight: number }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <Skeleton className="w-full" style={{ height: bodyHeight }} />
    </section>
  );
}
