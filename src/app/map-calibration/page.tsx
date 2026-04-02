import { MapCalibrationList } from "@/components/admin/map-calibration/map-calibration-list";
import { NoAuthCard } from "@/components/auth/no-auth";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function MapCalibrationPage() {
  const session = await auth();
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

  const calibrations = await prisma.mapCalibration.findMany({
    include: { anchors: true },
  });

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Map Calibration</h1>
          <p className="text-muted-foreground">
            Calibrate coordinate transforms for top-down map images. Each map
            needs anchor points mapping world coordinates to image pixels.
          </p>
        </div>
        <MapCalibrationList calibrations={calibrations} />
      </div>
    </div>
  );
}
