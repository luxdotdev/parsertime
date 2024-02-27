"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

export default function ClosedBetaBanner() {
  return (
    <div
      id="closed-beta-banner"
      className="z-[99] pointer-events-none fixed inset-x-0 bottom-0 sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8"
    >
      <div className="pointer-events-auto border border-zinc-700 flex items-center justify-between gap-x-6 bg-black px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
        <p className="text-sm leading-6 text-white">
          <Link href="https://discord.gg/svz3qhVDXM">
            <strong className="font-semibold">Closed Beta</strong>
            <svg
              viewBox="0 0 2 2"
              className="mx-2 inline h-0.5 w-0.5 fill-current"
              aria-hidden="true"
            >
              <circle cx={1} cy={1} r={1} />
            </svg>
            We&apos;re currently in a closed beta. Updates will be posted in our
            Discord. Click here to join.
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            const banner = document.getElementById("closed-beta-banner");
            if (banner) {
              banner.remove();
            }
          }}
          className="-m-1.5 flex-none p-1.5"
        >
          <span className="sr-only">Dismiss</span>
          <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
