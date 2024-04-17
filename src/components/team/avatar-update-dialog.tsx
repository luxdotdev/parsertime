import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Team, User } from "@prisma/client";
import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { upload } from "@vercel/blob/client";
import Logger from "@/lib/logger";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { ReloadIcon } from "@radix-ui/react-icons";

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
  team,
  isOpen,
  setIsOpen,
  selectedFile,
}: {
  team: Team;
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
      const { url } = await upload(
        `team-avatars/${team.id}.png`,
        croppedImage,
        {
          access: "public",
          handleUploadUrl: `/api/team/avatar-upload?teamId=${team.id}`,
        }
      );

      const res = await fetch("/api/team/update-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId: team.id, image: url }),
      });

      if (res.ok) {
        setLoading(false);
        toast({
          title: "Avatar updated successfully",
          description: "Your team's avatar has been updated successfully.",
          duration: 5000,
        });
        setIsOpen(false);
        router.refresh();
      } else {
        setLoading(false);
        toast({
          title: "An error occurred",
          description: `An error occurred: ${await res.text()} (${res.status})`,
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

        <div className="relative h-96 w-full">
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
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
