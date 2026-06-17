"use client";

import { ClientOnly } from "@/lib/client-only";

export function ClientDate({ date }: { date: Date }) {
  return <ClientOnly>{date.toDateString()}</ClientOnly>;
}
