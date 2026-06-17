"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useState } from "react";

type HoverPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

/**
 * A `<Link>` that prefetches on intent (hover/focus) instead of on viewport.
 * `prefetch` starts `false` (no prefetch) and flips to `true` on first
 * hover/focus. `true` (not the default `null`) forces a FULL prefetch including
 * data for dynamic routes; `null` would only warm the shell to the loading
 * boundary.
 */
export function HoverPrefetchLink({
  onMouseEnter,
  onFocus,
  ...props
}: HoverPrefetchLinkProps) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active}
      onMouseEnter={(e) => {
        setActive(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
    />
  );
}
