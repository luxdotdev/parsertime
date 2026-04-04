import { getControlSubMapName } from "@/lib/map-calibration/control-map-index";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import type { SerializedCalibrationData } from "@/data/killfeed-calibration-dto";
import { useMemo } from "react";

export function useKillCalibration(
  matchTime: number,
  calibrationData: SerializedCalibrationData
): LoadedCalibration | null {
  return useMemo(() => {
    if (!calibrationData) return null;

    const { calibrations, mapName, mapType, roundStarts } = calibrationData;

    if (mapType === "Control" && roundStarts.length > 0) {
      let objectiveIndex = 0;
      for (let i = roundStarts.length - 1; i >= 0; i--) {
        if (matchTime >= roundStarts[i].match_time) {
          objectiveIndex = roundStarts[i].objective_index;
          break;
        }
      }
      const subMapName = getControlSubMapName(mapName, objectiveIndex);
      if (subMapName && calibrations[subMapName]) {
        return calibrations[subMapName];
      }
      return null;
    }

    const cal = calibrations[mapName];
    return cal ?? null;
  }, [matchTime, calibrationData]);
}
