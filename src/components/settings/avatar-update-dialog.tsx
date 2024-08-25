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
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("settingsPage.profileForm.avatar");

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
        handleUploadUrl: `/api/user/avatar-upload?userId=${user.id}`,
      });

      const res = await fetch("/api/user/update-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id, image: url }),
      });

      if (res.ok) {
        setLoading(false);
        toast({
          title: t("editAvatar.handleCrop.title"),
          description: t("editAvatar.handleCrop.description"),
          duration: 5000,
        });
        setIsOpen(false);
        router.refresh();
      } else {
        setLoading(false);
        toast({
          title: t("editAvatar.handleCrop.errorTitle"),
          description: t("editAvatar.handleCrop.errorDescription1", {
            res: `${await res.text()} (${res.status})`,
          }),
          duration: 5000,
        });
      }
    } catch (e) {
      setLoading(false);
      toast({
        title: t("editAvatar.handleCrop.errorTitle"),
        description: t("editAvatar.handleCrop.errorDescription2"),
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
          <DialogTitle>{t("editAvatar.title")}</DialogTitle>
          <DialogDescription>{t("editAvatar.description")}</DialogDescription>
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
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("editAvatar.updating")}
              </>
            ) : (
              t("editAvatar.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
