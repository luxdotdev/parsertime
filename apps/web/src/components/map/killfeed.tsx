import { KillfeedWithTimeline } from "@/components/map/killfeed-with-timeline";
import { MapStatCell } from "@/components/map/map-stat-cell";
import { Separator } from "@/components/ui/separator";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import {
  KillfeedService,
  KillfeedCalibrationService,
  serializeCalibrationData,
} from "@/data/map";
import type { Locale } from "@/i18n/config";
import { mapTag } from "@/lib/cache-tags";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { removeDuplicateRows, toTimestamp } from "@/lib/utils";
import { groupKillsIntoFights } from "@/lib/server-utils";
import { cacheLife, cacheTag } from "next/cache";

export async function Killfeed({
  id,
  locale,
  team1Color,
  team2Color,
  positionalDataEnabled,
  coachingCanvasEnabled,
}: {
  id: number;
  locale: Locale;
  team1Color: string;
  team2Color: string;
  positionalDataEnabled: boolean;
  coachingCanvasEnabled: boolean;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(mapTag(id));

  const mapDataId = await resolveMapDataId(id);
  const [roundEndRows, playerTeams, fights, ultimateData] = await Promise.all([
    prisma.roundEnd.findMany({
      where: { MapDataId: mapDataId },
      orderBy: { match_time: "asc" },
    }),
    prisma.matchStart.findFirst({ where: { MapDataId: mapDataId } }),
    groupKillsIntoFights(id),
    AppRuntime.runPromise(
      KillfeedService.pipe(Effect.flatMap((svc) => svc.getUltimateSpans(id)))
    ),
  ]);

  const calibrationData = positionalDataEnabled
    ? serializeCalibrationData(
        await AppRuntime.runPromise(
          KillfeedCalibrationService.pipe(
            Effect.flatMap((svc) => svc.getKillfeedCalibration(mapDataId))
          )
        )
      )
    : null;

  const roundEnds = removeDuplicateRows(roundEndRows);
  const finalRound = roundEnds.at(-1) ?? null;

  const t = await getLocaleTranslations(locale, "mapPage.killfeed");

  const team1Name = playerTeams?.team_1_name ?? t("team1");
  const team2Name = playerTeams?.team_2_name ?? t("team2");

  let team1Kills = 0;
  let team2Kills = 0;

  let team1FightWins = 0;
  let team2FightWins = 0;

  fights.forEach((fight) => {
    fight.kills.forEach((kill) => {
      if (kill.attacker_team === team1Name) {
        team1Kills++;
      } else {
        team2Kills++;
      }
    });

    if (
      fight.kills.filter((kill) => kill.attacker_team === team1Name).length >
      fight.kills.length / 2
    ) {
      team1FightWins++;
    } else {
      team2FightWins++;
    }
  });

  const teamNamesSub = (
    <>
      <span style={{ color: team1Color }}>{team1Name}</span>
      {" / "}
      <span style={{ color: team2Color }}>{team2Name}</span>
    </>
  );

  return (
    <section aria-label={t("title")} className="space-y-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        <MapStatCell
          label={t("matchTime")}
          value={toTimestamp(finalRound?.match_time ?? 0)}
          sub={t("minutes", {
            count: ((finalRound?.match_time ?? 0) / 60).toFixed(2),
          })}
        />
        <MapStatCell
          label={t("kills")}
          value={
            <>
              <span style={{ color: team1Color }}>{team1Kills}</span>
              {" / "}
              <span style={{ color: team2Color }}>{team2Kills}</span>
            </>
          }
          sub={teamNamesSub}
        />
        <MapStatCell
          label={t("deaths")}
          value={
            <>
              <span style={{ color: team2Color }}>{team2Kills}</span>
              {" / "}
              <span style={{ color: team1Color }}>{team1Kills}</span>
            </>
          }
          sub={teamNamesSub}
        />
        <MapStatCell
          label={t("fightWins")}
          value={
            <>
              <span style={{ color: team1Color }}>{team1FightWins}</span>
              {" / "}
              <span style={{ color: team2Color }}>{team2FightWins}</span>
            </>
          }
          sub={teamNamesSub}
        />
      </div>

      <Separator />

      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-7">
        <KillfeedWithTimeline
          fights={fights}
          ultimateData={ultimateData}
          roundEnds={roundEnds}
          team1={team1Name}
          team2={team2Name}
          team1Color={team1Color}
          team2Color={team2Color}
          calibrationData={calibrationData}
          canvasImportEnabled={coachingCanvasEnabled && positionalDataEnabled}
          mapDataId={mapDataId}
        />
      </div>
    </section>
  );
}
