"use client";

import { track } from "@vercel/analytics";
import type { Route } from "next";
import Link from "next/link";

type TrackedLinkProps = {
  href: string;
  event: string;
  properties: Record<string, string>;
  className?: string;
  target?: string;
  children: React.ReactNode;
};

export function TrackedLink({
  href,
  event,
  properties,
  className,
  target,
  children,
}: TrackedLinkProps) {
  return (
    <Link
      href={href as Route}
      className={className}
      target={target}
      onClick={() => track(event, properties)}
    >
      {children}
    </Link>
  );
}
