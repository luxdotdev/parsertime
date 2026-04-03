"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MapCalibration, MapCalibrationAnchor } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

type CalibrationWithAnchors = MapCalibration & {
  anchors: MapCalibrationAnchor[];
};

const MAP_TYPES = [
  "Control",
  "Escort",
  "Flashpoint",
  "Hybrid",
  "Push",
] as const;

/**
 * The canonical set of maps that need calibration images.
 * Sorted alphabetically. Control maps split into sub-maps.
 */
const CALIBRATION_MAPS: { name: string; type: string }[] = [
  { name: "Aatlis", type: "Flashpoint" },
  { name: "Blizzard World", type: "Hybrid" },
  { name: "Busan: Downtown", type: "Control" },
  { name: "Busan: Meka Base", type: "Control" },
  { name: "Busan: Sanctuary", type: "Control" },
  { name: "Circuit Royal", type: "Escort" },
  { name: "Colosseo", type: "Push" },
  { name: "Dorado", type: "Escort" },
  { name: "Eichenwalde", type: "Hybrid" },
  { name: "Esperança", type: "Push" },
  { name: "Havana", type: "Escort" },
  { name: "Hollywood", type: "Hybrid" },
  { name: "Ilios: Lighthouse", type: "Control" },
  { name: "Ilios: Ruins", type: "Control" },
  { name: "Ilios: Well", type: "Control" },
  { name: "Junkertown", type: "Escort" },
  { name: "King's Row", type: "Hybrid" },
  { name: "Lijiang Tower: Control Center", type: "Control" },
  { name: "Lijiang Tower: Garden", type: "Control" },
  { name: "Lijiang Tower: Night Market", type: "Control" },
  { name: "Midtown", type: "Hybrid" },
  { name: "Nepal: Sanctum", type: "Control" },
  { name: "Nepal: Shrine", type: "Control" },
  { name: "Nepal: Village", type: "Control" },
  { name: "New Queen Street", type: "Push" },
  { name: "Numbani", type: "Hybrid" },
  { name: "Oasis: City Center", type: "Control" },
  { name: "Oasis: Gardens", type: "Control" },
  { name: "Oasis: University", type: "Control" },
  { name: "Paraiso", type: "Hybrid" },
  { name: "Rialto", type: "Escort" },
  { name: "Route 66", type: "Escort" },
  { name: "Runasapi", type: "Push" },
  { name: "Samoa: Beach", type: "Control" },
  { name: "Samoa: Downtown", type: "Control" },
  { name: "Samoa: Volcano", type: "Control" },
  { name: "Shambali Monastery", type: "Escort" },
  { name: "Suravasa", type: "Flashpoint" },
  { name: "Watchpoint: Gibraltar", type: "Escort" },
];

function getCalibrationStatus(
  calibration: CalibrationWithAnchors | undefined
): { label: string; variant: "default" | "secondary" | "outline" } {
  if (!calibration) {
    return { label: "No image", variant: "outline" };
  }
  if (calibration.affineA !== null) {
    return { label: "Calibrated", variant: "default" };
  }
  if (calibration.anchors.length > 0) {
    return {
      label: `${calibration.anchors.length} anchor${calibration.anchors.length === 1 ? "" : "s"}`,
      variant: "secondary",
    };
  }
  return { label: "Image uploaded", variant: "secondary" };
}

export function MapCalibrationList({
  calibrations,
}: {
  calibrations: CalibrationWithAnchors[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const calibrationMap = useMemo(
    () => new Map(calibrations.map((c) => [c.mapName, c])),
    [calibrations]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CALIBRATION_MAPS.filter(({ name, type }) => {
      if (typeFilter.length > 0 && !typeFilter.includes(type)) return false;
      if (q && !name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          name="mapSearch"
          placeholder="Search maps…"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 sm:max-w-xs"
        />
        <ToggleGroup
          type="multiple"
          value={typeFilter}
          onValueChange={setTypeFilter}
          className="justify-start"
          variant="outline"
        >
          {MAP_TYPES.map((t) => (
            <ToggleGroupItem key={t} value={t} size="sm" className="text-xs">
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No maps match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(({ name, type }) => {
            const calibration = calibrationMap.get(name);
            const status = getCalibrationStatus(calibration);

            return (
              <Link
                key={name}
                href={`/map-calibration/${encodeURIComponent(name)}` as Route}
              >
                <Card className="hover:bg-muted/50 h-full transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base text-pretty">
                        {name}
                      </CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardDescription>{type}</CardDescription>
                  </CardHeader>
                  {calibration ? (
                    <CardContent className="pt-0">
                      <p className="text-muted-foreground text-xs">
                        {calibration.anchors.length} anchor
                        {calibration.anchors.length === 1 ? "" : "s"}
                        {calibration.affineA !== null && " · transform saved"}
                      </p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
