import { CalibrationEditor } from "@/components/admin/map-calibration/calibration-editor";
import { auth } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function MapCalibrationEditorPage({
  params,
}: {
  params: Promise<{ mapName: string }>;
}) {
  const [enabled, session, { mapName }] = await Promise.all([
    dataLabeling(),
    auth(),
    params,
  ]);
  if (!enabled) notFound();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const decodedMapName = decodeURIComponent(mapName);

  const calibration = await prisma.mapCalibration.findUnique({
    where: { mapName: decodedMapName },
    select: {
      id: true,
      mapName: true,
      imageUrl: true,
      imageWidth: true,
      imageHeight: true,
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

  return (
    <div className="flex flex-1 flex-col px-4 pt-4 pb-4 sm:px-6">
      <CalibrationEditor mapName={decodedMapName} calibration={calibration} />
    </div>
  );
}
