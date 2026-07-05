import { DirectionalTransition } from "@/components/directional-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { getStaticTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ReportsList } from "./reports-list";

// Static shell: the auth-derived report list streams into ONE boundary whose
// fallback mirrors ReportsList's own layout, so navigation shows a single,
// stable loading state that the content replaces in place.
export default function ReportsPage() {
  return (
    <DirectionalTransition>
      <Suspense fallback={<ReportsListSkeleton />}>
        <ReportsContent />
      </Suspense>
    </DirectionalTransition>
  );
}

async function ReportsContent() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) redirect("/sign-in");

  const reports = await prisma.chatReport.findMany({
    where: { userId: userData.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  // Request-time (post-auth), so Date.now() is safe here; serializing it as a
  // prop keeps SSR and hydration on the same clock for relative timestamps.
  return <ReportsList reports={reports} now={Date.now()} />;
}

// Mirrors ReportsList's frame (header, search row, report rows) so the
// streamed content replaces this in place with no jump.
function ReportsListSkeleton() {
  const t = getStaticTranslations("reportsPage.list");

  return (
    <div className="flex-1 space-y-6 px-6 pt-6 pb-12 md:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 max-w-sm flex-1" />
        <Skeleton className="h-3.5 w-20" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="divide-border divide-y">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <div key={k} className="flex items-start gap-4 px-4 py-3.5">
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="my-0.5 h-4 w-48" />
                <Skeleton className="my-0.5 h-3 w-full max-w-xs" />
              </div>
              <Skeleton className="mt-1 h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
