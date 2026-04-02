"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MapCalibration, MapCalibrationAnchor } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";

type CalibrationWithAnchors = MapCalibration & {
  anchors: MapCalibrationAnchor[];
};

/**
 * The canonical set of maps that need calibration images.
 * Control maps are split into their individual sub-maps.
 * Clash maps are excluded (not in core competitive rotation).
 */
const CALIBRATION_MAPS: { name: string; type: string }[] = [
  // Escort
  { name: "Circuit Royal", type: "Escort" },
  { name: "Dorado", type: "Escort" },
  { name: "Havana", type: "Escort" },
  { name: "Junkertown", type: "Escort" },
  { name: "Rialto", type: "Escort" },
  { name: "Route 66", type: "Escort" },
  { name: "Shambali Monastery", type: "Escort" },
  { name: "Watchpoint: Gibraltar", type: "Escort" },
  // Hybrid
  { name: "Blizzard World", type: "Hybrid" },
  { name: "Eichenwalde", type: "Hybrid" },
  { name: "Hollywood", type: "Hybrid" },
  { name: "King's Row", type: "Hybrid" },
  { name: "Midtown", type: "Hybrid" },
  { name: "Numbani", type: "Hybrid" },
  { name: "Paraiso", type: "Hybrid" },
  // Push
  { name: "Colosseo", type: "Push" },
  { name: "Esperança", type: "Push" },
  { name: "New Queen Street", type: "Push" },
  { name: "Runasapi", type: "Push" },
  // Flashpoint
  { name: "Aatlis", type: "Flashpoint" },
  { name: "Suravasa", type: "Flashpoint" },
  // Control — Busan
  { name: "Busan: Downtown", type: "Control" },
  { name: "Busan: Meka Base", type: "Control" },
  { name: "Busan: Sanctuary", type: "Control" },
  // Control — Ilios
  { name: "Ilios: Lighthouse", type: "Control" },
  { name: "Ilios: Ruins", type: "Control" },
  { name: "Ilios: Well", type: "Control" },
  // Control — Lijiang Tower
  { name: "Lijiang Tower: Control Center", type: "Control" },
  { name: "Lijiang Tower: Garden", type: "Control" },
  { name: "Lijiang Tower: Night Market", type: "Control" },
  // Control — Nepal
  { name: "Nepal: Sanctum", type: "Control" },
  { name: "Nepal: Shrine", type: "Control" },
  { name: "Nepal: Village", type: "Control" },
  // Control — Oasis
  { name: "Oasis: City Center", type: "Control" },
  { name: "Oasis: Gardens", type: "Control" },
  { name: "Oasis: University", type: "Control" },
  // Control — Samoa
  { name: "Samoa: Beach", type: "Control" },
  { name: "Samoa: Downtown", type: "Control" },
  { name: "Samoa: Volcano", type: "Control" },
];

function getCalibrationStatus(
  calibration: CalibrationWithAnchors | undefined
): { label: string; variant: "default" | "secondary" | "outline" } {
  if (!calibration) {
    return { label: "No image", variant: "outline" };
  }
  if (calibration.scale !== null && calibration.rotation !== null) {
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
  const calibrationMap = useMemo(
    () => new Map(calibrations.map((c) => [c.mapName, c])),
    [calibrations]
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {CALIBRATION_MAPS.map(({ name, type }) => {
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
                    {calibration.scale !== null && " · transform saved"}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
