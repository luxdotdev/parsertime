import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

// Static shell: the page frame prerenders and the locale-dependent legal text
// streams into ONE boundary whose fallback mirrors the document's section
// layout. The title stays in the content child because it must render in the
// request locale.
export default function TermsPage() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-200">
        <Suspense fallback={<TermsSkeleton />}>
          <TermsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function TermsContent() {
  const t = await getTranslations("termsPage");

  return (
    <>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-200">
        {t("termsOfService.title")}
      </h1>
      <p className="mt-6 text-xl leading-8">
        {t("termsOfService.description")}
      </p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("acceptance.title")}
      </h2>
      <p className="mt-6">{t("acceptance.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("openSource.title")}
      </h2>
      <p className="mt-6">{t("openSource.description")}</p>
      <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
        <li>{t("openSource.list1")}</li>
        <li>{t("openSource.list2")}</li>
        <li>{t("openSource.list3")}</li>
      </ul>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("useOfService.title")}
      </h2>
      <p className="mt-6">{t("useOfService.description")}</p>
      <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
        <li>{t("useOfService.list1")}</li>
        <li>{t("useOfService.list2")}</li>
        <li>{t("useOfService.list3")}</li>
        <li>{t("useOfService.list4")}</li>
      </ul>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("userAccounts.title")}
      </h2>
      <p className="mt-6">{t("userAccounts.description")}</p>
      <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
        <li>{t("userAccounts.list1")}</li>
        <li>{t("userAccounts.list2")}</li>
        <li>{t("userAccounts.list3")}</li>
      </ul>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("prohibitedUses.title")}
      </h2>
      <p className="mt-6">{t("prohibitedUses.description")}</p>
      <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
        <li>{t("prohibitedUses.list1")}</li>
        <li>{t("prohibitedUses.list2")}</li>
        <li>{t("prohibitedUses.list3")}</li>
        <li>{t("prohibitedUses.list4")}</li>
        <li>{t("prohibitedUses.list5")}</li>
        <li>{t("prohibitedUses.list6")}</li>
      </ul>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("abuseAndMisuse.title")}
      </h2>
      <p className="mt-6">{t("abuseAndMisuse.description")}</p>
      <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
        <li>{t("abuseAndMisuse.list1")}</li>
        <li>{t("abuseAndMisuse.list2")}</li>
        <li>{t("abuseAndMisuse.list3")}</li>
      </ul>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("disclaimers.title")}
      </h2>
      <p className="mt-6">{t("disclaimers.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("limitationOfLiability.title")}
      </h2>
      <p className="mt-6">{t("limitationOfLiability.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("termination.title")}
      </h2>
      <p className="mt-6">{t("termination.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("governingLaw.title")}
      </h2>
      <p className="mt-6">{t("governingLaw.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("changesToTerms.title")}
      </h2>
      <p className="mt-6">{t("changesToTerms.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("contactUs.title")}
      </h2>
      <p className="mt-6">
        {t.rich("contactUs.description", {
          link: (chunks) => (
            <Link href="mailto:legal@lux.dev" className="text-blue-500">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  );
}

// Mirrors the document's section layout (title, intro, then one heading +
// paragraph block per section with lists of 3/4/3/6/3 items) so the streamed
// content replaces this in place with no jump.
function TermsSkeleton() {
  return (
    <>
      <Skeleton className="mt-2 h-10 w-72 sm:w-96" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
      </div>

      <Skeleton className="mt-16 h-7 w-56" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <Skeleton className="mt-16 h-7 w-48" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-8 space-y-2 pl-8">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-4 w-3/4" />
        ))}
      </div>

      <Skeleton className="mt-16 h-7 w-52" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-8 space-y-2 pl-8">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-4 w-3/4" />
        ))}
      </div>

      <Skeleton className="mt-16 h-7 w-44" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="mt-8 space-y-2 pl-8">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-4 w-3/4" />
        ))}
      </div>

      <Skeleton className="mt-16 h-7 w-56" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-8 space-y-2 pl-8">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <Skeleton key={k} className="h-4 w-3/4" />
        ))}
      </div>

      <Skeleton className="mt-16 h-7 w-52" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="mt-8 space-y-2 pl-8">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-4 w-3/4" />
        ))}
      </div>

      <Skeleton className="mt-16 h-7 w-40" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <Skeleton className="mt-16 h-7 w-64" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <Skeleton className="mt-16 h-7 w-36" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <Skeleton className="mt-16 h-7 w-44" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>

      <Skeleton className="mt-16 h-7 w-52" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <Skeleton className="mt-16 h-7 w-36" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </>
  );
}
