"use client";

import { VercelToolbar } from "@vercel/toolbar/next";
import { useEffect, useState } from "react";

/**
 * The Vercel Toolbar calls `Math.random()` while rendering, which is disallowed
 * during the Cache Components prerender pass. Mount it on the client only so it
 * never participates in server prerendering.
 */
export function ClientVercelToolbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <VercelToolbar /> : null;
}
