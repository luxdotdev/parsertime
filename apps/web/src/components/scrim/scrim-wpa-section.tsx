import { ScrimWpaTable } from "@/components/scrim/scrim-wpa-table";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MatchStoryService } from "@/data/map/match-story-service";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import { LineChart } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function ScrimWpaSection({ scrimId }: { scrimId: number }) {
  const t = await getTranslations("scrimPage.wpa");
  const wpa = await AppRuntime.runPromise(
    MatchStoryService.pipe(
      Effect.flatMap((svc) => svc.getScrimWpa(scrimId)),
      Effect.catchAll(() => Effect.succeed(null))
    )
  );
  if (wpa === null || wpa.length === 0) return null;

  return (
    <AccordionItem value="wpa">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <LineChart
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
          {t("title")}
        </span>
      </AccordionTrigger>
      <AccordionContent className="h-auto">
        <p className="text-muted-foreground mb-3 text-sm">{t("description")}</p>
        <ScrimWpaTable wpa={wpa} />
      </AccordionContent>
    </AccordionItem>
  );
}
