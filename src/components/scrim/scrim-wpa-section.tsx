import { SectionHeader } from "@/components/section-header";
import { MatchStoryService } from "@/data/map/match-story-service";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
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
    <section className="mt-10">
      <SectionHeader
        id="scrim-wpa"
        title={t("title")}
        description={t("description")}
      />
      <div className="border-border border">
        {wpa.map((p) => (
          <div
            key={`${p.team}-${p.player}`}
            className="border-border grid grid-cols-4 gap-2 border-b px-3 py-1.5 text-sm last:border-b-0"
          >
            <span>{p.player}</span>
            <span className="text-muted-foreground">{p.team}</span>
            <span className="text-muted-foreground text-xs">
              {t("maps", { count: p.maps })}
            </span>
            <span
              className={`text-right font-mono tabular-nums ${p.wpa >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {p.wpa >= 0 ? "+" : ""}
              {(p.wpa * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
