import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@prisma/client";
import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { put } from "@vercel/blob";

async function getCroppedImg(
  file: File,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<Blob> {
  const image = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const { width, height } = image;
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      if (ctx) {
        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      }, "image/jpeg");
    };
    image.src = URL.createObjectURL(file);
  });
}

export function AvatarUpdateDialog({
  user,
  isOpen,
  setIsOpen,
  selectedFile,
}: {
  user: User;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedFile: File | null;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropImage = async () => {
    if (!selectedFile || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(
        selectedFile,
        croppedAreaPixels,
        0 // rotation if necessary
      );
      // uploadImageToBackend(croppedImage);
      const { url } = await put("avatars/" + user.id, croppedImage, {
        access: "public",
      });

      console.log(url);
    } catch (e) {
      console.error(e);
    }
  };

  if (!selectedFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Avatar</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-96">
          <Cropper
            image={URL.createObjectURL(selectedFile)}
            crop={crop}
            zoom={zoom}
            aspect={1} // 1 for square images. Adjust as necessary.
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleCropImage}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
