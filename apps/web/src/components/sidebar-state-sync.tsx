"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useEffect, useLayoutEffect, useRef } from "react";

// useLayoutEffect warns during SSR; the fallback never runs meaningful work on
// the server since the sync only reads document.cookie.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Restores the persisted sidebar open state after mount. The provider must
 * prerender with its default (expanded) state — reading the cookie
 * server-side would bind the whole static shell to the request — and the
 * shell remounts between route sections, so this re-applies the persisted
 * collapse before paint on client navigations (and right after hydration on
 * hard loads).
 */
export function SidebarStateSync() {
  const { setOpen } = useSidebar();
  const hasSynced = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    const match = /(?:^|;\s*)sidebar_state=(true|false)/.exec(document.cookie);
    if (match?.[1] === "false") setOpen(false);
  }, [setOpen]);

  return null;
}
