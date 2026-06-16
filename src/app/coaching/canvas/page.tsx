import { CoachingCanvas } from "@/components/coaching/coaching-canvas";
import { coachingCanvas } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function CoachingCanvasPage() {
  const enabled = await coachingCanvas();
  if (!enabled) notFound();

  const t = await getTranslations("coaching");

  return (
    <div className="flex flex-1 flex-col px-6 pt-6 sm:px-10">
      <header className="border-border border-b pb-4">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("subtitle")}</p>
      </header>
      <div className="flex-1 py-4">
        <CoachingCanvas />
      </div>
    </div>
  );
}
