import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function InsufficientScrimsPlaceholder({
  scrimCount,
}: {
  scrimCount: number;
}) {
  const t = await getTranslations(
    "teamStatsPage.insufficientScrimsPlaceholder"
  );

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BarChart3 />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>
          {t("description", { count: scrimCount })}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/dashboard">{t("uploadScrim")}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
