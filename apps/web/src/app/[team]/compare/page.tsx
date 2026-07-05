import { ComparisonContent } from "@/components/compare/comparison-content";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@/generated/prisma/browser";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("comparePage.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

// Static shell: the DashboardLayout chrome prerenders and the auth-gated
// comparison content streams into ONE boundary whose fallback mirrors
// ComparisonContent's own layout, so navigation shows a single stable
// skeleton instead of a cascade of different loading states.
export default function ComparePage(
  props: PagePropsWithLocale<"/[team]/compare">
) {
  return (
    <DashboardLayout>
      <Suspense fallback={<CompareSkeleton />}>
        <CompareContent params={props.params} />
      </Suspense>
    </DashboardLayout>
  );
}

async function CompareContent({
  params,
}: {
  params: PagePropsWithLocale<"/[team]/compare">["params"];
}) {
  const { team, locale } = await params;
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

  // Extract team ID from team slug
  const teamId = parseInt(team);
  if (isNaN(teamId)) {
    notFound();
  }

  // Verify user has access to this team
  const dbTeam = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      users: true,
    },
  });

  if (
    user.role !== $Enums.UserRole.ADMIN &&
    (!dbTeam || !dbTeam.users.some((teamUser) => teamUser.id === user.id))
  ) {
    notFound();
  }

  return <ComparisonContent teamId={teamId} locale={locale} />;
}

const FOUR = ["a", "b", "c", "d"];
const SIX = ["a", "b", "c", "d", "e", "f"];

// Mirrors ComparisonContent's pending layout (heading, map-selection-mode
// card, comparison-mode card + filters, view tabs with stat grid + chart) so
// the streamed content replaces this in place with no jump.
function CompareSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-5 w-80 max-w-full" />
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-60 max-w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-1">
          {SIX.map((k) => (
            <Skeleton key={k} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <div className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {FOUR.map((k) => (
              <div key={k} className="rounded-xl border p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
