import { CoachingCanvas } from "@/components/coaching/coaching-canvas";
import { coachingCanvas } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function CoachingCanvasPage() {
  const enabled = await coachingCanvas();
  if (!enabled) notFound();

  const t = await getTranslations("coaching");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-4 px-4 pt-4 sm:px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex-1 p-4 sm:px-8">
        <CoachingCanvas />
      </div>
    </div>
  );
}
