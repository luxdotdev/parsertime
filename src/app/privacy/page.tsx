import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function PrivacyPage() {
  const t = useTranslations("privacyPage");
  return (
    <div className="bg-white px-6 py-32 dark:bg-black lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-200">
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-4xl">
          {t("privacyPolicy.title")}
        </h1>
        <p className="mt-6 text-xl leading-8">
          {t("privacyPolicy.description")}
        </p>
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
                  {t("collectInformation.email.title")}
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
                  {t("collectInformation.picture.title")}
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
                  {t("collectInformation.data.title")}
                </strong>{" "}
                {t("collectInformation.data.description")}c
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
            Link: (children) => (
              <Link href="mailto:privacy@lux.dev" className="text-blue-500">
                {children}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
