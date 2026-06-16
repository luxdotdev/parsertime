"use client";

import { track } from "@/lib/usage/client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Fires a page_view on every committed route change (including client-side
 * navigations the server never sees). Renders nothing.
 */
export function UsageBeacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    track("page_view", { path: pathname });
    // searchParams included so query-only changes also register a view.
  }, [pathname, searchParams]);

  return null;
}
