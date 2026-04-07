"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import {
  getControlSubMapNames,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import { toKebabCase, useMapNames } from "@/lib/utils";
import { coachingCanvasStore } from "@/stores/coaching-canvas-store";
import { mapNameToMapTypeMapping } from "@/types/map";
import { useSelector } from "@xstate/store/react";
import { useTranslations } from "next-intl";
import Image from "next/image";

const EXCLUDED_MAPS = new Set([
  "Blizzard World (Winter)",
  "Eichenwalde (Halloween)",
  "Hollywood (Halloween)",
  "King's Row (Winter)",
  "Lijiang Tower (Lunar New Year)",
  "Antarctic Peninsula",
]);

async function loadAndSelectMap(
  mapName: string,
  calibrationName: string,
  subMap: string | null
) {
  const kebab = toKebabCase(mapName);

  try {
    const res = await fetch(
      `/api/coaching/map-calibration?map=${encodeURIComponent(calibrationName)}`
    );
    if (res.ok) {
      const data = (await res.json()) as LoadedCalibration;
      coachingCanvasStore.send({
        type: "selectMap",
        map: kebab,
        subMap,
        transform: data.transform,
        imageUrl: data.imagePresignedUrl,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
      });
      return;
    }
  } catch {}

  coachingCanvasStore.send({
    type: "selectMap",
    map: kebab,
    subMap: null,
    transform: null,
    imageUrl: `/maps/${kebab}.webp`,
    imageWidth: 1920,
    imageHeight: 1080,
  });
}

export function MapSelector() {
  const t = useTranslations("coaching.mapSelector");
  const mapNames = useMapNames();
  const selectedMap = useSelector(
    coachingCanvasStore,
    (s) => s.context.selectedMap
  );
  const selectedSubMap = useSelector(
    coachingCanvasStore,
    (s) => s.context.selectedSubMap
  );

  const maps = Object.keys(mapNameToMapTypeMapping).filter(
    (name) => !EXCLUDED_MAPS.has(name)
  );

  function handleMapSelect(mapName: string) {
    if (isControlMap(mapName)) {
      const subMaps = getControlSubMapNames(mapName);
      if (subMaps.length > 0) {
        void loadAndSelectMap(mapName, subMaps[0], subMaps[0]);
        return;
      }
    }
    void loadAndSelectMap(mapName, mapName, null);
  }

  function handleSubMapSelect(subMapName: string) {
    const parentMap = maps.find((m) => toKebabCase(m) === selectedMap);
    if (!parentMap) return;
    void loadAndSelectMap(parentMap, subMapName, subMapName);
  }

  const currentParentName = selectedMap
    ? maps.find((m) => toKebabCase(m) === selectedMap)
    : null;

  const controlSubMaps =
    currentParentName && isControlMap(currentParentName)
      ? getControlSubMapNames(currentParentName)
      : [];

  return (
    <div className="flex items-center gap-2">
      <Select value={currentParentName ?? ""} onValueChange={handleMapSelect}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder={t("placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {maps.map((mapName) => {
            const kebab = toKebabCase(mapName);
            const displayName = mapNames.get(kebab) ?? mapName;
            return (
              <SelectItem key={mapName} value={mapName}>
                <div className="flex items-center gap-2">
                  <Image
                    src={`/maps/${kebab}.webp`}
                    alt={displayName}
                    width={40}
                    height={23}
                    className="rounded-sm object-cover"
                  />
                  <span>{displayName}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {controlSubMaps.length > 0 && (
        <Select
          value={selectedSubMap ?? controlSubMaps[0]}
          onValueChange={handleSubMapSelect}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t("subMapPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {controlSubMaps.map((subMap) => {
              const colonIdx = subMap.indexOf(": ");
              const label = colonIdx >= 0 ? subMap.slice(colonIdx + 2) : subMap;
              return (
                <SelectItem key={subMap} value={subMap}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
