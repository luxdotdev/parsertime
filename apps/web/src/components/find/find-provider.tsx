"use client";

import { recordVisit } from "@/lib/find/frecency";
import { frecencyKeyForPathname } from "@/lib/find/tracking";
import { usePathname } from "next/navigation";
import React, {
  createContext,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

/** How long the user must stay on a page for the visit to count as
 * intentional (pass-through hops never inform Find's suggestions). */
const INTENTIONAL_DWELL_MS = 30_000;

export const FindContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The header trigger's element, so the dialog can morph from its rect. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}>({
  open: false,
  setOpen: () => undefined,
  triggerRef: { current: null },
});

/**
 * Holds Find's open state, the global ⌘K binding, and the on-device
 * intentional-visit tracker that powers frecency ranking.
 */
export function FindProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const value = useMemo(() => ({ open, setOpen, triggerRef }), [open]);

  return (
    <FindContext value={value}>
      {children}
      {/* usePathname is request data; on dynamic routes it must resolve
          inside a Suspense boundary to keep the static shell request-free. */}
      <Suspense fallback={null}>
        <FindVisitTracker />
      </Suspense>
    </FindContext>
  );
}

/**
 * Records an intentional visit when the user settles on a page for 30s.
 * Everything stays in localStorage — frecency is on-device only.
 */
function FindVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const key = frecencyKeyForPathname(pathname);
    if (!key) return;

    const timer = setTimeout(() => recordVisit(key), INTENTIONAL_DWELL_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
