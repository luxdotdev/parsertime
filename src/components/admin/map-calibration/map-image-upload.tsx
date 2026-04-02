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
import { upload } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

type MapImageUploadProps = {
  mapName: string;
  onUploadComplete: (url: string, width: number, height: number) => void;
};

export function MapImageUpload({
  mapName,
  onUploadComplete,
}: MapImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const dimensions = await getImageDimensions(file);

      const slug = mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const blob = await upload(`map-images/${slug}.png`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/map-calibration/upload",
      });

      onUploadComplete(blob.url, dimensions.width, dimensions.height);
      setOpen(false);
    } catch {
      // handled — uploading state resets
    } finally {
      setUploading(false);
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
              Uploading&#x2026; This may take a moment for large images.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
