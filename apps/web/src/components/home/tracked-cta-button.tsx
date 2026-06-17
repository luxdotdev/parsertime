"use client";

import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import type { Route } from "next";
import Link from "next/link";

type TrackedCtaButtonProps = {
  href: string;
  location: string;
  variant: string;
  children: React.ReactNode;
};

export function TrackedCtaButton({
  href,
  location,
  variant,
  children,
}: TrackedCtaButtonProps) {
  return (
    <Button onClick={() => track("cta-click", { location, variant })} asChild>
      <Link href={href as Route}>{children}</Link>
    </Button>
  );
}
