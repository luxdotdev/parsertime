"use client";

import { MapCanvas } from "@/components/admin/map-calibration/map-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { applyPixelAffine } from "@/lib/map-calibration/remap";
import type { PixelAffine } from "@/lib/map-calibration/types";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Anchor = {
  imageU: number;
  imageV: number;
  label: string | null;
};

type AlignResult = {
  pixelAffine: PixelAffine;
  inliers: number;
  residual: number;
  stagedOriginalKey: string;
  stagedDisplayKey: string;
  stagedDisplayUrl: string;
  newWidth: number;
  newHeight: number;
};

type ReplaceRenderDialogProps = {
  calibrationId: number;
  mapName: string;
  anchors: Anchor[];
  onApplied: () => void;
};

const LOW_CONFIDENCE_RESIDUAL = 5;
const LOW_CONFIDENCE_INLIERS = 25;

export function ReplaceRenderDialog({
  calibrationId,
  mapName,
  anchors,
  onApplied,
}: ReplaceRenderDialogProps) {
  const t = useTranslations("mapCalibrationPage.replaceRender");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AlignResult | null>(null);

  function reset() {
    setResult(null);
    setStatus("");
    setBusy(false);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      setStatus(t("uploading"));
      const presignRes = await fetch(
        "/api/admin/map-calibration/upload/presign",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mapName, contentType: file.type }),
        }
      );
      if (!presignRes.ok) throw new Error("presign");
      const { uploadUrl, rawKey } = (await presignRes.json()) as {
        uploadUrl: string;
        rawKey: string;
      };

      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error("upload");

      setStatus(t("aligning"));
      const alignRes = await fetch(
        `/api/admin/map-calibration/${calibrationId}/align`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawKey }),
        }
      );
      if (alignRes.status === 422) {
        toast.error(t("unalignable"));
        reset();
        return;
      }
      if (!alignRes.ok) throw new Error("align");
      setResult((await alignRes.json()) as AlignResult);
    } catch {
      toast.error(t("applyError"));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function discardStaging() {
    await fetch(`/api/admin/map-calibration/${calibrationId}/align`, {
      method: "DELETE",
    }).catch(() => undefined);
  }

  async function handleConfirm() {
    if (!result) return;
    setBusy(true);
    setStatus(t("applying"));
    try {
      const res = await fetch(
        `/api/admin/map-calibration/${calibrationId}/align/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pixelAffine: result.pixelAffine,
            stagedOriginalKey: result.stagedOriginalKey,
            stagedDisplayKey: result.stagedDisplayKey,
            newWidth: result.newWidth,
            newHeight: result.newHeight,
          }),
        }
      );
      if (!res.ok) throw new Error("apply");
      toast.success(t("applied"));
      setOpen(false);
      reset();
      onApplied();
    } catch {
      toast.error(t("applyError"));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function handleCancel() {
    await discardStaging();
    setOpen(false);
    reset();
  }

  // Anchors re-projected onto the new render via P (the decisive visual).
  const projectedAnchors: Anchor[] = result
    ? anchors.map((a) => {
        const { u, v } = applyPixelAffine(
          result.pixelAffine,
          a.imageU,
          a.imageV
        );
        return { imageU: u, imageV: v, label: a.label };
      })
    : [];

  const lowConfidence =
    result != null &&
    (result.residual > LOW_CONFIDENCE_RESIDUAL ||
      result.inliers < LOW_CONFIDENCE_INLIERS);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && result) void discardStaging();
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title", { mapName })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <input
              type="file"
              accept="image/png,image/jpeg"
              aria-label={t("selectFile")}
              className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              disabled={busy}
            />
            {busy ? (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {status}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              {t("alignSummary", {
                inliers: result.inliers,
                residual: result.residual.toFixed(1),
              })}
            </p>
            {lowConfidence ? (
              <p className="text-sm text-amber-500" role="alert">
                {t("lowConfidence")}
              </p>
            ) : null}
            <MapCanvas
              imageUrl={result.stagedDisplayUrl}
              imageWidth={result.newWidth}
              imageHeight={result.newHeight}
              anchors={projectedAnchors}
              transform={null}
              testPoints={[]}
              onImageClick={() => undefined}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void handleCancel()}
                disabled={busy}
              >
                {t("cancel")}
              </Button>
              <Button onClick={() => void handleConfirm()} disabled={busy}>
                {busy ? status : t("confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
