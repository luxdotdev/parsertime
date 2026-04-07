"use client";

import { getControlSubMapName } from "@/lib/map-calibration/control-map-index";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { toHero, toKebabCase } from "@/lib/utils";
import type { SerializedCalibrationData } from "@/data/killfeed-calibration-dto";
import {
  coachingCanvasStore,
  flushCanvasToLocalStorage,
} from "@/stores/coaching-canvas-store";
import type { Kill } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { useTranslations } from "next-intl";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

type PlayerPosition = {
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

function getCalibrationForFight(
  fightStart: number,
  calibrationData: NonNullable<SerializedCalibrationData>
): { calibration: LoadedCalibration; calibrationName: string; subMap: string | null } | null {
  const { calibrations, mapName, mapType, roundStarts } = calibrationData;

  if (mapType === "Control" && roundStarts.length > 0) {
    let objectiveIndex = 0;
    for (let i = roundStarts.length - 1; i >= 0; i--) {
      if (fightStart >= roundStarts[i].match_time) {
        objectiveIndex = roundStarts[i].objective_index;
        break;
      }
    }
    const subMapName = getControlSubMapName(mapName, objectiveIndex);
    if (subMapName && calibrations[subMapName]) {
      return { calibration: calibrations[subMapName], calibrationName: subMapName, subMap: subMapName };
    }
    return null;
  }

  const cal = calibrations[mapName];
  if (!cal) return null;
  return { calibration: cal, calibrationName: mapName, subMap: null };
}

export function ImportToCanvasLink({
  fight,
  calibrationData,
  mapDataId,
  team1,
  t,
}: {
  fight: Fight;
  calibrationData: NonNullable<SerializedCalibrationData>;
  mapDataId: number;
  team1: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleImport = useCallback(async () => {
    setLoading(true);
    try {
      const calInfo = getCalibrationForFight(fight.start, calibrationData);
      if (!calInfo) return;

      const { calibration, calibrationName, subMap } = calInfo;

      const res = await fetch(
        `/api/coaching/fight-positions?mapDataId=${mapDataId}&start=${fight.start}&end=${fight.end}`
      );
      if (!res.ok) return;

      const { players } = (await res.json()) as { players: PlayerPosition[] };

      const kebab = toKebabCase(calibrationData.mapName);

      coachingCanvasStore.send({
        type: "selectMap",
        map: kebab,
        subMap,
        transform: calibration.transform,
        imageUrl: calibration.imagePresignedUrl,
        imageWidth: calibration.imageWidth,
        imageHeight: calibration.imageHeight,
      });

      for (const player of players) {
        const { u, v } = worldToImage(
          { x: player.x, y: player.z },
          calibration.transform
        );
        coachingCanvasStore.send({
          type: "addHero",
          hero: {
            id: `${player.playerName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            heroName: toHero(player.hero),
            team: player.playerTeam === team1 ? 1 : 2,
            x: u,
            y: v,
          },
        });
      }

      flushCanvasToLocalStorage();
      router.push("/coaching/canvas");
    } finally {
      setLoading(false);
    }
  }, [fight, calibrationData, mapDataId, team1, router]);

  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline-offset-2 hover:underline"
      onClick={handleImport}
      disabled={loading}
    >
      {loading ? "..." : t("importToCanvas")}
    </button>
  );
}
