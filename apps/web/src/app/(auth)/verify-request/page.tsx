import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export default function VerifyRequestPage() {
  return (
    <div className="flex h-[90vh] flex-col items-center justify-center space-y-6 p-6 text-center">
      <Suspense fallback={<VerifyRequestSkeleton />}>
        <VerifyRequestContent />
      </Suspense>
    </div>
  );
}

async function VerifyRequestContent() {
  const t = await getTranslations("verifyRequest");

  return (
    <>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>
      <Button className="mx-auto" asChild>
        <Link href="/">{t("back")}</Link>
      </Button>
    </>
  );
}

// Mirrors the loaded title/description/button lines so the streamed content
// replaces this in place.
function VerifyRequestSkeleton() {
  return (
    <>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-6 w-96 max-w-[600px]" />
      <Skeleton className="h-9 w-32 rounded-md" />
    </>
  );
}
