"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";

export default function DemoBanner() {
  return (
    <>
      <div
        id="demo-banner"
        className="pointer-events-none fixed inset-x-0 bottom-0 sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8"
      >
        <div className="pointer-events-auto border border-zinc-700 flex items-center justify-between gap-x-6 bg-black dark:bg-white px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
          <p className="text-sm leading-6 text-white dark:text-gray-900">
            <a href="/sign-up">
              <strong className="font-semibold">Parsertime</strong>
              <svg
                viewBox="0 0 2 2"
                className="mx-2 inline h-0.5 w-0.5 fill-current"
                aria-hidden="true"
              >
                <circle cx={1} cy={1} r={1} />
              </svg>
              You are viewing a demo of Parsertime. Click here to sign up &nbsp;
              <span aria-hidden="true">&rarr;</span>
            </a>
          </p>
          <button
            type="button"
            className="-m-1.5 flex-none p-1.5"
            onClick={() => {
              const banner = document.getElementById("demo-banner");
              if (banner) {
                banner.remove();
              }
            }}
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon
              className="h-5 w-5 text-white dark:text-gray-900"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </>
  );
}
