"use client";

import { ClientOnly } from "@/lib/client-only";
import { toTitleCase } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ClientDate({ date }: { date: Date }) {
  const t = useTranslations("clientDate");
  return (
    <ClientOnly>
      {toTitleCase(
        t("formatDate", {
          date,
        })
      ).replace(/[,.]/g, "")}
    </ClientOnly>
  );
}
