"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

export default function MobileBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  return (
    <div>
      {!isDismissed && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[99] sm:flex sm:justify-center sm:px-6 sm:pb-5 md:hidden lg:px-8">
          <div className="pointer-events-auto flex items-center justify-between gap-x-6 border border-zinc-700 bg-black px-6 py-2.5 dark:bg-white sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
            <p className="text-sm leading-6 text-white dark:text-gray-900">
              For the best experience, we recommend using a larger screen.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
              }}
              className="-m-1.5 flex-none p-1.5"
            >
              <span className="sr-only">Dismiss</span>
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
