"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const STORAGE_KEY = "parsertime.mobileBanner.dismissed";

export function MobileBanner() {
  const t = useTranslations("mapPage.mobileBanner");
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== "true") {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  function dismiss() {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore — localStorage may be unavailable
    }
  }

  if (isDismissed) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[99] sm:flex sm:justify-center sm:px-6 sm:pb-5 md:hidden lg:px-8"
    >
      <div className="bg-card text-card-foreground border-border ring-foreground/10 pointer-events-auto flex items-center justify-between gap-x-6 border px-6 py-2.5 shadow-xs ring-1 sm:rounded-xl sm:py-3 sm:pr-3.5 sm:pl-4">
        <p className="text-sm leading-6">{t("message")}</p>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground -m-1.5 flex-none p-1.5 transition-colors"
        >
          <span className="sr-only">{t("dismiss")}</span>
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
