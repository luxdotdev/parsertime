import { SectionHeader } from "@/components/stats/team/section-header";
import {
  StatRibbon,
  type RibbonCell,
} from "@/components/stats/team/stat-ribbon";
import { FightMapCanvas } from "@/components/team/fight-map-canvas";
import type {
  FightFieldResult,
  FightMapView,
} from "@/data/team/fight-field-service";
import { FIELD_MIN_TOTAL_FIGHTS } from "@/lib/fight-field";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

type FightMapContentProps = {
  views: FightFieldResult;
  calibrations: Record<string, LoadedCalibration | null>;
};

function CalloutChip({
  polarity,
  zoneName,
  won,
  lost,
  fallback,
}: {
  polarity: "strong" | "weak";
  zoneName: string | null;
  won: number;
  lost: number;
  fallback: string;
}) {
  const strong = polarity === "strong";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm px-2 py-1",
        strong ? "bg-green-500/10" : "bg-red-500/10"
      )}
    >
      <span className="text-foreground max-w-44 truncate text-xs font-medium">
        {zoneName ?? fallback}
      </span>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums",
          strong ? "text-green-400" : "text-red-400"
        )}
      >
        {won}–{lost}
      </span>
    </span>
  );
}

async function MapSection({
  view,
  calibration,
}: {
  view: FightMapView;
  calibration: LoadedCalibration | null;
}) {
  const t = await getTranslations("tendenciesPage.fightMap");
  const strong = view.namedCallouts.filter((c) => c.polarity === "strong");
  const weak = view.namedCallouts.filter((c) => c.polarity === "weak");
  const winrate = view.overallWinratePercent;

  return (
    <article className="space-y-3 py-8 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold tracking-tight">
          {view.mapName}
        </h3>
        <div className="flex items-baseline gap-4 font-mono text-xs tabular-nums">
          <span className="text-muted-foreground">
            {t("fights", { count: view.totalDecisiveFights })}
          </span>
          {winrate !== null && (
            <span
              className={cn(
                winrate >= 55
                  ? "text-green-400"
                  : winrate <= 45
                    ? "text-red-400"
                    : "text-foreground"
              )}
            >
              {Math.round(winrate)}%{" "}
              <span className="text-muted-foreground">{t("overall")}</span>
            </span>
          )}
        </div>
      </div>

      {(strong.length > 0 || weak.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {strong.map((c) => (
            <CalloutChip
              key={`s-${c.x.toFixed(1)}-${c.z.toFixed(1)}`}
              {...c}
              fallback={t("unnamedArea")}
            />
          ))}
          {weak.map((c) => (
            <CalloutChip
              key={`w-${c.x.toFixed(1)}-${c.z.toFixed(1)}`}
              {...c}
              fallback={t("unnamedArea")}
            />
          ))}
        </div>
      )}

      {view.field === null ? (
        <div className="border-border bg-muted/20 text-muted-foreground rounded-md border px-4 py-6 text-sm">
          {t("notEnoughFights", { count: FIELD_MIN_TOTAL_FIGHTS })}
        </div>
      ) : calibration === null ? (
        <div className="border-border bg-muted/20 text-muted-foreground rounded-md border px-4 py-6 text-sm">
          {t("noCalibration")}
        </div>
      ) : (
        <FightMapCanvas
          cells={view.field.cells}
          callouts={view.namedCallouts}
          calibration={calibration}
        />
      )}

      {view.zoneScorecard !== null && view.zoneScorecard.length > 0 && (
        <div className="border-border max-w-xl overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="px-4 py-2 text-left font-medium">{t("zone")}</th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("record")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("winrate")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {view.zoneScorecard.map((zone) => (
                <tr
                  key={zone.zoneName}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{zone.zoneName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <span className="text-green-400">{zone.won}W</span>{" "}
                    <span className="text-red-400">{zone.lost}L</span>
                    {zone.even > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        {zone.even}E
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      zone.winratePercent === null
                        ? "text-muted-foreground"
                        : zone.winratePercent >= 55
                          ? "text-green-400"
                          : zone.winratePercent <= 45
                            ? "text-red-400"
                            : ""
                    )}
                  >
                    {zone.winratePercent === null
                      ? "—"
                      : `${zone.winratePercent}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export async function FightMapContent({
  views,
  calibrations,
}: FightMapContentProps) {
  const t = await getTranslations("tendenciesPage");

  const header = (
    <SectionHeader
      eyebrow={t("fightMap.sectionEyebrow")}
      title={t("fightMap.sectionTitle")}
      description={t("fightMap.description")}
    />
  );

  if (views.length === 0) {
    return (
      <section className="space-y-4">
        {header}
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      </section>
    );
  }

  const ranked = views
    .filter((v) => v.overallWinratePercent !== null && v.field !== null)
    .sort(
      (a, b) => (b.overallWinratePercent ?? 0) - (a.overallWinratePercent ?? 0)
    );
  const strongest = ranked[0] ?? null;
  const weakest = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const totalFights = views.reduce((sum, v) => sum + v.totalDecisiveFights, 0);

  const cells: RibbonCell[] = [
    {
      label: t("fightMap.summaryFights"),
      value: String(totalFights),
      sub: t("fightMap.summaryFightsSub"),
      emphasis: true,
    },
    {
      label: t("fightMap.summaryMaps"),
      value: String(views.length),
      sub: t("fightMap.summaryMapsSub"),
    },
    {
      label: t("fightMap.summaryStrongest"),
      value: strongest
        ? `${Math.round(strongest.overallWinratePercent ?? 0)}%`
        : "—",
      sub: strongest ? strongest.mapName : t("fightMap.summaryNoRanking"),
    },
    {
      label: t("fightMap.summaryWeakest"),
      value: weakest
        ? `${Math.round(weakest.overallWinratePercent ?? 0)}%`
        : "—",
      sub: weakest ? weakest.mapName : t("fightMap.summaryNoRanking"),
    },
  ];

  return (
    <>
      <StatRibbon cells={cells} columns={4} />
      <section className="space-y-6">
        {header}
        <div className="divide-y divide-[var(--border)]">
          {views.map((view) => (
            <MapSection
              key={view.mapName}
              view={view}
              calibration={calibrations[view.mapName] ?? null}
            />
          ))}
        </div>
      </section>
    </>
  );
}
