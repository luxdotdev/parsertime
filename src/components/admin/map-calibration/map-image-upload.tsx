"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type MapImageUploadProps = {
  mapName: string;
  onUploadComplete: (
    imageKey: string,
    displayImageKey: string,
    width: number,
    height: number
  ) => void;
};

export function MapImageUpload({
  mapName,
  onUploadComplete,
}: MapImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      setStatus("Requesting upload URL…");
      const presignRes = await fetch(
        "/api/admin/map-calibration/upload/presign",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mapName,
            contentType: file.type || "application/octet-stream",
          }),
        }
      );

      if (!presignRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, rawKey } = (await presignRes.json()) as {
        uploadUrl: string;
        rawKey: string;
      };

      setStatus("Uploading image to storage\u2026");
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image to storage");

      setStatus("Processing image\u2026");
      const processRes = await fetch("/api/admin/map-calibration/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawKey, mapName }),
      });

      if (!processRes.ok) throw new Error("Failed to process image");

      const data = (await processRes.json()) as {
        imageKey: string;
        displayImageKey: string;
        imageWidth: number;
        imageHeight: number;
      };

      onUploadComplete(
        data.imageKey,
        data.displayImageKey,
        data.imageWidth,
        data.imageHeight
      );
      setOpen(false);
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setUploading(false);
      setStatus("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Map Image</DialogTitle>
          <DialogDescription>
            Upload a top-down orthographic image for {mapName}. Supports PNG and
            JPEG up to 150MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            name="mapImage"
            accept="image/png,image/jpeg"
            aria-label="Select map image file"
            className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
            disabled={uploading}
          />
          {uploading ? (
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {status || "Uploading…"} This may take a moment for large images.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
