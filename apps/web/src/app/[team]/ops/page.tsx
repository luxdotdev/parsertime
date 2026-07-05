import { BlacklistManager } from "@/components/team-ops/blacklist-manager";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { canManageTeam } from "@/lib/auth";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import {
  listBlacklist,
  getBlacklistSuggestions,
} from "@/lib/team-ops/blacklist";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("teamOps");

  return {
    title: t("title"),
  };
}

// Static shell: the page frame and headings prerender (default-locale text via
// the cookie-free translator), and the auth/blacklist content streams into ONE
// boundary whose fallback mirrors BlacklistManager's own pending layout.
export default function TeamOpsPage(props: PagePropsWithLocale<"/[team]/ops">) {
  const t = getStaticTranslations("teamOps");

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("blacklist.subtitle")}
            </p>
          </div>
        </div>

        {/* Blacklist section — additional sections slot in below */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("blacklist.heading")}</h2>
          <Suspense fallback={<BlacklistSkeleton />}>
            <TeamOpsContent params={props.params} />
          </Suspense>
        </section>
      </div>
    </DashboardLayout>
  );
}

async function TeamOpsContent({
  params,
}: {
  params: PagePropsWithLocale<"/[team]/ops">["params"];
}) {
  const { team } = await params;
  const session = await auth();

  if (!session?.user?.email) {
    notFound();
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) {
    notFound();
  }

  const teamId = parseInt(team);
  if (isNaN(teamId)) {
    notFound();
  }

  if (!(await canManageTeam(teamId, user))) {
    notFound();
  }

  const [rows, suggestions] = await Promise.all([
    listBlacklist(teamId),
    getBlacklistSuggestions(teamId),
  ]);

  return (
    <BlacklistManager teamId={teamId} rows={rows} suggestions={suggestions} />
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

// Mirrors BlacklistManager's pending layout (search/add field, bordered
// divided row list) so the streamed content replaces this in place.
function BlacklistSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="border-input divide-input divide-y overflow-hidden rounded-md border">
        {SKELETON_ROWS.map((k) => (
          <div key={k} className="flex items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-6 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
