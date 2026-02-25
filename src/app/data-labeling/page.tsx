import { UnlabeledMatchList } from "@/components/data-labeling/unlabeled-match-list";
import { getUnlabeledMatches } from "@/data/data-labeling-dto";
import { dataLabeling } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function DataLabelingPage() {
  const enabled = await dataLabeling();
  if (!enabled) notFound();

  const t = await getTranslations("dataLabeling");
  const result = await getUnlabeledMatches(0, 20);

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <UnlabeledMatchList initialData={result} />
      </div>
    </div>
  );
}
