import { MapCalibrationList } from "@/components/admin/map-calibration/map-calibration-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getStaticTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

// Static shell: the frame and default-locale heading prerender, and the
// flag/auth/DB work streams into ONE boundary whose fallback mirrors
// MapCalibrationList's pending layout.
export default function MapCalibrationPage() {
  const t = getStaticTranslations("mapCalibrationPage");

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Suspense fallback={<MapCalibrationListSkeleton />}>
          <MapCalibrationContent />
        </Suspense>
      </div>
    </div>
  );
}

async function MapCalibrationContent() {
  const enabled = await getFlag(dataLabeling);
  if (!enabled) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  if (!isAdminUser(user)) notFound();

  const calibrations = await prisma.mapCalibration.findMany({
    include: { anchors: true },
  });

  return <MapCalibrationList calibrations={calibrations} />;
}

// Mirrors MapCalibrationList's pending layout (search + type-filter row, map
// card grid) so the streamed content replaces this in place.
function MapCalibrationListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <div className="flex gap-1">
          {["a", "b", "c", "d", "e"].map((k) => (
            <Skeleton key={k} className="h-7 w-16 rounded-md" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map(
          (k) => (
            <div
              key={k}
              className="ring-foreground/10 bg-card rounded-xl py-6 shadow-xs ring-1"
            >
              <div className="space-y-2 px-6 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-20" />
              </div>
              <div className="mt-6 px-6">
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
