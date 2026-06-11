import { FightMapCanvas } from "@/components/team/fight-map-canvas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FightFieldResult,
  FightMapView,
} from "@/data/team/fight-field-service";
import { FIELD_MIN_TOTAL_FIGHTS } from "@/lib/fight-field";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
        strong
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      <span className="max-w-40 truncate font-medium">
        {zoneName ?? fallback}
      </span>
      <span className="font-mono tabular-nums">
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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{view.mapName}</h3>
        <div className="text-muted-foreground flex items-baseline gap-4 text-sm tabular-nums">
          <span>{t("fights", { count: view.totalDecisiveFights })}</span>
          {view.overallWinratePercent !== null && (
            <span>
              {t("overall")}{" "}
              <span
                className={`font-medium ${
                  view.overallWinratePercent >= 55
                    ? "text-green-400"
                    : view.overallWinratePercent <= 45
                      ? "text-red-400"
                      : "text-foreground"
                }`}
              >
                {Math.round(view.overallWinratePercent)}%
              </span>
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
        <div className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-sm">
          {t("notEnoughFights", { count: FIELD_MIN_TOTAL_FIGHTS })}
        </div>
      ) : calibration === null ? (
        <div className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-sm">
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
        <Table className="max-w-xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t("zone")}</TableHead>
              <TableHead className="text-right">{t("record")}</TableHead>
              <TableHead className="text-right">{t("winrate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.zoneScorecard.map((zone) => (
              <TableRow key={zone.zoneName}>
                <TableCell className="font-medium">{zone.zoneName}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  <span className="text-green-400">{zone.won}W</span>{" "}
                  <span className="text-red-400">{zone.lost}L</span>
                  {zone.even > 0 && (
                    <span className="text-muted-foreground"> {zone.even}E</span>
                  )}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm tabular-nums ${
                    zone.winratePercent === null
                      ? "text-muted-foreground"
                      : zone.winratePercent >= 55
                        ? "text-green-400"
                        : zone.winratePercent <= 45
                          ? "text-red-400"
                          : ""
                  }`}
                >
                  {zone.winratePercent === null
                    ? "—"
                    : `${zone.winratePercent}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export async function FightMapContent({
  views,
  calibrations,
}: FightMapContentProps) {
  const t = await getTranslations("tendenciesPage");

  return (
    <div className="flex-1 space-y-10 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-2 max-w-prose">
          {t("fightMap.description")}
        </p>
      </div>

      {views.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t("empty")}</p>
      ) : (
        views.map((view) => (
          <MapSection
            key={view.mapName}
            view={view}
            calibration={calibrations[view.mapName] ?? null}
          />
        ))
      )}
    </div>
  );
}
