import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

// Static shell: the page frame prerenders and the locale-aware policy text
// streams into ONE boundary whose fallback mirrors the loaded layout.
export default function PrivacyPage() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-200">
        <Suspense fallback={<PrivacyPolicySkeleton />}>
          <PrivacyContent />
        </Suspense>
      </div>
    </div>
  );
}

async function PrivacyContent() {
  const t = await getTranslations("privacyPage");

  return (
    <>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-200">
        {t("privacyPolicy.title")}
      </h1>
      <p className="mt-6 text-xl leading-8">{t("privacyPolicy.description")}</p>
      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("collectInformation.title")}
      </h2>
      <div className="mt-6 max-w-2xl">
        <p>{t("collectInformation.description")}</p>
        <ul className="mt-8 max-w-xl space-y-8 text-gray-600 dark:text-gray-300">
          <li className="flex gap-x-3">
            <CheckCircleIcon
              className="mt-1 h-5 w-5 flex-none text-sky-600"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-gray-900 dark:text-white">
                {t("collectInformation.email.title")}:
              </strong>{" "}
              {t("collectInformation.email.description")}
            </span>
          </li>
          <li className="flex gap-x-3">
            <CheckCircleIcon
              className="mt-1 h-5 w-5 flex-none text-sky-600"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-gray-900 dark:text-white">
                {t("collectInformation.picture.title")}:{" "}
              </strong>{" "}
              {t("collectInformation.picture.description")}
            </span>
          </li>
          <li className="flex gap-x-3">
            <CheckCircleIcon
              className="mt-1 h-5 w-5 flex-none text-sky-600"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-gray-900 dark:text-white">
                {t("collectInformation.data.title")}:{" "}
              </strong>{" "}
              {t("collectInformation.data.description")}
            </span>
          </li>
        </ul>
      </div>
      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("useInformation.title")}
      </h2>
      <p className="mt-6">{t("useInformation.description")}</p>
      <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
        <li>{t("useInformation.list1")}</li>
        <li>{t("useInformation.list2")}</li>
        <li>{t("useInformation.list3")}</li>
        <li>{t("useInformation.list4")}</li>
      </ul>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("storageSecurity.title")}
      </h2>
      <p className="mt-6">{t("storageSecurity.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("thirdPartyLinks.title")}
      </h2>
      <p className="mt-6">{t("thirdPartyLinks.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("changePrivacyPolicy.title")}
      </h2>
      <p className="mt-6">{t("changePrivacyPolicy.description")}</p>

      <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("contactUs.title")}
      </h2>
      <p className="mt-6">
        {t.rich("contactUs.description", {
          link: (chunks) => (
            <Link href="mailto:privacy@lux.dev" className="text-blue-500">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  );
}

// Mirrors the loaded content's layout (heading, intro, icon list, disc list,
// trailing sections) so the streamed text replaces it in place with no jump.
function PrivacyPolicySkeleton() {
  return (
    <>
      <Skeleton className="mt-2 h-9 w-64" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>

      <Skeleton className="mt-16 h-7 w-56" />
      <div className="mt-6 max-w-2xl space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <ul className="mt-8 max-w-xl space-y-8">
        {["a", "b", "c"].map((k) => (
          <li key={k} className="flex gap-x-3">
            <Skeleton className="mt-1 h-5 w-5 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </li>
        ))}
      </ul>

      <Skeleton className="mt-16 h-7 w-48" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <ul className="mt-8 max-w-xl space-y-2 pl-8">
        {["a", "b", "c", "d"].map((k) => (
          <li key={k}>
            <Skeleton className="h-4 w-full" />
          </li>
        ))}
      </ul>

      {["a", "b", "c", "d"].map((k) => (
        <div key={k}>
          <Skeleton className="mt-16 h-7 w-52" />
          <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </>
  );
}
