"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

export default function BetaBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  const url = window.location.href;
  if (!url.includes("beta.parsertime.app")) return null;

  return (
    <div>
      {!isDismissed && (
        <div className="flex items-center gap-x-6 bg-sky-600 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
          <p className="text-sm/6 text-white">
            <a href="https://parserti.me/discord">
              You are currently using a beta version of Parsertime. Click here
              to join our Discord and provide feedback.
            </a>
          </p>
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              className="-m-3 p-3 focus-visible:-outline-offset-4"
              onClick={() => {
                setIsDismissed(true);
              }}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon aria-hidden="true" className="size-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
