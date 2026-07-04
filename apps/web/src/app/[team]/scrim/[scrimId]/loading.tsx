import { DashboardLayout } from "@/components/dashboard-layout";
import { DirectionalTransition } from "@/components/directional-transition";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaticTranslations } from "@/lib/metadata-i18n";

export default function ScrimLoading() {
  const t = getStaticTranslations("scrimPage");

  return (
    <DirectionalTransition>
      <DashboardLayout>
        <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
          <nav className="text-muted-foreground flex items-center gap-3 text-sm">
            <Link href="/dashboard" transitionTypes={["contract-map"]}>
              &larr; {t("back")}
            </Link>
          </nav>
          <Skeleton className="mt-3 h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />

          <Skeleton className="mt-8 h-32 w-full rounded-xl" />

          <Skeleton className="mt-6 h-16 w-full rounded-xl" />

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("maps.title")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  // oxlint-disable-next-line react/no-array-index-key -- Skeleton elements are not unique
                  key={index}
                  className="aspect-video rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </DirectionalTransition>
  );
}
