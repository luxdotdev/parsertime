"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export default function DemoBanner() {
  const t = useTranslations("demoPage.banner");
  const [isDismissed, setIsDismissed] = useState(false);

  return (
    <div>
      {!isDismissed && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[99] sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8">
          <div className="pointer-events-auto flex items-center justify-between gap-x-6 border border-zinc-700 bg-black px-6 py-2.5 dark:bg-white sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
            <p className="text-sm leading-6 text-white dark:text-gray-900">
              <Link href="/sign-up">
                <strong className="font-semibold">Parsertime</strong>
                <svg
                  viewBox="0 0 2 2"
                  className="mx-2 inline h-0.5 w-0.5 fill-current"
                  aria-hidden="true"
                >
                  <circle cx={1} cy={1} r={1} />
                </svg>
                {t("demo")}
                &nbsp;
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </p>
            <button
              type="button"
              className="-m-1.5 flex-none p-1.5"
              onClick={() => {
                setIsDismissed(true);
              }}
            >
              <span className="sr-only">{t("dismiss")}</span>
              <XMarkIcon
                className="h-5 w-5 text-white dark:text-gray-900"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
