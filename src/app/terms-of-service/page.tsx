import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function TermsPage() {
  const t = await getTranslations("termsPage");

  return (
    <div className="bg-white px-6 py-32 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-200">
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
      </div>
    </div>
  );
}
