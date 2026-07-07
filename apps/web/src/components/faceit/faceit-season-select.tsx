"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  seasons: number[];
  selected: number | null;
};

export function FaceitSeasonSelect({ seasons, selected }: Props) {
  const t = useTranslations("faceitScoutingPage.seasonFilter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onValueChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("season");
    } else {
      params.set("season", value);
    }
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  }

  return (
    <Select
      value={selected != null ? String(selected) : "all"}
      onValueChange={onValueChange}
    >
      <SelectTrigger className="w-40" aria-label={t("label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("all")}</SelectItem>
        {seasons.map((s) => (
          <SelectItem key={s} value={String(s)}>
            {t("season", { n: s })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
