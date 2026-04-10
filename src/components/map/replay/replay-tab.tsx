import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ReplayService } from "@/data/map";
import { getTranslations } from "next-intl/server";
import { ReplayViewer } from "./replay-viewer";

export async function ReplayTab({ id }: { id: number }) {
  const [data, t] = await Promise.all([
    AppRuntime.runPromise(
      ReplayService.pipe(Effect.flatMap((svc) => svc.getReplayData(id)))
    ),
    getTranslations("mapPage.replay"),
  ]);

  if (data.type === "no_calibration") {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("noCalibration")}</p>
      </div>
    );
  }

  if (data.type === "no_coordinates") {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("noCoordinates")}</p>
      </div>
    );
  }

  return (
    <ReplayViewer
      positionSamples={data.positionSamples}
      displayEvents={data.displayEvents}
      calibration={data.calibration}
      team1Name={data.team1Name}
      team2Name={data.team2Name}
    />
  );
}
