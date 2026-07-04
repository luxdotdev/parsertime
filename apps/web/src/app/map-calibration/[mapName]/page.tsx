import { CalibrationEditor } from "@/components/admin/map-calibration/calibration-editor";
import {
  ZoneSection,
  type MapZoneDto,
} from "@/components/admin/map-calibration/zone-section";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import type { MapTransform } from "@/lib/map-calibration/types";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

// Static shell: the page frame prerenders and the flag/auth/DB-derived editor
// streams into ONE boundary whose fallback mirrors the editor's loaded layout.
export default function MapCalibrationEditorPage({
  params,
}: {
  params: Promise<{ mapName: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-4 pb-4 sm:px-6">
      <Suspense fallback={<CalibrationEditorSkeleton />}>
        <MapCalibrationEditorContent params={params} />
      </Suspense>
    </div>
  );
}

async function MapCalibrationEditorContent({
  params,
}: {
  params: Promise<{ mapName: string }>;
}) {
  const [enabled, user, { mapName }] = await Promise.all([
    getFlag(dataLabeling),
    getCurrentUser(),
    params,
  ]);
  if (!enabled) notFound();
  if (!user) {
    redirect("/sign-in");
  }
  if (!isAdminUser(user)) notFound();

  const decodedMapName = decodeURIComponent(mapName);

  const calibration = await prisma.mapCalibration.findUnique({
    where: { mapName: decodedMapName },
    select: {
      id: true,
      mapName: true,
      imageUrl: true,
      imageWidth: true,
      imageHeight: true,
      displayImageKey: true,
      affineA: true,
      affineB: true,
      affineC: true,
      affineD: true,
      affineTx: true,
      affineTy: true,
      anchors: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          calibrationId: true,
          worldX: true,
          worldY: true,
          imageU: true,
          imageV: true,
          label: true,
        },
      },
    },
  });

  let calibrationWithUrl:
    | (typeof calibration & { imagePresignedUrl?: string })
    | null = calibration;
  let presignedImageUrl: string | null = null;
  let zones: MapZoneDto[] = [];
  let transform: MapTransform | null = null;
  if (calibration) {
    const [imagePresignedUrl, zoneRows] = await Promise.all([
      r2.getPresignedUrl({ key: calibration.imageUrl, expiresIn: 3600 }),
      prisma.mapZone.findMany({
        where: { calibrationId: calibration.id },
        orderBy: { id: "asc" },
      }),
    ]);
    calibrationWithUrl = { ...calibration, imagePresignedUrl };
    presignedImageUrl = imagePresignedUrl;
    zones = zoneRows.map((z) => ({
      id: z.id,
      name: z.name,
      category: z.category,
      status: z.status,
      source: z.source,
      laneRole: z.laneRole,
      vertices: z.vertices as unknown as [number, number][],
    }));

    // Build the affine transform the same way load-calibration.ts does:
    // null if any affine field is null.
    if (
      calibration.affineA != null &&
      calibration.affineB != null &&
      calibration.affineC != null &&
      calibration.affineD != null &&
      calibration.affineTx != null &&
      calibration.affineTy != null
    ) {
      transform = {
        a: calibration.affineA,
        b: calibration.affineB,
        c: calibration.affineC,
        d: calibration.affineD,
        tx: calibration.affineTx,
        ty: calibration.affineTy,
      };
    }
  }

  return (
    <>
      <CalibrationEditor
        mapName={decodedMapName}
        calibration={calibrationWithUrl}
      />
      {calibration && presignedImageUrl ? (
        <ZoneSection
          calibrationId={calibration.id}
          presignedImageUrl={presignedImageUrl}
          imageWidth={calibration.imageWidth}
          imageHeight={calibration.imageHeight}
          transform={transform}
          initialZones={zones}
        />
      ) : null}
    </>
  );
}

// Mirrors CalibrationEditor's loaded layout (toolbar row, canvas + w-80
// sidebar) plus the ZoneSection block below it.
function CalibrationEditorSkeleton() {
  return (
    <>
      <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-7 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>

          <div className="flex w-80 shrink-0 flex-col gap-4">
            <div className="rounded-lg border p-3">
              <Skeleton className="mb-2 h-4 w-28" />
              {["a", "b", "c", "d"].map((k) => (
                <Skeleton key={k} className="mb-1.5 h-9 w-full rounded-md" />
              ))}
            </div>

            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-md" />
            </div>

            <Skeleton className="h-24 w-full rounded-md" />

            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>

        <div className="flex w-80 shrink-0 flex-col gap-3">
          <Skeleton className="h-8 w-full rounded-md" />
          {["a", "b", "c"].map((k) => (
            <div key={k} className="space-y-2 rounded-lg border p-3">
              <Skeleton className="h-8 w-full rounded-md" />
              <div className="flex gap-1.5">
                {["x", "y", "z"].map((j) => (
                  <Skeleton key={j} className="h-5 w-16 rounded-full" />
                ))}
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
