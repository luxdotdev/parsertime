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
import { upload } from "@vercel/blob/client";
import Logger from "@/lib/logger";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

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
      }, "image/png");
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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropImage = async () => {
    if (!selectedFile || !croppedAreaPixels) return;

    setLoading(true);

    try {
      const croppedImage = await getCroppedImg(
        selectedFile,
        croppedAreaPixels,
        0 // rotation if necessary
      );
      const { url } = await upload(`avatars/${user.id}.png`, croppedImage, {
        access: "public",
        handleUploadUrl: "/api/avatar-upload?userId=" + user.id,
      });

      const res = await fetch("/api/update-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id, image: url }),
      });

      if (res.ok) {
        setLoading(false);
        toast({
          title: "Avatar updated successfully",
          description: "Your avatar has been updated successfully.",
          duration: 5000,
        });
        setIsOpen(false);
        router.refresh();
      } else {
        setLoading(false);
        toast({
          title: "An error occurred",
          description: `An error occurred: ${res.statusText} (${res.status})`,
          duration: 5000,
        });
      }
    } catch (e) {
      setLoading(false);
      toast({
        title: "An error occurred",
        description:
          "An error occurred while updating your avatar. Please try again later or contact support.",
        duration: 5000,
      });
      Logger.log(e);
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
          <Button onClick={handleCropImage} disabled={loading}>
            {loading ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
