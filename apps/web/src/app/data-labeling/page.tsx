import { UnlabeledMatchList } from "@/components/data-labeling/unlabeled-match-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export default function DataLabelingPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Suspense fallback={<DataLabelingSkeleton />}>
          <DataLabelingContent />
        </Suspense>
      </div>
    </div>
  );
}

async function DataLabelingContent() {
  const enabled = await getFlag(dataLabeling);
  if (!enabled) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminUser(user)) notFound();

  const t = await getTranslations("dataLabeling");

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <UnlabeledMatchList />
    </>
  );
}

// Mirrors the heading block plus UnlabeledMatchList's own query-loading state
// (Card with title row and eight table-row skeletons) so the streamed content
// replaces this in place.
function DataLabelingSkeleton() {
  return (
    <>
      <div className="space-y-1">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="ring-foreground/10 bg-card flex flex-col gap-6 rounded-xl py-6 shadow-xs ring-1">
        <div className="px-6">
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="space-y-3 px-6">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}
