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

type StagedResult = {
  stagedOriginalKey: string;
  stagedDisplayKey: string;
  stagedDisplayUrl: string;
  oldDisplayUrl: string;
  newWidth: number;
  newHeight: number;
};

type ParsedTransform = {
  pixelAffine: PixelAffine;
  inliers: number | null;
  residual: number | null;
};

type ReplaceRenderDialogProps = {
  calibrationId: number;
  mapName: string;
  anchors: Anchor[];
  onApplied: () => void;
};

// Heuristics for the "verify carefully" banner (informational only — never gates
// Confirm). Residual is mean reprojection error in original-image pixels; inliers
// is the RANSAC inlier match count from the alignment script.
const LOW_CONFIDENCE_RESIDUAL = 5;
const LOW_CONFIDENCE_INLIERS = 25;

// Parse the alignment CLI's output. Accepts either the full payload
// { pixelAffine: {...}, inliers, residual } or a bare { a,b,c,d,tx,ty }.
// Returns null if the shape/values are invalid. Caller wraps JSON.parse errors.
function parseTransform(text: string): ParsedTransform | null {
  const raw: unknown = JSON.parse(text);
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const affineSource = ("pixelAffine" in obj ? obj.pixelAffine : obj) as
    | Record<string, unknown>
    | null;
  if (typeof affineSource !== "object" || affineSource === null) return null;
  const keys = ["a", "b", "c", "d", "tx", "ty"] as const;
  const affine: Record<(typeof keys)[number], number> = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    tx: 0,
    ty: 0,
  };
  for (const k of keys) {
    const v = affineSource[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    affine[k] = v;
  }
  const inliers = typeof obj.inliers === "number" ? obj.inliers : null;
  const residual = typeof obj.residual === "number" ? obj.residual : null;
  return { pixelAffine: affine as PixelAffine, inliers, residual };
}

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
  const [staged, setStaged] = useState<StagedResult | null>(null);
  const [transformText, setTransformText] = useState("");
  const [parsed, setParsed] = useState<ParsedTransform | null>(null);
  const [parseError, setParseError] = useState(false);
  const [compareMode, setCompareMode] = useState<"blink" | "swipe">("blink");
  const [showOld, setShowOld] = useState(false);
  const [swipe, setSwipe] = useState(50);

  function reset() {
    setStaged(null);
    setTransformText("");
    setParsed(null);
    setParseError(false);
    setStatus("");
    setBusy(false);
    setCompareMode("blink");
    setShowOld(false);
    setSwipe(50);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setStaged(null);
    setParsed(null);
    setTransformText("");
    setParseError(false);
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

      const stageRes = await fetch(
        `/api/admin/map-calibration/${calibrationId}/align`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawKey }),
        }
      );
      if (!stageRes.ok) throw new Error("stage");
      setStaged((await stageRes.json()) as StagedResult);
    } catch {
      toast.error(t("applyError"));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function handleTransformChange(text: string) {
    setTransformText(text);
    if (text.trim() === "") {
      setParsed(null);
      setParseError(false);
      return;
    }
    try {
      const result = parseTransform(text);
      setParsed(result);
      setParseError(result === null);
    } catch {
      setParsed(null);
      setParseError(true);
    }
  }

  async function discardStaging() {
    await fetch(`/api/admin/map-calibration/${calibrationId}/align`, {
      method: "DELETE",
    }).catch(() => undefined);
  }

  async function handleConfirm() {
    if (!staged || !parsed) return;
    setBusy(true);
    setStatus(t("applying"));
    try {
      const res = await fetch(
        `/api/admin/map-calibration/${calibrationId}/align/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pixelAffine: parsed.pixelAffine,
            stagedOriginalKey: staged.stagedOriginalKey,
            stagedDisplayKey: staged.stagedDisplayKey,
            newWidth: staged.newWidth,
            newHeight: staged.newHeight,
          }),
        }
      );
      if (!res.ok) throw new Error("apply");
      toast.success(t("applied"));
      setStaged(null);
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
    if (staged) await discardStaging();
    setOpen(false);
    reset();
  }

  const projectedAnchors: Anchor[] =
    staged && parsed
      ? anchors.map((a) => {
          const { u, v } = applyPixelAffine(
            parsed.pixelAffine,
            a.imageU,
            a.imageV
          );
          return { imageU: u, imageV: v, label: a.label };
        })
      : [];

  const lowConfidence =
    parsed != null &&
    ((parsed.residual != null && parsed.residual > LOW_CONFIDENCE_RESIDUAL) ||
      (parsed.inliers != null && parsed.inliers < LOW_CONFIDENCE_INLIERS));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && staged) void discardStaging();
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title", { mapName })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {!staged ? (
          <div className="space-y-4">
            <input
              type="file"
              name="newRender"
              accept="image/png,image/jpeg"
              aria-label={t("selectFile")}
              className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
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
            <div className="space-y-2">
              <p className="text-sm">{t("staged")}</p>
              <code className="bg-muted block rounded px-2 py-1 text-xs">
                {t("scriptHint")}
              </code>
              <label className="text-sm font-medium" htmlFor="transform-json">
                {t("transformLabel")}
              </label>
              <textarea
                id="transform-json"
                value={transformText}
                onChange={(e) => handleTransformChange(e.target.value)}
                placeholder={t("transformPlaceholder")}
                rows={5}
                className="border-input bg-background block w-full rounded border px-2 py-1 font-mono text-xs"
              />
              {parseError ? (
                <p className="text-sm text-red-500" role="alert">
                  {t("parseError")}
                </p>
              ) : null}
            </div>

            {parsed ? (
              <div className="space-y-4">
                {parsed.inliers != null && parsed.residual != null ? (
                  <p className="text-sm">
                    {t("alignSummary", {
                      inliers: parsed.inliers,
                      residual: parsed.residual.toFixed(1),
                    })}
                  </p>
                ) : null}
                {lowConfidence ? (
                  <p className="text-sm text-amber-500" role="alert">
                    {t("lowConfidence")}
                  </p>
                ) : null}
                {/* Cap the canvas height inside the dialog; the shared
                    MapCanvas hard-codes min-h-[500px], so override it here. */}
                <div className="h-[45vh] [&>*]:min-h-0!">
                  <MapCanvas
                    imageUrl={staged.stagedDisplayUrl}
                    imageWidth={staged.newWidth}
                    imageHeight={staged.newHeight}
                    anchors={projectedAnchors}
                    transform={null}
                    testPoints={[]}
                    onImageClick={() => undefined}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {t("compareTitle")}
                    </span>
                    <Button
                      type="button"
                      variant={compareMode === "blink" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCompareMode("blink")}
                    >
                      {t("compareBlink")}
                    </Button>
                    <Button
                      type="button"
                      variant={compareMode === "swipe" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCompareMode("swipe")}
                    >
                      {t("compareSwipe")}
                    </Button>
                    {compareMode === "blink" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOld((s) => !s)}
                      >
                        {showOld ? t("showingOld") : t("showingNew")}
                      </Button>
                    ) : null}
                  </div>
                  <div className="bg-muted relative h-[40vh] w-full overflow-hidden rounded border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={staged.stagedDisplayUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={staged.oldDisplayUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                      style={
                        compareMode === "swipe"
                          ? { clipPath: `inset(0 ${100 - swipe}% 0 0)` }
                          : { opacity: showOld ? 1 : 0 }
                      }
                    />
                  </div>
                  {compareMode === "swipe" ? (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={swipe}
                      onChange={(e) => setSwipe(Number(e.target.value))}
                      aria-label={t("compareSwipe")}
                      className="w-full"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void handleCancel()}
                disabled={busy}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => void handleConfirm()}
                disabled={busy || !parsed}
              >
                {busy ? status : t("confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
