import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import type { MapTransform } from "./types";

export type LoadedCalibration = {
  transform: MapTransform;
  imagePresignedUrl: string;
  imageWidth: number;
  imageHeight: number;
};

export async function loadCalibration(
  mapName: string
): Promise<LoadedCalibration | null> {
  const calibration = await prisma.mapCalibration.findUnique({
    where: { mapName },
    select: {
      imageUrl: true,
      displayImageKey: true,
      imageWidth: true,
      imageHeight: true,
      affineA: true,
      affineB: true,
      affineC: true,
      affineD: true,
      affineTx: true,
      affineTy: true,
    },
  });

  if (
    calibration?.affineA == null ||
    calibration.affineB == null ||
    calibration.affineC == null ||
    calibration.affineD == null ||
    calibration.affineTx == null ||
    calibration.affineTy == null
  ) {
    return null;
  }

  const imagePresignedUrl = await r2.getPresignedUrl({
    key: calibration.displayImageKey ?? calibration.imageUrl,
    expiresIn: 3600,
  });

  return {
    transform: {
      a: calibration.affineA,
      b: calibration.affineB,
      c: calibration.affineC,
      d: calibration.affineD,
      tx: calibration.affineTx,
      ty: calibration.affineTy,
    },
    imagePresignedUrl,
    imageWidth: calibration.imageWidth,
    imageHeight: calibration.imageHeight,
  };
}
