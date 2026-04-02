import { CalibrationEditor } from "@/components/admin/map-calibration/calibration-editor";
import { NoAuthCard } from "@/components/auth/no-auth";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function MapCalibrationEditorPage({
  params,
}: {
  params: Promise<{ mapName: string }>;
}) {
  const [session, { mapName }] = await Promise.all([auth(), params]);
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);
  if (!user) {
    redirect("/sign-up");
  }
  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
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
      originX: true,
      originY: true,
      scale: true,
      rotation: true,
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
